import { getSignal } from './signals.js';

function downloadText(content, filename, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const today = () => new Date().toISOString().slice(0, 10);
const ts    = () => new Date().toISOString();
const q     = v => `"${v}"`;
const pct   = v => v == null ? '' : v.toFixed(4);

export function exportWatchlistCSV(stocks, timeframe = '1D', returnMode = 'ABS') {
  const chgLabel = `${timeframe} Chg %${returnMode === 'REL' ? ' Relative' : ''}`;
  const headers = ['Name','Ticker','Sector','Price',chgLabel,'Raw Chg %','Market Cap','P/E','Signal','Live','Source','Fetched'];
  const rows = stocks.map(s => {
    const displayChg = s._chg ?? (
      timeframe === '5D' ? s.changePct5D :
      timeframe === '20D' ? s.changePct20D :
      s.changePct
    );
    const rawChg = s._rawChg ?? displayChg;
    return [
      q(s.name), s.display, q(s.sector),
      s.price?.toFixed(2) ?? '',
      pct(displayChg),
      pct(rawChg),
      q(s.mktcap), s.pe,
      q(getSignal(displayChg) ?? '—'),
      s.isLive ? 'YES' : 'NO',
      q(s.source || 'Yahoo/static reference'),
      ts(),
    ];
  });
  downloadText(
    [headers, ...rows].map(r => r.join(',')).join('\n'),
    `jse-watchlist-${today()}.csv`,
    'text/csv',
  );
}

export function exportMacroCSV(assets) {
  const headers = ['Asset','Symbol','Price','Change %','Unit','Live','Source','Proxy','Static','Fetched'];
  const rows = Object.entries(assets).map(([key, a]) => [
    q(a.name), a.symbol ?? key,
    a.price?.toFixed(4) ?? '',
    pct(a.changePct),
    q(a.unit ?? ''),
    a.isLive ? 'YES' : 'NO',
    q(a.source || 'Yahoo'),
    a.isProxy ? 'YES' : 'NO',
    a.isStale ? 'YES' : 'NO',
    ts(),
  ]);
  downloadText(
    [headers, ...rows].map(r => r.join(',')).join('\n'),
    `jse-macro-${today()}.csv`,
    'text/csv',
  );
}

export function exportSnapshotJSON(assets, stocks, sectors, cis, alerts) {
  const snapshot = {
    meta:        { generated: ts(), version: '2.1', source: 'JSE Conflict Watch', note: 'CIS is heuristic and sector baskets are equal-weighted.' },
    conflictScore: cis,
    assets,
    sectors,
    alerts,
    stocks: stocks.map(s => ({
      name:   s.name, ticker: s.ticker, sector: s.sector,
      price:  s.price, chg1d: s.changePct,
      mktcap: s.mktcap, pe: s.pe,
      signal: getSignal(s.changePct),
      source: s.source || 'Yahoo/static reference',
      live:   !!s.isLive,
    })),
  };
  downloadText(JSON.stringify(snapshot, null, 2), `jse-snapshot-${today()}.json`, 'application/json');
}
