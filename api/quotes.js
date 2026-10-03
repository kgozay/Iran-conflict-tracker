/**
 * JSE Conflict Watch — Yahoo Finance Bulk Quote Proxy
 * Vercel Serverless Function — CommonJS — NO API KEY REQUIRED
 *
 * v9 STRATEGY (2026-04 rewrite):
 *   Primary: /v8/finance/chart/{symbol}?interval=1d&range=5d — per symbol, in parallel.
 *            Does NOT require cookie+crumb, reliable from Vercel edge IPs,
 *            works for equities, commodities, FX, and the ^TNX US 10Y yield index.
 *   Fallback: /v7/finance/quote bulk (requires crumb) — tried FIRST as a fast path,
 *             chart endpoint tops up anything missing. Kept because when bulk works
 *             it costs 1 HTTP call instead of 40.
 *
 *   All requests use gzip decompression + redirect following.
 */

const { get, getOrRefreshCrumb, invalidateCrumb, authHeaders, mapWithConcurrency } = require('./_lib/yahoo.js');

const CORS = {
  'Content-Type':                'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control':               'public, max-age=60, s-maxage=60',
};

/* ─────────────────────────────────────────────────────────────────────
 * CHART ENDPOINT — primary path (no crumb required)
 * Returns the same data shape as the quote endpoint by reading chart.result[0].meta.
 * ────────────────────────────────────────────────────────────────────── */
const YF_CHART_HOSTS = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];

async function fetchChartOne(symbol) {
  const encoded = encodeURIComponent(symbol);
  for (const host of YF_CHART_HOSTS) {
    try {
      const url = `https://${host}/v8/finance/chart/${encoded}?interval=1d&range=5d`;
      const res = await get(url, {
        Referer: 'https://finance.yahoo.com/',
        Origin:  'https://finance.yahoo.com',
      });
      if (res.status !== 200 || !res.json) continue;

      const result = res.json.chart && res.json.chart.result && res.json.chart.result[0];
      if (!result || !result.meta) continue;

      const m = result.meta;
      const price     = m.regularMarketPrice;
      const prevClose = m.chartPreviousClose != null ? m.chartPreviousClose
                       : m.previousClose     != null ? m.previousClose
                       : price;
      if (price == null) continue;

      const change    = +(price - prevClose).toFixed(4);
      const changePct = prevClose !== 0 ? +(((price - prevClose) / prevClose) * 100).toFixed(4) : 0;

      const ind   = result.indicators && result.indicators.quote && result.indicators.quote[0];
      const highs = ind && ind.high   ? ind.high.filter(v  => v != null) : [];
      const lows  = ind && ind.low    ? ind.low.filter(v   => v != null) : [];
      const vols  = ind && ind.volume ? ind.volume.filter(v => v != null) : [];

      return {
        symbol:      symbol,
        name:        m.shortName || m.longName || symbol,
        price:       price,
        change:      change,
        changePct:   changePct,
        prevClose:   prevClose,
        dayHigh:     m.regularMarketDayHigh ?? (highs.length ? Math.max(...highs) : null),
        dayLow:      m.regularMarketDayLow  ?? (lows.length  ? Math.min(...lows)  : null),
        volume:      m.regularMarketVolume  ?? (vols.length  ? vols[vols.length - 1] : 0),
        currency:    m.currency    || 'USD',
        marketState: m.marketState || 'CLOSED',
        week52High:  m.fiftyTwoWeekHigh ?? null,
        week52Low:   m.fiftyTwoWeekLow  ?? null,
        timestamp:   new Date().toISOString(),
      };
    } catch (e) {
      // try next host
    }
  }
  return null;
}

/* Run chart requests with bounded concurrency */
function fetchAllFromChart(symbols, concurrency) {
  return mapWithConcurrency(symbols, concurrency || 8, fetchChartOne);
}

/* ─────────────────────────────────────────────────────────────────────
 * QUOTE ENDPOINT (bulk, crumb-auth) — optional fast path
 * ────────────────────────────────────────────────────────────────────── */
function normaliseQuote(q) {
  if (!q || q.regularMarketPrice == null) return null;
  return {
    symbol:      q.symbol,
    name:        q.shortName || q.longName || q.symbol,
    price:       q.regularMarketPrice,
    change:      q.regularMarketChange        != null ? q.regularMarketChange        : 0,
    changePct:   q.regularMarketChangePercent != null ? q.regularMarketChangePercent : 0,
    prevClose:   q.regularMarketPreviousClose != null ? q.regularMarketPreviousClose : q.regularMarketPrice,
    dayHigh:     q.regularMarketDayHigh       ?? null,
    dayLow:      q.regularMarketDayLow        ?? null,
    volume:      q.regularMarketVolume        ?? 0,
    currency:    q.currency                   || 'USD',
    marketState: q.marketState                || 'CLOSED',
    week52High:  q.fiftyTwoWeekHigh           ?? null,
    week52Low:   q.fiftyTwoWeekLow            ?? null,
    timestamp:   new Date().toISOString(),
  };
}

async function fetchBulkQuotes(symbols) {
  const auth = await getOrRefreshCrumb();
  if (!auth) return null;

  const FIELDS = 'regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketPreviousClose,regularMarketDayHigh,regularMarketDayLow,regularMarketVolume,fiftyTwoWeekHigh,fiftyTwoWeekLow,shortName,longName,currency,marketState';
  const encoded = encodeURIComponent(symbols.join(','));
  const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encoded}&fields=${FIELDS}&lang=en-US&region=US&corsDomain=finance.yahoo.com&crumb=${encodeURIComponent(auth.crumb)}`;

  try {
    const res = await get(url, authHeaders(auth));
    if (res.status === 401) { invalidateCrumb(); return null; }
    if (res.status !== 200 || !res.json) return null;
    const results = res.json.quoteResponse && res.json.quoteResponse.result;
    if (!Array.isArray(results)) return null;

    const out = {};
    for (const q of results) {
      const n = normaliseQuote(q);
      if (n) out[q.symbol] = n;
    }
    return out;
  } catch (e) { return null; }
}

/* ─────────────────────────────────────────────────────────────────────
 * Handler
 * ────────────────────────────────────────────────────────────────────── */
const setCors = function(res) {
  for (const [key, value] of Object.entries(CORS)) res.setHeader(key, value);
};
const ok  = function(res, body)   { setCors(res); return res.status(200).json(body); };
const err = function(res, msg, c) { setCors(res); return res.status(c || 502).json({ error: msg }); };

async function handler(req, res) {
  if (req.method === 'OPTIONS') { setCors(res); return res.status(204).end(); }

  const qs      = typeof req.query === 'object' ? req.query : {};
  const symbols = ((qs.symbols !== undefined ? String(qs.symbols) : Object.keys(qs)[0]) || '').trim();
  if (!symbols) return err(res, 'symbols query param required', 400);

  const symList = symbols.split(',').map(s => s.trim()).filter(Boolean);
  if (symList.length > 120) return err(res, 'Max 120 symbols per request', 400);

  try {
    /* Strategy: try bulk quote first (1 request for all symbols).
     * If it returns < 100% coverage, top up via chart endpoint per-symbol.
     * Chart endpoint is the reliable primary — bulk is an optimisation. */

    console.log(`[quotes] Fetching ${symList.length} symbols…`);

    let quotes = {};
    let primarySource = 'chart';

    const bulk = await fetchBulkQuotes(symList);
    if (bulk && Object.keys(bulk).length > 0) {
      quotes = bulk;
      primarySource = 'bulk';
      console.log(`[quotes] Bulk endpoint returned ${Object.keys(bulk).length}/${symList.length} symbols`);
    } else {
      console.log('[quotes] Bulk endpoint unavailable — falling back to chart endpoint');
    }

    const missing = symList.filter(s => !quotes[s]);
    if (missing.length > 0) {
      console.log(`[quotes] Fetching ${missing.length} remaining via chart endpoint…`);
      const chartResults = await fetchAllFromChart(missing, 8);
      Object.assign(quotes, chartResults);
    }

    const resolved = Object.keys(quotes).length;
    console.log(`[quotes] ✓ Resolved ${resolved}/${symList.length} (primary: ${primarySource})`);

    if (resolved === 0) {
      return err(res,
        'Yahoo Finance unavailable on both bulk and chart endpoints. ' +
        'The exchange may be closed or Yahoo may be blocking this region. ' +
        'Try again in 5 minutes.'
      );
    }

    return ok(res, {
      quotes:    quotes,
      requested: symList.length,
      returned:  resolved,
      missing:   symList.length - resolved,
      source:    primarySource,
      timestamp: new Date().toISOString(),
    });

  } catch (e) {
    console.error('[quotes] Unhandled error:', e.message, e.stack);
    return err(res, 'Server error: ' + e.message);
  }
}

module.exports = handler;
module.exports.fetchBulkQuotes = fetchBulkQuotes;
module.exports.fetchAllFromChart = fetchAllFromChart;
