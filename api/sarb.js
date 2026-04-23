/**
 * JSE Conflict Watch — SA 10Y Bond Yield + 12M History Proxy
 * Vercel Serverless Function — CommonJS — NO API KEY REQUIRED
 *
 * v4 STRATEGY (2026-04 rewrite):
 *   1. Stooq CSV 10zay.b            — PRIMARY for both live + 12mo history
 *                                     (more reliable than Yahoo ^ZA10Y which
 *                                     often returns slightly stale figures).
 *   2. Yahoo ^ZA10Y chart endpoint  — FALLBACK live + history.
 *   3. FRED IRLTLT01ZAM156N          — monthly fallback (live only).
 *   4. Static                        — last-resort so chart renders.
 *
 * Response shape:
 *   {
 *     bond:    { price, change, changePct, prevClose, source, date, … },
 *     history: [ { month:'Apr 25', yield:10.95 }, … ]  // 12 monthly closes
 *     source:  'Stooq' | 'Yahoo' | 'FRED' | 'STATIC'
 *   }
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
        'User-Agent':      UA,
        'Accept':          'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br',
      }, opts.headers || {}),
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

/* ── Helper: label a date as "MMM YY" for the historical chart ──── */
function monthLabel(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
}

/* ── Helper: reduce daily rows to one (last) row per month ──────── */
function monthlyFromDaily(rows) {
  // rows = [{ date:'YYYY-MM-DD', close: Number }, …] ascending
  const byMonth = new Map();
  for (const r of rows) {
    const key = r.date.slice(0, 7); // YYYY-MM
    byMonth.set(key, r);            // last one wins = month-end
  }
  const out = [];
  for (const [, r] of byMonth) {
    out.push({ month: monthLabel(r.date), yield: +r.close.toFixed(3), date: r.date });
  }
  return out.slice(-13); // keep last 13 months so chart shows 12 full transitions
}

/* ─── Source 1: Stooq CSV 10zay.b (primary — daily history) ──────── */
async function fromStooq() {
  try {
    const url = 'https://stooq.com/q/d/l/?s=10zay.b&i=d';
    const r = await get(url, { headers: { Accept: 'text/csv, text/plain, */*' } });
    if (r.status !== 200 || !r.raw) return null;

    const lines = r.raw.trim().split(/\r?\n/);
    if (lines.length < 3) return null;

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length < 5) continue;
      const close = parseFloat(parts[4]);
      if (!isNaN(close) && parts[0]) rows.push({ date: parts[0], close });
    }
    if (rows.length < 2) return null;

    const latest    = rows[rows.length - 1];
    const prev      = rows[rows.length - 2];
    const price     = latest.close;
    const prevClose = prev.close;
    const change    = +(price - prevClose).toFixed(4);
    const changePct = prevClose !== 0 ? +(((price - prevClose) / prevClose) * 100).toFixed(4) : 0;

    const history = monthlyFromDaily(rows);

    return {
      bond: {
        symbol:    '10ZAY.B',
        name:      'SA 10Y Government Bond Yield',
        price,
        change,
        changePct,
        prevClose,
        date:      latest.date,
        source:    'Stooq',
        unit:      '%',
        currency:  'ZAR',
        timestamp: new Date().toISOString(),
      },
      history,
    };
  } catch (e) { return null; }
}

/* ─── Source 2: Yahoo ^ZA10Y chart endpoint (fallback) ──────────── */
async function fromYahooChart() {
  const hosts = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
  for (const host of hosts) {
    try {
      // range=1y gives us daily bars we can collapse to 12 monthly points.
      const url = `https://${host}/v8/finance/chart/%5EZA10Y?interval=1d&range=1y`;
      const r = await get(url, {
        headers: {
          Referer: 'https://finance.yahoo.com/',
          Origin:  'https://finance.yahoo.com',
        },
      });
      if (r.status !== 200 || !r.json) continue;
      const result = r.json.chart && r.json.chart.result && r.json.chart.result[0];
      if (!result || !result.meta) continue;

      const meta      = result.meta;
      const price     = meta.regularMarketPrice;
      const prevClose = meta.chartPreviousClose != null ? meta.chartPreviousClose : meta.previousClose;
      if (price == null || prevClose == null) continue;

      const change    = +(price - prevClose).toFixed(4);
      const changePct = prevClose !== 0 ? +(((price - prevClose) / prevClose) * 100).toFixed(4) : 0;

      // Build daily rows from timestamps + closes for the monthly rollup
      const timestamps = result.timestamp || [];
      const closes = result.indicators && result.indicators.quote && result.indicators.quote[0] &&
                     result.indicators.quote[0].close ? result.indicators.quote[0].close : [];
      const rows = [];
      for (let i = 0; i < timestamps.length; i++) {
        const c = closes[i];
        if (c == null || !timestamps[i]) continue;
        const d = new Date(timestamps[i] * 1000).toISOString().slice(0, 10);
        rows.push({ date: d, close: c });
      }
      const history = rows.length >= 2 ? monthlyFromDaily(rows) : [];

      return {
        bond: {
          symbol:    '^ZA10Y',
          name:      'SA 10Y Government Bond Yield',
          price,
          change,
          changePct,
          prevClose,
          date:      new Date((meta.regularMarketTime || Date.now() / 1000) * 1000).toISOString().slice(0, 10),
          source:    'Yahoo',
          unit:      '%',
          currency:  'ZAR',
          timestamp: new Date().toISOString(),
        },
        history,
      };
    } catch (e) { /* try next host */ }
  }
  return null;
}

/* ─── Source 3: FRED IRLTLT01ZAM156N (monthly, last resort for live) ─ */
async function fromFred() {
  const key = process.env.FRED_API_KEY || '';
  const keyParam = key ? `&api_key=${key}` : '';
  try {
    const url = 'https://api.stlouisfed.org/fred/series/observations' +
                '?series_id=IRLTLT01ZAM156N' + keyParam +
                '&sort_order=desc&limit=14&file_type=json';
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

    // FRED already gives us monthly data — straight map, oldest first
    const history = sorted
      .slice(0, 13)
      .reverse()
      .map(o => ({ month: monthLabel(o.date), yield: +parseFloat(o.value).toFixed(3), date: o.date }));

    return {
      bond: {
        symbol:    'IRLTLT01ZAM156N',
        name:      'SA Long-Term Govt Bond Rate (FRED, monthly)',
        price,
        change,
        changePct,
        prevClose,
        date:      latest.date,
        source:    'FRED',
        unit:      '%',
        currency:  'ZAR',
        isProxy:   true,
        timestamp: new Date().toISOString(),
      },
      history,
    };
  } catch (e) { return null; }
}

/* ─── Handler ────────────────────────────────────────────────────── */
module.exports = async function(req, res) {
  if (req.method === 'OPTIONS') { setCors(res); return res.status(204).end(); }

  /* 1. Stooq — primary (provides BOTH live and 12M history in one call) */
  const stooq = await fromStooq();
  if (stooq) {
    console.log(`[sarb] ✓ Stooq 10zay.b → ${stooq.bond.price}% (${stooq.bond.date}) · ${stooq.history.length} history points`);
    return ok(res, { bond: stooq.bond, history: stooq.history, source: 'Stooq' });
  }
  console.warn('[sarb] Stooq failed, trying Yahoo ^ZA10Y…');

  /* 2. Yahoo chart endpoint (fallback — also gives history) */
  const yahoo = await fromYahooChart();
  if (yahoo) {
    console.log(`[sarb] ✓ Yahoo ^ZA10Y → ${yahoo.bond.price}% (${yahoo.bond.date}) · ${yahoo.history.length} history points`);
    return ok(res, { bond: yahoo.bond, history: yahoo.history, source: 'Yahoo' });
  }
  console.warn('[sarb] Yahoo failed, trying FRED…');

  /* 3. FRED (monthly, lower freshness) */
  const fred = await fromFred();
  if (fred) {
    console.log(`[sarb] ✓ FRED → ${fred.bond.price}% (${fred.bond.date})`);
    return ok(res, {
      bond: fred.bond,
      history: fred.history,
      source: 'FRED',
      warning: 'Live daily sources unreachable — using FRED monthly proxy.',
    });
  }
  console.warn('[sarb] All sources failed — returning static fallback');

  /* 4. Static fallback — dashboard must render something */
  return ok(res, {
    bond: {
      symbol:    'FALLBACK',
      name:      'SA 10Y Bond Yield (static — live fetch failed)',
      price:     8.5,
      change:    0,
      changePct: 0,
      prevClose: 8.5,
      date:      new Date().toISOString().slice(0, 10),
      source:    'STATIC',
      unit:      '%',
      currency:  'ZAR',
      isStale:   true,
      timestamp: new Date().toISOString(),
    },
    history: [],
    source:  'STATIC',
    warning: 'Could not reach Stooq, Yahoo or FRED. Showing approximate static value. Check Vercel function logs.',
  });
};
