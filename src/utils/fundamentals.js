/**
 * Live fundamentals (P/E, market cap) merged over the static reference figures in stocks.js.
 * Precedence per stock: value fetched this session → last live value under 24h old → static.
 */

export const FUNDAMENTALS_MAX_AGE = 24 * 60 * 60 * 1000;

/** Rand market cap in the same style as the static figures: R1.42T, R312B, R9.8B, R850M. */
export function formatMarketCap(zar) {
  if (!Number.isFinite(zar) || zar <= 0) return null;
  if (zar >= 1e12) return `R${(zar / 1e12).toFixed(2)}T`;
  if (zar >= 1e11) return `R${Math.round(zar / 1e9)}B`;
  if (zar >= 1e9)  return `R${(zar / 1e9).toFixed(1)}B`;
  return `R${Math.round(zar / 1e6)}M`;
}

/**
 * @param stocks    stock objects from JSE_STOCKS (with static `pe` / `mktcap`)
 * @param live      { data, ts } fetched this session, or null
 * @param cached    { data, ts } from localStorage, or null
 * @param now       current time in ms (injectable for tests)
 * Each `data` maps ticker → { pe, marketCapZar }. A null `pe` on a live/cached entry means
 * Yahoo reported no positive earnings, shown as "n/m" rather than falling back to static.
 */
export function mergeFundamentals(stocks, live, cached, now = Date.now()) {
  const cachedUsable = cached?.data && Number.isFinite(cached.ts) && now - cached.ts < FUNDAMENTALS_MAX_AGE;

  return stocks.map(stock => {
    const fromLive   = live?.data?.[stock.ticker];
    const fromCached = cachedUsable ? cached.data[stock.ticker] : null;
    const entry  = fromLive ?? fromCached;
    if (!entry) {
      return { ...stock, fundamentalsSource: 'static', fundamentalsAsOf: null };
    }
    return {
      ...stock,
      pe: entry.pe,
      mktcap: formatMarketCap(entry.marketCapZar) ?? stock.mktcap,
      fundamentalsSource: fromLive ? 'live' : 'cached',
      fundamentalsAsOf: fromLive ? live.ts : cached.ts,
    };
  });
}
