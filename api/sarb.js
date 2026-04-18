/**
 * JSE Conflict Watch — SA 10Y Bond Yield Proxy
 * Vercel Serverless Function — CommonJS — NO API KEY REQUIRED
 *
 * v3 STRATEGY (2026-04 rewrite):
 *   1. Yahoo Finance chart endpoint ^ZA10Y (primary — no crumb needed, reliable)
 *   2. Stooq CSV  10zay.b           (fallback — free, no auth, SA yield curve)
 *   3. FRED     IRLTLT01ZAM156N     (fallback — SA long-term govt rate, monthly)
 *   4. Static 11.5%                 (last-resort so the dashboard never renders blank)
 *
 *   SARB's custom.resbank.co.za endpoint was removed from primary path — it has
 *   intermittent SSL chain + IP blocklist issues from Vercel edge IPs.
 */

const https = require('https');
const zlib  = require('zlib');

const CORS = {
  'Content-Type':                'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control':               'public, max-age=300, s-maxage=300',
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36';

function get(url, opts) {
  opts = opts || {};
  return new Promise(function(resolve, reject) {
    const options = {
      headers: Object.assign({
        'User-Agent': UA,
        'Accept':     'application/json, text/plain, */*',
      }, opts.headers || {}),
      rejectUnauthorized: opts.rejectUnauthorized !== false,
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
        try   { resolve({ status: res.statusCode, json: JSON.parse(body), raw: body }); }
        catch { resolve({ status: res.statusCode, json: null, raw: body }); }
      });
      stream.on('error', reject);
    });

    req.setTimeout(10000, function() { req.destroy(new Error('Bond yield request timed out')); });
    req.on('error', reject);
  });
}

const setCors = function(res) {
  for (const [key, value] of Object.entries(CORS)) res.setHeader(key, value);
};
const ok  = function(res, body)   { setCors(res); return res.status(200).json(body); };
const err = function(res, msg, c) { setCors(res); return res.status(c || 502).json({ error: msg }); };

/* ─── Source 1: Yahoo chart endpoint for ^ZA10Y ──────────────────── */
async function fromYahooChart() {
  const hosts = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
  for (const host of hosts) {
    try {
      const url = `https://${host}/v8/finance/chart/%5EZA10Y?interval=1d&range=5d`;
      const r = await get(url, {
        headers: {
          Referer: 'https://finance.yahoo.com/',
          Origin:  'https://finance.yahoo.com',
        },
      });
      if (r.status !== 200 || !r.json) continue;
      const result = r.json.chart && r.json.chart.result && r.json.chart.result[0];
      if (!result || !result.meta) continue;

      const m = result.meta;
      const price     = m.regularMarketPrice;
      const prevClose = m.chartPreviousClose != null ? m.chartPreviousClose : m.previousClose;
      if (price == null || prevClose == null) continue;

      const change    = +(price - prevClose).toFixed(4);
      const changePct = prevClose !== 0 ? +(((price - prevClose) / prevClose) * 100).toFixed(4) : 0;

      return {
        symbol:    '^ZA10Y',
        name:      'SA 10Y Government Bond Yield',
        price:     price,
        change:    change,
        changePct: changePct,
        prevClose: prevClose,
        date:      new Date((m.regularMarketTime || Date.now() / 1000) * 1000).toISOString().slice(0, 10),
        source:    'Yahoo',
        unit:      '%',
        currency:  'ZAR',
        timestamp: new Date().toISOString(),
      };
    } catch (e) { /* try next host */ }
  }
  return null;
}

/* ─── Source 2: Stooq CSV 10zay.b ────────────────────────────────── */
/* Stooq returns CSV: Date,Open,High,Low,Close,Volume
 * We take the last two non-empty rows for price + prev close. */
async function fromStooq() {
  try {
    const url = 'https://stooq.com/q/d/l/?s=10zay.b&i=d';
    const r = await get(url, { headers: { Accept: 'text/csv, text/plain, */*' } });
    if (r.status !== 200 || !r.raw) return null;

    const lines = r.raw.trim().split(/\r?\n/);
    if (lines.length < 3) return null;  // need header + 2 data rows

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length < 5) continue;
      const close = parseFloat(parts[4]);
      if (!isNaN(close)) rows.push({ date: parts[0], close });
    }
    if (rows.length < 2) return null;

    const latest    = rows[rows.length - 1];
    const prev      = rows[rows.length - 2];
    const price     = latest.close;
    const prevClose = prev.close;
    const change    = +(price - prevClose).toFixed(4);
    const changePct = prevClose !== 0 ? +(((price - prevClose) / prevClose) * 100).toFixed(4) : 0;

    return {
      symbol:    '10ZAY.B',
      name:      'SA 10Y Government Bond Yield (Stooq)',
      price:     price,
      change:    change,
      changePct: changePct,
      prevClose: prevClose,
      date:      latest.date,
      source:    'Stooq',
      unit:      '%',
      currency:  'ZAR',
      timestamp: new Date().toISOString(),
    };
  } catch (e) { return null; }
}

/* ─── Source 3: FRED IRLTLT01ZAM156N (monthly) ───────────────────── */
async function fromFred() {
  const key = process.env.FRED_API_KEY || '';
  const keyParam = key ? `&api_key=${key}` : '';
  try {
    const url = 'https://api.stlouisfed.org/fred/series/observations' +
                '?series_id=IRLTLT01ZAM156N' + keyParam +
                '&sort_order=desc&limit=5&file_type=json';
    const r = await get(url);
    if (r.status !== 200 || !r.json) return null;

    const obs = (r.json.observations || []).filter(o => o.value !== '.' && o.value);
    if (obs.length < 2) return null;

    const sorted    = obs.sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest    = sorted[0];
    const prev      = sorted[1];
    const price     = parseFloat(latest.value);
    const prevClose = parseFloat(prev.value);
    const change    = +(price - prevClose).toFixed(4);
    const changePct = prevClose !== 0 ? +(((price - prevClose) / prevClose) * 100).toFixed(4) : 0;

    return {
      symbol:    'IRLTLT01ZAM156N',
      name:      'SA Long-Term Govt Bond Rate (FRED, monthly)',
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
  } catch (e) { return null; }
}

/* ─── Handler ────────────────────────────────────────────────────── */
module.exports = async function(req, res) {
  if (req.method === 'OPTIONS') { setCors(res); return res.status(204).end(); }

  /* 1. Yahoo chart endpoint (primary) */
  const yahoo = await fromYahooChart();
  if (yahoo) {
    console.log(`[sarb] ✓ Yahoo ^ZA10Y → ${yahoo.price}% (${yahoo.date})`);
    return ok(res, { bond: yahoo, source: 'Yahoo' });
  }
  console.warn('[sarb] Yahoo ^ZA10Y failed, trying Stooq…');

  /* 2. Stooq (fallback) */
  const stooq = await fromStooq();
  if (stooq) {
    console.log(`[sarb] ✓ Stooq 10zay.b → ${stooq.price}% (${stooq.date})`);
    return ok(res, { bond: stooq, source: 'Stooq' });
  }
  console.warn('[sarb] Stooq failed, trying FRED…');

  /* 3. FRED (fallback — monthly, lower freshness) */
  const fred = await fromFred();
  if (fred) {
    console.log(`[sarb] ✓ FRED → ${fred.price}% (${fred.date})`);
    return ok(res, {
      bond:    fred,
      source:  'FRED',
      warning: 'Live sources unreachable — using FRED monthly proxy.',
    });
  }
  console.warn('[sarb] All sources failed — returning static fallback');

  /* 4. Static fallback — dashboard must render something */
  return ok(res, {
    bond: {
      symbol:    '^ZA10Y',
      name:      'SA 10Y Bond Yield (static fallback — live fetch failed)',
      price:     11.5,
      change:    0,
      changePct: 0,
      prevClose: 11.5,
      date:      new Date().toISOString().slice(0, 10),
      source:    'STATIC',
      unit:      '%',
      currency:  'ZAR',
      isStale:   true,
      timestamp: new Date().toISOString(),
    },
    source:  'STATIC',
    warning: 'Could not reach Yahoo, Stooq or FRED. Showing approximate static value. Check Vercel function logs.',
  });
};
