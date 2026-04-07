/**
 * JSE Conflict Watch — Yahoo Finance Bulk Quote Proxy
 * Netlify Serverless Function — CommonJS — NO API KEY REQUIRED
 *
 * FIXES (v7 → v8, 2025-04):
 *  1. gzip decompression — was sending Accept-Encoding: gzip but never decompressing → JSON.parse failed silently
 *  2. Cookie + crumb handshake — Yahoo Finance now requires this for server-side requests from cloud IPs
 *  3. Switched to v8/finance/quote endpoint (v7 deprecated + now requires crumb)
 *  4. Module-level crumb cache — reused across warm Lambda invocations (crumbs last ~1 hr)
 */

const https = require('https');
const zlib  = require('zlib');

const CORS = {
  'Content-Type':                'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control':               'public, max-age=60, s-maxage=60',
};

/* ── Crumb cache (module-level — survives warm Lambda restarts) ──── */
let _crumbCache = null;   // { crumb: string, cookie: string, ts: number }
const CRUMB_TTL = 55 * 60 * 1000;  // 55 min (Yahoo crumbs last ~1 hr)

/* ── HTTP GET with automatic gzip/deflate/br decompression ────────── */
function get(url, reqHeaders, followRedirects) {
  if (followRedirects === undefined) followRedirects = 5;
  return new Promise((resolve, reject) => {
    const options = {
      headers: Object.assign({
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept':          'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        /* No Accept-Encoding here — we handle decompression explicitly below */
      }, reqHeaders || {}),
    };

    const req = https.get(url, options, function(res) {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && followRedirects > 0) {
        res.resume();
        return get(res.headers.location, reqHeaders, followRedirects - 1).then(resolve).catch(reject);
      }

      const enc = (res.headers['content-encoding'] || '').toLowerCase();
      let stream = res;
      if (enc === 'gzip')         stream = res.pipe(zlib.createGunzip());
      else if (enc === 'deflate') stream = res.pipe(zlib.createInflate());
      else if (enc === 'br')      stream = res.pipe(zlib.createBrotliDecompress());

      const chunks = [];
      stream.on('data', function(c) { chunks.push(c); });
      stream.on('end', function() {
        const body = Buffer.concat(chunks).toString('utf8');
        try   { resolve({ status: res.statusCode, headers: res.headers, json: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, headers: res.headers, json: null, raw: body.slice(0, 500) }); }
      });
      stream.on('error', reject);
    });

    req.setTimeout(12000, function() { req.destroy(new Error('Yahoo Finance request timed out after 12s')); });
    req.on('error', reject);
  });
}

/* ── Step 1: Fetch Yahoo Finance homepage cookies ────────────────── */
async function fetchCookies() {
  const res = await get('https://finance.yahoo.com/', {
    'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  });
  const raw = res.headers['set-cookie'] || [];
  if (!raw.length) throw new Error('Yahoo Finance: no Set-Cookie headers received');
  const cookie = raw.map(function(c) { return c.split(';')[0].trim(); }).filter(Boolean).join('; ');
  return cookie;
}

/* ── Step 2: Exchange cookies for a crumb ────────────────────────── */
async function fetchCrumb(cookie) {
  const res = await get(
    'https://query2.finance.yahoo.com/v1/test/getcrumb',
    { Cookie: cookie, Accept: 'text/plain, */*' }
  );
  if (res.status !== 200) throw new Error('getcrumb returned HTTP ' + res.status);
  /* Crumb endpoint returns plain text — res.json will be null, use res.raw */
  const crumb = (res.raw || (res.json != null ? String(res.json) : '')).trim();
  if (!crumb || crumb.length < 2) throw new Error('getcrumb returned empty or invalid crumb: ' + JSON.stringify(crumb));
  return crumb;
}

/* ── Get or refresh crumb (cached) ──────────────────────────────── */
async function getOrRefreshCrumb() {
  const now = Date.now();
  if (_crumbCache && (now - _crumbCache.ts) < CRUMB_TTL) {
    console.log('[quotes] Using cached crumb (age ' + Math.round((now - _crumbCache.ts) / 1000) + 's)');
    return _crumbCache;
  }
  console.log('[quotes] Fetching fresh cookie + crumb from Yahoo Finance…');
  const cookie = await fetchCookies();
  const crumb  = await fetchCrumb(cookie);
  _crumbCache  = { cookie: cookie, crumb: crumb, ts: now };
  console.log('[quotes] Crumb acquired: ' + crumb.slice(0, 10) + '… (cookie: ' + cookie.slice(0, 40) + '…)');
  return _crumbCache;
}

/* ── Normalise a Yahoo Finance quote object ──────────────────────── */
function normalise(q) {
  if (!q || q.regularMarketPrice == null) return null;
  return {
    symbol:      q.symbol,
    name:        q.shortName || q.longName || q.symbol,
    price:       q.regularMarketPrice,
    change:      q.regularMarketChange        != null ? q.regularMarketChange        : 0,
    changePct:   q.regularMarketChangePercent != null ? q.regularMarketChangePercent : 0,
    prevClose:   q.regularMarketPreviousClose != null ? q.regularMarketPreviousClose : q.regularMarketPrice,
    dayHigh:     q.regularMarketDayHigh       != null ? q.regularMarketDayHigh       : null,
    dayLow:      q.regularMarketDayLow        != null ? q.regularMarketDayLow        : null,
    volume:      q.regularMarketVolume        != null ? q.regularMarketVolume        : 0,
    currency:    q.currency                   != null ? q.currency                   : 'USD',
    marketState: q.marketState                != null ? q.marketState                : 'CLOSED',
    week52High:  q.fiftyTwoWeekHigh           != null ? q.fiftyTwoWeekHigh           : null,
    week52Low:   q.fiftyTwoWeekLow            != null ? q.fiftyTwoWeekLow            : null,
    timestamp:   new Date().toISOString(),
  };
}

const FIELDS = [
  'regularMarketPrice', 'regularMarketChange', 'regularMarketChangePercent',
  'regularMarketPreviousClose', 'regularMarketDayHigh', 'regularMarketDayLow',
  'regularMarketVolume', 'fiftyTwoWeekHigh', 'fiftyTwoWeekLow',
  'shortName', 'longName', 'currency', 'marketState',
].join(',');

const YF_HOSTS = [
  'query2.finance.yahoo.com',
  'query1.finance.yahoo.com',
];

/* ── Main Yahoo Finance fetch ─────────────────────────────────────── */
async function fetchYahoo(symbols) {
  let auth = { cookie: '', crumb: '' };
  try {
    auth = await getOrRefreshCrumb();
  } catch (e) {
    console.error('[quotes] Crumb acquisition failed: ' + e.message + ' — attempting without crumb');
  }

  const encodedSymbols = encodeURIComponent(symbols);
  const crumbParam     = auth.crumb ? ('&crumb=' + encodeURIComponent(auth.crumb)) : '';

  /* Try v8 (preferred, requires crumb) then v7 (legacy fallback) */
  const apiVersions = [
    '/v8/finance/quote?symbols=' + encodedSymbols + '&fields=' + FIELDS + '&lang=en-US&region=US&corsDomain=finance.yahoo.com' + crumbParam,
    '/v7/finance/quote?symbols=' + encodedSymbols + '&fields=' + FIELDS + '&lang=en-US&region=US&corsDomain=finance.yahoo.com' + crumbParam,
  ];

  for (const endpoint of apiVersions) {
    for (const host of YF_HOSTS) {
      try {
        const url = 'https://' + host + endpoint;
        console.log('[quotes] Trying ' + host + endpoint.slice(0, 70) + '…');

        const res = await get(url, {
          Cookie:  auth.cookie,
          Referer: 'https://finance.yahoo.com/',
          Origin:  'https://finance.yahoo.com',
        });

        if (res.status === 401) {
          console.warn('[quotes] ' + host + ' 401 Unauthorized — invalidating crumb cache');
          _crumbCache = null; // force re-fetch on next call
          continue;
        }
        if (res.status !== 200) {
          console.warn('[quotes] ' + host + ' returned HTTP ' + res.status + ' — ' + (res.raw || ''));
          continue;
        }
        if (!res.json) {
          console.warn('[quotes] ' + host + ' returned non-JSON after decompression: ' + (res.raw || '').slice(0, 200));
          continue;
        }

        const results = res.json && res.json.quoteResponse && res.json.quoteResponse.result;
        if (!Array.isArray(results)) {
          const yErr = res.json && res.json.quoteResponse && res.json.quoteResponse.error;
          console.warn('[quotes] ' + host + ' no results array — ' + (yErr ? yErr.description : JSON.stringify(res.json).slice(0, 150)));
          continue;
        }

        console.log('[quotes] ✓ ' + host + ' returned ' + results.length + ' results');
        return results;
      } catch (e) {
        console.warn('[quotes] ' + host + ' threw: ' + e.message);
      }
    }
  }

  return null; // all attempts failed
}

const setCors = function(res) {
  for (const [key, value] of Object.entries(CORS)) {
    res.setHeader(key, value);
  }
};

const ok  = function(res, body)   { setCors(res); return res.status(200).json(body); };
const err = function(res, msg, c) { setCors(res); return res.status(c || 502).json({ error: msg }); };

module.exports = async function(req, res) {
  if (req.method === 'OPTIONS') {
    setCors(res);
    return res.status(204).end();
  }

  const qs      = typeof req.query === 'object' ? req.query : {};
  const symbols = ((qs.symbols !== undefined ? String(qs.symbols) : Object.keys(qs)[0]) || '').trim();

  if (!symbols) return err(res, 'symbols query param required', 400);

  const symList = symbols.split(',').filter(Boolean);
  if (symList.length > 120) return err(res, 'Max 120 symbols per request', 400);

  try {
    const results = await fetchYahoo(symList.join(','));

    if (!results) {
      return err(res, 
        'Yahoo Finance unavailable on all endpoints. ' +
        'Check Vercel function logs. ' +
        'JSE may be closed, or Yahoo may be blocking this IP. Try again in 5 minutes.'
      );
    }

    const quotes = {};
    let resolved = 0, empty = 0;
    for (const q of results) {
      const n = normalise(q);
      if (n) { quotes[q.symbol] = n; resolved++; }
      else     empty++;
    }

    console.log('[quotes] ✓ ' + resolved + ' resolved, ' + empty + ' empty, ' + (symList.length - results.length) + ' not returned by Yahoo');

    return ok(res, {
      quotes:    quotes,
      requested: symList.length,
      returned:  resolved,
      empty:     empty,
      timestamp: new Date().toISOString(),
    });

  } catch (e) {
    console.error('[quotes] Unhandled error:', e.message, e.stack);
    return err(res, 'Server error: ' + e.message);
  }
};
