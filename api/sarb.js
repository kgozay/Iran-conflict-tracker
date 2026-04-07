/**
 * JSE Conflict Watch — SARB R2035 Bond Yield Proxy
 * Netlify Serverless Function — CommonJS — NO API KEY REQUIRED
 *
 * FIXES (2025-04):
 *  1. Added rejectUnauthorized: false for SARB (resbank.co.za has intermittent SSL chain issues from non-SA IPs)
 *  2. Added gzip decompression (same fix as quotes.js)
 *  3. Added FRED as a reliable secondary source (no key needed for basic access)
 *  4. Better error messages in logs
 *
 * Primary:  SARB REST API — custom.resbank.co.za/SarbWebApi/WebIndicators/
 *           Tries R2035 → MMRBGB10Y → MMRBGBR2030 in order
 * Fallback: FRED API (set FRED_API_KEY env var in Netlify for reliability)
 */

const https = require('https');
const zlib  = require('zlib');

const CORS = {
  'Content-Type':                'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control':               'public, max-age=300, s-maxage=300',
};

/* ── HTTP GET with gzip support and optional SSL relaxation ───────── */
function get(url, opts) {
  opts = opts || {};
  return new Promise(function(resolve, reject) {
    const options = {
      headers: Object.assign({
        'User-Agent': 'Mozilla/5.0 (compatible; JSE-ConflictWatch/4.0)',
        'Accept':     'application/json, text/plain, */*',
      }, opts.headers || {}),
      rejectUnauthorized: opts.rejectUnauthorized !== false, // default true
    };

    const req = https.get(url, options, function(res) {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return get(res.headers.location, opts).then(resolve).catch(reject);
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
        try   { resolve({ status: res.statusCode, json: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, json: null, raw: body.slice(0, 300) }); }
      });
      stream.on('error', reject);
    });

    req.setTimeout(10000, function() { req.destroy(new Error('SARB/FRED request timed out')); });
    req.on('error', reject);
  });
}

const setCors = function(res) {
  for (const [key, value] of Object.entries(CORS)) {
    res.setHeader(key, value);
  }
};

const ok  = function(res, body)   { setCors(res); return res.status(200).json(body); };
const err = function(res, msg, c) { setCors(res); return res.status(c || 502).json({ error: msg }); };

/* ── Parse SARB WebIndicators JSON ───────────────────────────────── */
function parseSARB(json, series) {
  if (!json || !Array.isArray(json.data) || json.data.length === 0) {
    throw new Error('SARB ' + series + ': empty or invalid data');
  }
  const rows = json.data
    .filter(function(d) { return d.Value !== null && d.Value !== '' && d.Value !== undefined; })
    .sort(function(a, b) { return new Date(b.Date) - new Date(a.Date); });

  if (!rows.length) throw new Error('SARB ' + series + ': all values are null');

  const latest    = rows[0];
  const prev      = rows[1] || rows[0];
  const price     = parseFloat(latest.Value);
  const prevClose = parseFloat(prev.Value);
  const change    = parseFloat((price - prevClose).toFixed(4));
  const changePct = prevClose !== 0 ? parseFloat(((change / prevClose) * 100).toFixed(4)) : 0;

  return {
    symbol:    series,
    name:      json.Description || (series + ' Bond Yield'),
    price:     price,
    change:    change,
    changePct: changePct,
    prevClose: prevClose,
    date:      latest.Date,
    frequency: json.Frequency || 'Daily',
    source:    'SARB',
    unit:      '%',
    currency:  'ZAR',
    timestamp: new Date().toISOString(),
  };
}

/* ── Parse FRED observations ─────────────────────────────────────── */
function parseFRED(json) {
  const obs = ((json && json.observations) || []).filter(function(o) { return o.value !== '.' && o.value; });
  if (!obs.length) throw new Error('FRED: no valid observations in response');
  const sorted    = obs.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
  const latest    = sorted[0];
  const prev      = sorted[1] || sorted[0];
  const price     = parseFloat(latest.value);
  const prevClose = parseFloat(prev.value);
  const change    = parseFloat((price - prevClose).toFixed(4));
  const changePct = prevClose !== 0 ? parseFloat(((change / prevClose) * 100).toFixed(4)) : 0;

  return {
    symbol:    'IRLTLT01ZAM156N',
    name:      'SA Long-Term Government Bond Rate (FRED)',
    price:     price,
    change:    change,
    changePct: changePct,
    prevClose: prevClose,
    date:      latest.date,
    source:    'FRED',
    unit:      '%',
    currency:  'ZAR',
    isProxy:   true,
    timestamp: new Date().toISOString(),
  };
}

module.exports = async function(req, res) {
  if (req.method === 'OPTIONS') {
    setCors(res);
    return res.status(204).end();
  }

  /* ── SARB REST API — try multiple series ─────────────────────── */
  const SARB_SERIES = ['MMRBGBR2035', 'MMRBGB10Y', 'MMRBGBR2030'];

  for (const series of SARB_SERIES) {
    try {
      const url = 'https://custom.resbank.co.za/SarbWebApi/WebIndicators/' + series + '/';
      console.log('[sarb] Trying SARB series:', series);

      /* Try with normal SSL first */
      let resHttp;
      try {
        resHttp = await get(url);
      } catch (sslErr) {
        /* If SSL fails (chain issue from non-SA IP), retry with relaxed SSL */
        console.warn('[sarb] SSL error for ' + series + ', retrying with rejectUnauthorized=false: ' + sslErr.message);
        resHttp = await get(url, { rejectUnauthorized: false });
      }

      if (resHttp.status === 200 && resHttp.json) {
        const bond = parseSARB(resHttp.json, series);
        console.log('[sarb] ✓ ' + series + ' → ' + bond.price + '% (' + bond.date + ')');
        return ok(res, { bond: bond, series: series });
      }
      console.warn('[sarb] ' + series + ' → HTTP ' + resHttp.status + (resHttp.raw ? ' — ' + resHttp.raw.slice(0, 100) : ''));
    } catch (e) {
      console.warn('[sarb] ' + series + ' → ' + e.message);
    }
  }

  /* ── FRED fallback ───────────────────────────────────────────── */
  const FRED_KEY = process.env.FRED_API_KEY || '';
  const keyParam = FRED_KEY ? ('&api_key=' + FRED_KEY) : '';

  try {
    const fredUrl = 'https://api.stlouisfed.org/fred/series/observations' +
      '?series_id=IRLTLT01ZAM156N' + keyParam +
      '&sort_order=desc&limit=5&file_type=json';
    console.log('[sarb] Trying FRED fallback (key:', FRED_KEY ? 'present' : 'absent', ')');
    const resHttp = await get(fredUrl);
    if (resHttp.status === 200 && resHttp.json) {
      const bond = parseFRED(resHttp.json);
      console.log('[sarb] ✓ FRED → ' + bond.price + '% (' + bond.date + ')');
      return ok(res, {
        bond:    bond,
        series:  'FRED_FALLBACK',
        warning: 'SARB API unreachable — using FRED proxy (monthly). Set FRED_API_KEY env var in Vercel for higher rate limits.',
      });
    }
    console.warn('[sarb] FRED → HTTP ' + resHttp.status + (resHttp.raw ? ' — ' + resHttp.raw.slice(0, 100) : ''));
  } catch (e) {
    console.warn('[sarb] FRED → ' + e.message);
  }

  /* ── Hard fallback: return a reasonable static estimate ─────── */
  /* R2035 yield has been roughly in the 11-12% range in 2025 */
  /* This allows the dashboard to show something rather than failing completely */
  console.warn('[sarb] All sources failed — returning static fallback yield');
  return ok(res, {
    bond: {
      symbol:    'MMRBGBR2035',
      name:      'R2035 Bond Yield (static fallback — live fetch failed)',
      price:     11.5,
      change:    0,
      changePct: 0,
      prevClose: 11.5,
      date:      new Date().toISOString().slice(0, 10),
      source:    'STATIC_FALLBACK',
      unit:      '%',
      currency:  'ZAR',
      isStale:   true,
      timestamp: new Date().toISOString(),
    },
    series:  'STATIC_FALLBACK',
    warning: 'Could not reach SARB or FRED. Showing approximate static value. Check Vercel logs.',
  });
};
