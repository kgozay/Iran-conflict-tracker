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

export function exportWatchlistCSV(stocks) {
  const headers = ['Name','Ticker','Sector','Price','1D Chg %','Market Cap','P/E','Signal','Live','Fetched'];
  const rows = stocks.map(s => [
    q(s.name), s.display, q(s.sector),
    s.price?.toFixed(2) ?? '',
    pct(s.changePct),
    q(s.mktcap), s.pe,
    q(getSignal(s.changePct) ?? '—'),
    s.isLive ? 'YES' : 'NO',
    ts(),
  ]);
  downloadText(
    [headers, ...rows].map(r => r.join(',')).join('\n'),
    `jse-watchlist-${today()}.csv`,
    'text/csv',
  );
}

export function exportMacroCSV(assets) {
  const headers = ['Asset','Symbol','Price','Change %','Unit','Live','Fetched'];
  const rows = Object.entries(assets).map(([key, a]) => [
    q(a.name), a.symbol ?? key,
    a.price?.toFixed(4) ?? '',
    pct(a.changePct),
    q(a.unit ?? ''),
    a.isLive ? 'YES' : 'NO',
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
    meta:        { generated: ts(), version: '2.0', source: 'JSE Conflict Watch' },
    conflictScore: cis,
    assets,
    sectors,
    alerts,
    stocks: stocks.map(s => ({
      name:   s.name, ticker: s.ticker, sector: s.sector,
      price:  s.price, chg1d: s.changePct,
      mktcap: s.mktcap, pe: s.pe,
      signal: getSignal(s.changePct),
      live:   !!s.isLive,
    })),
  };
  downloadText(JSON.stringify(snapshot, null, 2), `jse-snapshot-${today()}.json`, 'application/json');
}
