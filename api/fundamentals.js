/**
 * JSE Conflict Watch — live P/E and market cap
 * Vercel Serverless Function — CommonJS — NO API KEY REQUIRED
 *
 * Kept separate from /api/quotes so a failure here never costs prices.
 *   Primary:  /v7/finance/quote bulk call (cookie + crumb auth)
 *   Fallback: /v10/finance/quoteSummary per symbol (same auth)
 * If Yahoo refuses crumb auth, the client keeps its last live values (24h)
 * and then falls back to the static reference figures in src/data/stocks.js.
 */

const { get, getOrRefreshCrumb, invalidateCrumb, authHeaders, mapWithConcurrency } = require('./_lib/yahoo.js');

const CORS = {
  'Content-Type':                'application/json',
  'Access-Control-Allow-Origin': '*',
  // Fundamentals change at most daily; let the CDN absorb repeat requests.
  'Cache-Control':               'public, max-age=3600, s-maxage=21600',
};

const FIELDS = 'trailingPE,forwardPE,marketCap,sharesOutstanding,currency,regularMarketPrice';

/* Yahoo wraps quoteSummary numbers as { raw, fmt }; the bulk quote returns plain numbers. */
function num(value) {
  const v = value != null && typeof value === 'object' ? value.raw : value;
  return Number.isFinite(v) ? v : null;
}

/**
 * Normalise one symbol's fundamentals.
 * - P/E is kept only when positive (loss-making companies have no meaningful P/E).
 * - JSE instruments are quoted in cents (currency "ZAc"), so market cap is divided by 100.
 */
function normaliseFundamentals({ trailingPE, marketCap, currency }) {
  const pe  = num(trailingPE);
  const cap = num(marketCap);
  const inCents = currency === 'ZAc' || currency === 'ZAC';
  return {
    pe:           pe != null && pe > 0 ? +pe.toFixed(1) : null,
    marketCapZar: cap != null && cap > 0 ? Math.round(inCents ? cap / 100 : cap) : null,
    currency:     currency || null,
  };
}

async function fetchBulk(symbols, auth) {
  const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(','))}&fields=${FIELDS}&lang=en-US&region=US&crumb=${encodeURIComponent(auth.crumb)}`;
  const res = await get(url, authHeaders(auth));
  if (res.status === 401) { invalidateCrumb(); return {}; }
  const results = res.status === 200 && res.json?.quoteResponse?.result;
  if (!Array.isArray(results)) return {};
  const out = {};
  for (const q of results) out[q.symbol] = normaliseFundamentals(q);
  return out;
}

async function fetchSummaryOne(symbol, auth) {
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=summaryDetail,price&crumb=${encodeURIComponent(auth.crumb)}`;
  const res = await get(url, authHeaders(auth));
  const r = res.status === 200 && res.json?.quoteSummary?.result?.[0];
  if (!r) return null;
  return normaliseFundamentals({
    trailingPE: r.summaryDetail?.trailingPE,
    marketCap:  r.price?.marketCap ?? r.summaryDetail?.marketCap,
    currency:   r.price?.currency ?? r.summaryDetail?.currency,
  });
}

const setCors = res => { for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v); };

async function handler(req, res) {
  if (req.method === 'OPTIONS') { setCors(res); return res.status(204).end(); }

  const symbols = String(req.query?.symbols || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!symbols.length) { setCors(res); return res.status(400).json({ error: 'symbols query param required' }); }
  if (symbols.length > 120) { setCors(res); return res.status(400).json({ error: 'Max 120 symbols per request' }); }

  try {
    const auth = await getOrRefreshCrumb();
    if (!auth) {
      setCors(res);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(502).json({ error: 'Yahoo crumb authentication unavailable' });
    }

    let source = 'bulk';
    const fundamentals = await fetchBulk(symbols, auth);
    const missing = symbols.filter(s => !fundamentals[s]);
    if (missing.length) {
      source = Object.keys(fundamentals).length ? 'bulk+summary' : 'summary';
      Object.assign(fundamentals, await mapWithConcurrency(missing, 8, s => fetchSummaryOne(s, auth)));
    }

    const returned = Object.keys(fundamentals).length;
    console.log(`[fundamentals] Resolved ${returned}/${symbols.length} (source: ${source})`);
    setCors(res);
    if (!returned) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(502).json({ error: 'No fundamentals returned by Yahoo' });
    }
    return res.status(200).json({
      fundamentals, returned, requested: symbols.length, source, timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[fundamentals] Unhandled error:', e.message);
    setCors(res);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'Server error: ' + e.message });
  }
}

module.exports = handler;
module.exports.normaliseFundamentals = normaliseFundamentals;
