/**
 * Server-side market snapshot: live quotes for the whole universe, scored with
 * the same CIS code the dashboard uses (src/utils is ESM, so it is loaded with
 * dynamic import from this CommonJS module).
 */

const { fetchBulkQuotes, fetchAllFromChart } = require('../quotes.js');

async function loadShared() {
  const [stocksMod, sectorsMod, inputMod, scoringMod, alertsMod] = await Promise.all([
    import('../../src/data/stocks.js'),
    import('../../src/utils/sectors.js'),
    import('../../src/utils/cisInput.js'),
    import('../../src/utils/scoring.js'),
    import('../../src/utils/alerts.js'),
  ]);
  return {
    MACRO_SYMBOLS: stocksMod.MACRO_SYMBOLS,
    JSE_STOCKS: stocksMod.JSE_STOCKS,
    ALL_YAHOO_SYMBOLS: stocksMod.ALL_YAHOO_SYMBOLS,
    deriveSectors: sectorsMod.deriveSectors,
    buildCISInput: inputMod.buildCISInput,
    computeCIS: scoringMod.computeCIS,
    computeAlerts: alertsMod.computeAlerts,
  };
}

/* Score a { symbol: quote } map. Pure apart from the module load. */
async function buildSnapshot(quotes) {
  const lib = await loadShared();
  const assets = {};
  for (const [key, meta] of Object.entries(lib.MACRO_SYMBOLS)) {
    const q = quotes[meta.symbol];
    assets[key] = {
      name: meta.name, symbol: meta.symbol, unit: meta.unit,
      price: q?.price ?? null,
      changePct: Number.isFinite(q?.changePct) ? q.changePct : null,
      isLive: q != null && Number.isFinite(q.changePct),
    };
  }
  const stocks = lib.JSE_STOCKS.map(s => {
    const q = quotes[s.ticker];
    return {
      ...s,
      price: q?.price ?? null,
      changePct: Number.isFinite(q?.changePct) ? q.changePct : null,
      isLive: q != null && Number.isFinite(q.changePct),
    };
  });
  const sectors = lib.deriveSectors(stocks);
  const cis = lib.computeCIS(lib.buildCISInput(assets, sectors));
  const alerts = lib.computeAlerts({ assets, sectors, stocks });
  const total = lib.ALL_YAHOO_SYMBOLS.length;
  const live = lib.ALL_YAHOO_SYMBOLS.filter(sym => quotes[sym]).length;
  return { assets, stocks, sectors, cis, alerts, coverage: Math.round(live / total * 100) };
}

/* Fetch live quotes (bulk first, chart top-up) and score them. */
async function fetchLiveSnapshot() {
  const { ALL_YAHOO_SYMBOLS } = await loadShared();
  let quotes = (await fetchBulkQuotes(ALL_YAHOO_SYMBOLS)) || {};
  const missing = ALL_YAHOO_SYMBOLS.filter(s => !quotes[s]);
  if (missing.length) Object.assign(quotes, await fetchAllFromChart(missing, 8));
  if (!Object.keys(quotes).length) throw new Error('Yahoo Finance returned no quotes');
  return buildSnapshot(quotes);
}

/* The compact record stored for each CIS reading. */
function toReading(snapshot, source, ts = Date.now()) {
  const { cis, assets, coverage } = snapshot;
  const round = (v, d = 4) => Number.isFinite(v) ? +v.toFixed(d) : null;
  return {
    ts,
    total: cis.total,
    regime: cis.regime,
    regimeClass: cis.regimeClass,
    top40: round(assets.jseTop40?.price, 2),
    brent: round(assets.brent?.changePct),
    usdZar: round(assets.usdZar?.changePct),
    gold: round(assets.gold?.changePct),
    us10y: round(assets.us10y?.changePct),
    coverage,
    source,
  };
}

module.exports = { buildSnapshot, fetchLiveSnapshot, toReading };
