/**
 * JSE Conflict Watch — Historical Change Proxy
 * Vercel Serverless Function — CommonJS — NO API KEY REQUIRED
 *
 * Returns { symbol: { changePct1D, changePct5D, changePct20D, prevClose, price } }
 * for every symbol requested, using Yahoo's /v8/finance/chart endpoint with
 * range=1mo&interval=1d. One HTTP call per symbol, executed in parallel with
 * bounded concurrency. This is what powers the 1D / 5D / 20D toggle in the
 * TopBar — without it those buttons do nothing visible.
 */

const https = require('https');
const zlib  = require('zlib');

const CORS = {
  'Content-Type':                'application/json',
  'Access-Control-Allow-Origin': '*',
  // 5-min cache is fine — historical windows move slowly during a session.
  'Cache-Control':               'public, max-age=300, s-maxage=300',
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/* ── HTTP GET with gzip/deflate/br decompression + redirect following ── */
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
      if (enc === 'gzip')         stream = res.pipe(zlib.createGunzip());
      else if (enc === 'deflate') stream = res.pipe(zlib.createInflate());
      else if (enc === 'br')      stream = res.pipe(zlib.createBrotliDecompress());

      const chunks = [];
      stream.on('data', function(c) { chunks.push(c); });
      stream.on('end', function() {
        const body = Buffer.concat(chunks).toString('utf8');
        try   { resolve({ status: res.statusCode, json: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, json: null }); }
      });
      stream.on('error', reject);
    });

    req.setTimeout(10000, function() { req.destroy(new Error('History request timed out')); });
    req.on('error', reject);
  });
}

const HOSTS = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];

/* ── Fetch a single symbol's last ~22 daily closes ─────────────────── */
async function fetchHistoryOne(symbol) {
  const encoded = encodeURIComponent(symbol);

  for (const host of HOSTS) {
    try {
      const url = `https://${host}/v8/finance/chart/${encoded}?interval=1d&range=1mo`;
      const res = await get(url);
      if (res.status !== 200 || !res.json) continue;

      const result = res.json.chart && res.json.chart.result && res.json.chart.result[0];
      if (!result) continue;

      const meta = result.meta || {};
      const ind  = result.indicators && result.indicators.quote && result.indicators.quote[0];
      const closesRaw = (ind && ind.close) ? ind.close : [];

      // Strip nulls (exchange holidays, missing bars)
      const closes = closesRaw.filter(v => v != null);
      if (closes.length < 2) continue;

      const price     = meta.regularMarketPrice ?? closes[closes.length - 1];
      const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? closes[closes.length - 2];

      // Offsets from the LATEST close — "n sessions ago"
      const n = closes.length;
      const close1D  = n >= 2  ? closes[n - 2]  : null;
      const close5D  = n >= 6  ? closes[n - 6]  : null;  // 5 trading days ago
      const close20D = n >= 21 ? closes[n - 21] : null;  // ~1 month back

      const pct = (start, end) =>
        (start != null && end != null && start !== 0)
          ? +(((end - start) / start) * 100).toFixed(4)
          : null;

      return {
        symbol,
        price,
        prevClose,
        changePct1D:  pct(close1D,  price),
        changePct5D:  pct(close5D,  price),
        changePct20D: pct(close20D, price),
        barsAvailable: n,
      };
    } catch (e) { /* try next host */ }
  }
  return null;
}

/* ── Bounded-concurrency pool ──────────────────────────────────────── */
async function fetchAll(symbols, concurrency) {
  concurrency = concurrency || 8;
  const results = {};
  let idx = 0;

  async function worker() {
    while (idx < symbols.length) {
      const mine = idx++;
      const sym  = symbols[mine];
      try {
        const r = await fetchHistoryOne(sym);
        if (r) results[sym] = r;
      } catch (e) {
        console.error('[history] Error for', sym, e.message);
      }
    }
  }

  const pool = [];
  for (let i = 0; i < Math.min(concurrency, symbols.length); i++) pool.push(worker());
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
  const symbols = ((qs.symbols !== undefined ? String(qs.symbols) : '') || '').trim();
  if (!symbols) return err(res, 'symbols query param required', 400);

  const symList = symbols.split(',').map(s => s.trim()).filter(Boolean).slice(0, 60);
  if (!symList.length) return err(res, 'No valid symbols', 400);

  try {
    console.log(`[history] Fetching ${symList.length} symbols (range=1mo)…`);
    const history  = await fetchAll(symList, 10);
    const resolved = Object.keys(history).length;
    console.log(`[history] ✓ Resolved ${resolved}/${symList.length}`);

    return ok(res, {
      history,
      resolved,
      requested: symList.length,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[history] Unhandled error:', e.message);
    return err(res, 'Server error: ' + e.message);
  }
};
