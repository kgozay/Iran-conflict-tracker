import { ALL_YAHOO_SYMBOLS } from '../data/stocks.js';

const MACRO_KEYS = ['brent','usdZar','gold','platinum','palladium','coal','r2035'];

export function buildDataHealth({ assets, stocks, status, lastFetch, sparklines }) {
  const liveStocks = (stocks || []).filter(s => s.isLive && s.price != null);
  const liveMacro = MACRO_KEYS.filter(k => assets?.[k]?.price != null && (assets[k].isLive || assets[k].isProxy || assets[k].isStale));
  const failedStocks = (stocks || []).filter(s => !s.isLive || s.price == null).map(s => s.display || s.ticker);
  const failedMacro = MACRO_KEYS.filter(k => !assets?.[k]?.price).map(k => assets?.[k]?.name || k);
  const historyStocks = (stocks || []).filter(s => s.changePct5D != null || s.changePct20D != null).length;
  const historyMacro = MACRO_KEYS.filter(k => assets?.[k]?.changePct5D != null || assets?.[k]?.changePct20D != null).length;
  const sparkCount = sparklines ? Object.values(sparklines).filter(s => s?.points?.length >= 3).length : 0;
  const bond = assets?.r2035 || {};
  const totalSymbols = Math.max(1, ALL_YAHOO_SYMBOLS.length - 1); // excludes SA 10Y, which is sourced through /api/sarb
  const resolvedSymbols = liveStocks.length + liveMacro.filter(k => k !== 'r2035').length;
  const quoteCoverage = totalSymbols ? Math.round((resolvedSymbols / totalSymbols) * 100) : 0;
  const ageMs = lastFetch ? Date.now() - new Date(lastFetch).getTime() : null;
  const minutesOld = ageMs == null ? null : Math.max(0, Math.round(ageMs / 60000));

  const warnings = [];
  if (bond.isStale) warnings.push('SA 10Y proxy is static and excluded from CIS scoring.');
  if (bond.isProxy) warnings.push('SA 10Y proxy is monthly/proxy data, not a live R2035 print.');
  if (quoteCoverage < 90 && resolvedSymbols > 0) warnings.push('Quote coverage is below 90%; review missing symbols before relying on the score.');
  if (status === 'cached') warnings.push('Showing cached data. Refresh before making decisions.');

  return {
    status,
    quoteCoverage,
    liveStocks: liveStocks.length,
    totalStocks: (stocks || []).length,
    liveMacro: liveMacro.length,
    totalMacro: MACRO_KEYS.length,
    historyStocks,
    totalHistoryStocks: (stocks || []).length,
    historyMacro,
    totalHistoryMacro: MACRO_KEYS.length,
    sparkCount,
    totalSparks: MACRO_KEYS.length,
    failedStocks,
    failedMacro,
    bondSource: bond.source || 'Unknown',
    bondDate: bond.date || null,
    bondIsStatic: !!bond.isStale,
    bondIsProxy: !!bond.isProxy,
    lastFetch: lastFetch ? new Date(lastFetch).toISOString() : null,
    minutesOld,
    warnings,
  };
}
