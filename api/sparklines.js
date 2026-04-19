/**
 * JSE Conflict Watch — Intraday Sparkline Data
 * Vercel Serverless Function — CommonJS
 *
 * Fetches 1-day, 5-minute interval chart data from Yahoo Finance
 * for the macro KPI symbols. Returns arrays of close prices for rendering
 * sparklines on the KPI tiles.
 *
 * GET /api/sparklines?symbols=BZ%3DF%2CGC%3DF%2C...
 * Cache-Control: 5 minutes
 */

const https = require('https');
const zlib  = require('zlib');

const CORS = {
  'Content-Type':                'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control':               'public, max-age=300, s-maxage=300',
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/* ── HTTP GET with auto decompression + redirect following ────────── */
function get(url, reqHeaders, hops) {
  hops = hops == null ? 5 : hops;
  return new Promise(function(resolve, reject) {
    const options = {
      headers: Object.assign({
        'User-Agent':      UA,
        'Accept':          'application/json, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer':         'https://finance.yahoo.com/',
        'Origin':          'https://finance.yahoo.com',
      }, reqHeaders || {}),
    };

    const req = https.get(url, options, function(res) {
      if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location && hops > 0) {
        res.resume();
        return get(res.headers.location, reqHeaders, hops - 1).then(resolve).catch(reject);
      }

      const enc = (res.headers['content-encoding'] || '').toLowerCase();
      let stream = res;
      if (enc === 'gzip')    stream = res.pipe(zlib.createGunzip());
      else if (enc === 'deflate') stream = res.pipe(zlib.createInflate());
      else if (enc === 'br') stream = res.pipe(zlib.createBrotliDecompress());

      const chunks = [];
      stream.on('data', function(c) { chunks.push(c); });
      stream.on('end', function() {
        const body = Buffer.concat(chunks).toString('utf8');
        try   { resolve({ status: res.statusCode, json: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, json: null }); }
      });
      stream.on('error', reject);
    });

    req.setTimeout(12000, function() { req.destroy(new Error('Sparkline request timed out')); });
    req.on('error', reject);
  });
}

/* ── Fetch one symbol's intraday data ────────────────────────────── */
const HOSTS = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];

async function fetchSparklineOne(symbol) {
  const encoded = encodeURIComponent(symbol);

  for (const host of HOSTS) {
    try {
      // interval=5m range=1d gives ~78 data points for a full trading day
      const url = `https://${host}/v8/finance/chart/${encoded}?interval=5m&range=1d`;
      const res = await get(url);

      if (res.status !== 200 || !res.json) continue;

      const result = res.json.chart && res.json.chart.result && res.json.chart.result[0];
      if (!result) continue;

      const ind    = result.indicators && result.indicators.quote && result.indicators.quote[0];
      const closes = (ind && ind.close) ? ind.close : [];
      const timestamps = result.timestamp || [];

      // Filter out null values, keep paired timestamp + close
      const pairs = [];
      for (let i = 0; i < closes.length; i++) {
        if (closes[i] != null && timestamps[i] != null) {
          pairs.push({ t: timestamps[i], v: +closes[i].toFixed(4) });
        }
      }

      if (pairs.length < 3) continue;

      const values = pairs.map(function(p) { return p.v; });

      // Also capture the meta for open/prevClose to show true day move
      const meta = result.meta || {};
      const prevClose = meta.chartPreviousClose || meta.previousClose || values[0];

      return {
        symbol:    symbol,
        points:    values,
        prevClose: prevClose,
        open:      meta.regularMarketOpen || values[0],
        current:   meta.regularMarketPrice || values[values.length - 1],
        count:     values.length,
      };
    } catch (e) {
      // try next host
    }
  }

  return null;
}

/* ── Bounded concurrency pool ─────────────────────────────────────── */
async function fetchAll(symbols) {
  const results = {};
  let idx = 0;

  async function worker() {
    while (idx < symbols.length) {
      const mine = idx++;
      const sym  = symbols[mine];
      try {
        const r = await fetchSparklineOne(sym);
        if (r) results[sym] = r;
      } catch (e) {
        console.error('[sparklines] Error for', sym, e.message);
      }
    }
  }

  const pool = [];
  const CONCURRENCY = Math.min(6, symbols.length);
  for (let i = 0; i < CONCURRENCY; i++) pool.push(worker());
  await Promise.all(pool);
  return results;
}

/* ── Handler ──────────────────────────────────────────────────────── */
const setCors = function(res) {
  for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);
};
const ok  = function(res, body)   { setCors(res); return res.status(200).json(body); };
const err = function(res, msg, c) { setCors(res); return res.status(c || 500).json({ error: msg }); };

module.exports = async function(req, res) {
  if (req.method === 'OPTIONS') { setCors(res); return res.status(204).end(); }

  const qs      = typeof req.query === 'object' ? req.query : {};
  const symbols = (qs.symbols || '').trim();
  if (!symbols) return err(res, 'symbols query param required', 400);

  const symList = symbols.split(',').map(function(s) { return s.trim(); }).filter(Boolean).slice(0, 15);
  if (!symList.length) return err(res, 'No valid symbols', 400);

  try {
    console.log('[sparklines] Fetching intraday data for', symList.length, 'symbols…');
    const sparklines = await fetchAll(symList);
    const resolved   = Object.keys(sparklines).length;
    console.log('[sparklines] ✓ Resolved', resolved, '/', symList.length);

    return ok(res, {
      sparklines: sparklines,
      resolved:   resolved,
      requested:  symList.length,
      timestamp:  new Date().toISOString(),
    });
  } catch (e) {
    console.error('[sparklines] Unhandled error:', e.message);
    return err(res, 'Server error: ' + e.message);
  }
};
