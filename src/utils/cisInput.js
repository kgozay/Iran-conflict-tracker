/**
 * Maps market data onto the inputs `computeCIS` expects. Shared by the
 * dashboard (App.jsx) and the serverless snapshot (api/_lib/market.js) so
 * both score the same way.
 */
export function buildCISInput(assets = {}, sectors = {}) {
  return {
    brentChg:       assets.brent?.changePct  ?? 0,
    usdZarChg:      assets.usdZar?.changePct ?? 0,
    goldChg:        assets.gold?.changePct   ?? 0,
    us10yChg:       assets.us10y?.changePct  ?? 0,
    // Prefer the real Top 40 (Satrix 40 ETF); fall back to the equal-weight watchlist average.
    top40Chg:       assets.jseTop40?.isLive ? assets.jseTop40.changePct : (sectors.top40?.chg ?? 0),
    minersChg:      sectors['Gold Miners']?.chg ?? 0,
    energyChg:      sectors.Energy?.chg         ?? 0,
    banksChg:       sectors.Banks?.chg          ?? 0,
    retailersChg:   sectors.Retailers?.chg      ?? 0,
    industrialsChg: sectors.Industrials?.chg    ?? 0,
  };
}
