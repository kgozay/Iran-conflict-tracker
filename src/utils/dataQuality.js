import { ALL_YAHOO_SYMBOLS } from '../data/stocks.js';

const MACRO_KEYS = ['brent','usdZar','gold','platinum','palladium','coal','us10y'];

function getJseSession(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-ZA', {
    timeZone: 'Africa/Johannesburg', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now);
  const value = type => parts.find(part => part.type === type)?.value;
  const weekday = value('weekday');
  const minutes = Number(value('hour')) * 60 + Number(value('minute'));
  const weekdayOpen = !['Sat', 'Sun'].includes(weekday);
  const isOpen = weekdayOpen && minutes >= 9 * 60 && minutes < 17 * 60;
  return { isOpen, label: isOpen ? 'Within JSE hours' : 'Outside JSE hours' };
}

export function buildDataHealth({ assets, stocks, status, lastFetch, sparklines, sourceHealth }) {
  const liveStocks = (stocks || []).filter(s => s.isLive && s.price != null);
  const liveMacro = MACRO_KEYS.filter(k => assets?.[k]?.price != null && (assets[k].isLive || assets[k].isProxy || assets[k].isStale));
  const failedStocks = (stocks || []).filter(s => !s.isLive || s.price == null).map(s => s.display || s.ticker);
  const failedMacro = MACRO_KEYS.filter(k => !assets?.[k]?.price).map(k => assets?.[k]?.name || k);
  const historyStocks = (stocks || []).filter(s => s.changePct5D != null || s.changePct20D != null).length;
  const historyMacro = MACRO_KEYS.filter(k => assets?.[k]?.changePct5D != null || assets?.[k]?.changePct20D != null).length;
  const sparkCount = sparklines ? Object.values(sparklines).filter(s => s?.points?.length >= 3).length : 0;
  const totalSymbols = Math.max(1, ALL_YAHOO_SYMBOLS.length);
  const resolvedSymbols = liveStocks.length + liveMacro.length;
  const quoteCoverage = totalSymbols ? Math.round((resolvedSymbols / totalSymbols) * 100) : 0;
  const ageMs = lastFetch ? Date.now() - new Date(lastFetch).getTime() : null;
  const minutesOld = ageMs == null ? null : Math.max(0, Math.round(ageMs / 60000));

  const warnings = [];
  if (quoteCoverage < 90 && resolvedSymbols > 0) warnings.push('Quote coverage is below 90%; review missing symbols before relying on the score.');
  if (status === 'cached') warnings.push('Showing cached data. Refresh before making decisions.');
  if (sourceHealth?.history === 'unavailable') warnings.push('Historical returns are temporarily unavailable.');

  const market = getJseSession();

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
    market,
    sourceHealth,
    lastFetch: lastFetch ? new Date(lastFetch).toISOString() : null,
    minutesOld,
    warnings,
  };
}
