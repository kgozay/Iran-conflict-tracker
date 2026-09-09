import React, { useState, useMemo } from 'react';
import clsx from 'clsx';
import { Card } from './Card.jsx';
import { getSignal, SIGNAL_CLS } from '../utils/signals.js';
import { exportWatchlistCSV } from '../utils/export.js';
import { CheckIcon, DownloadIcon } from '../components/Icons.jsx';

const SECTOR_FILTERS = ['ALL','Banks','Retailers','Gold Miners','PGMs','Energy','Industrials','Mining','Telecoms'];

function fmtP(p) {
  if (p == null) return '—';
  if (p >= 1000) return p.toLocaleString('en-ZA', { maximumFractionDigits: 0 });
  if (p >= 100)  return p.toFixed(1);
  return p.toFixed(2);
}

function getTimeframeChange(stock, tf) {
  if (tf === '5D')  return stock.changePct5D  ?? null;
  if (tf === '20D') return stock.changePct20D ?? null;
  return stock.changePct ?? null;
}

function MiniSparkline({ points }) {
  if (!points || points.length < 3) return <div style={{ width: 52, height: 18 }} />;
  const W = 52, H = 18;
  const min = Math.min(...points), max = Math.max(...points);
  const range = max - min || Math.abs(min) * 0.0005 || 1;
  const line = points.map((v, i) =>
    `${i === 0 ? 'M' : 'L'} ${((i / (points.length - 1)) * W).toFixed(1)},${(H - ((v - min) / range) * H).toFixed(1)}`
  ).join(' ');
  const chg = points[points.length - 1] - (points[0] || 0);
  const col = chg >= 0 ? '#34d399' : '#f97070';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true" style={{ display: 'block' }}>
      <path d={line} stroke={col} strokeWidth="1.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function SortArrow({ active, dir }) {
  return <span className={clsx('ml-1 text-[8px]', active ? 'text-warn' : 'text-tx')}>{active ? (dir === 'asc' ? '▲' : '▼') : '·'}</span>;
}

export default function Watchlist({ stocks, timeframe = '1D', returnMode = 'ABS', sparklines }) {
  const [filter, setFilter] = useState('ALL');
  const [sort, setSort] = useState({ key: 'sector', dir: 'asc' });
  const [csvDone, setCsvDone] = useState(false);

  const liveCount = stocks.filter(s => s.isLive).length;
  const marketAvgTF = useMemo(() => {
    const vals = stocks.filter(s => s.isLive).map(s => getTimeframeChange(s, timeframe)).filter(v => v != null);
    if (!vals.length) return null;
    return vals.reduce((a, v) => a + v, 0) / vals.length;
  }, [stocks, timeframe]);

  const rows = useMemo(() => stocks.map(s => {
    const raw = getTimeframeChange(s, timeframe);
    const displayChg = raw == null ? null : returnMode === 'REL' && marketAvgTF != null ? +(raw - marketAvgTF).toFixed(2) : raw;
    return { ...s, _chg: displayChg, _rawChg: raw };
  }), [stocks, timeframe, returnMode, marketAvgTF]);

  const filtered = useMemo(() => {
    const base = filter === 'ALL' ? rows : rows.filter(s => s.sector === filter);
    return [...base].sort((a, b) => {
      const av = sort.key === 'signal' ? (getSignal(a._chg) ?? '') : sort.key === 'changePct' ? (a._chg ?? -Infinity) : sort.key === 'price' ? (a.price ?? -Infinity) : (a[sort.key] ?? '');
      const bv = sort.key === 'signal' ? (getSignal(b._chg) ?? '') : sort.key === 'changePct' ? (b._chg ?? -Infinity) : sort.key === 'price' ? (b.price ?? -Infinity) : (b[sort.key] ?? '');
      const as = typeof av === 'string' ? av.toLowerCase() : av;
      const bs = typeof bv === 'string' ? bv.toLowerCase() : bv;
      if (as === bs) return 0;
      return sort.dir === 'asc' ? (as > bs ? 1 : -1) : (as < bs ? 1 : -1);
    });
  }, [rows, filter, sort]);

  function toggleSort(key) {
    setSort(p => p.key === key ? { key, dir: p.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' });
  }

  function handleCsv() {
    exportWatchlistCSV(filtered, timeframe, returnMode);
    setCsvDone(true);
    setTimeout(() => setCsvDone(false), 2500);
  }

  const chgLabel = `${timeframe}${returnMode === 'REL' ? ' REL' : ''}`;

  return (
    <Card>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-[18px] flex-wrap">
        <div>
          <div className="font-serif text-[22px] text-tp leading-[1.1]">
            JSE <span className="italic text-warn">watchlist</span>
          </div>
          <div className="text-[12px] text-tm mt-1">
            {filtered.length} names · {liveCount} live
            {returnMode === 'REL' && marketAvgTF != null && ` · vs mkt ${marketAvgTF >= 0 ? '+' : ''}${marketAvgTF.toFixed(2)}%`}
          </div>
        </div>

        {/* Filter pills + CSV */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {SECTOR_FILTERS.map(f => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              aria-pressed={f === filter}
              className={clsx(
                'min-h-11 sm:min-h-0 px-3 py-[5px] text-[11.5px] font-medium rounded-full cursor-pointer transition-colors',
                f === filter ? 'text-ink bg-paper' : 'text-ts hover:text-tp',
              )}
              style={f === filter ? { color: 'var(--color-ink)' } : {}}>
              {f === 'ALL' ? 'All' : f === 'Gold Miners' ? 'Gold' : f}
            </button>
          ))}
          <button type="button" onClick={handleCsv}
            className="min-h-11 sm:min-h-0 inline-flex items-center gap-1.5 px-3 py-[5px] text-[11.5px] text-ts border border-bd rounded-full hover:text-tp hover:border-ts transition-colors cursor-pointer ml-1">
            {csvDone ? <><CheckIcon className="w-3 h-3" />Saved</> : <><DownloadIcon className="w-3 h-3" />CSV</>}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <caption className="sr-only">JSE watchlist prices, returns, sectors and market signals</caption>
          <thead>
            <tr className="border-b border-bd">
              {[
                { key: 'display',   label: 'Ticker',  align: 'left'  },
                { key: 'name',      label: 'Name',    align: 'left'  },
                { key: 'price',     label: 'Price',   align: 'right' },
                { key: 'changePct', label: chgLabel,  align: 'right' },
                { key: 'sector',    label: 'Sector',  align: 'right' },
                { key: 'signal',    label: 'Signal',  align: 'right', hideMobile: true },
                { key: 'spark',     label: '',        align: 'right', hideMobile: true },
              ].map(col => (
                <th key={col.key} scope="col"
                  aria-sort={sort.key === col.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                  className={clsx(
                    'text-[10.5px] font-medium text-tm tracking-[0.05em] uppercase pb-2 px-1',
                    col.align === 'right' ? 'text-right' : 'text-left',
                    col.hideMobile && 'hidden sm:table-cell',
                  )}>
                  {col.key === 'spark' ? col.label : (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={clsx(
                        'min-h-11 sm:min-h-0 inline-flex items-center py-1 select-none hover:text-ts focus-visible:text-warn',
                        col.align === 'right' && 'justify-end',
                      )}
                    >
                      {col.label}
                      <SortArrow active={sort.key === col.key} dir={sort.dir} />
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i, arr) => {
              const chg = s._chg;
              const isUp = (chg ?? 0) >= 0;
              const signal = getSignal(chg);
              const sigCls = SIGNAL_CLS[signal] ?? 'bg-bg-e text-ts border-bd';
              return (
                <tr key={s.ticker}
                  className={clsx(
                    'hover:bg-bg-h transition-colors',
                    i < arr.length - 1 && 'border-b border-bd',
                  )}>
                  <td className="py-3 px-1">
                    <span className="font-mono text-[12px] font-semibold text-tp tracking-[0.04em]">{s.display || s.ticker}</span>
                  </td>
                  <td className="py-3 px-1 text-[13.5px] text-tp">{s.name}</td>
                  <td className="py-3 px-1 text-right font-mono text-[13px] font-semibold text-tp">{fmtP(s.price)}</td>
                  <td className={clsx('py-3 px-1 text-right font-mono text-[13px] font-semibold', chg == null ? 'text-tm' : isUp ? 'text-bull' : 'text-bear')}>
                    {chg == null ? '—' : `${isUp ? '+' : ''}${chg.toFixed(2)}%`}
                  </td>
                  <td className="py-3 px-1 text-right text-[11.5px] text-ts">{s.sector}</td>
                  <td className="py-3 px-1 text-right hidden sm:table-cell">
                    {signal
                      ? <span className={clsx('font-mono text-[9px] px-[7px] py-[2px] rounded-full border', sigCls)}>{signal}</span>
                      : <span className="text-tm text-[11px]">—</span>}
                  </td>
                  <td className="py-3 px-1 text-right hidden sm:table-cell">
                    <MiniSparkline points={sparklines?.[s.ticker]?.points} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-8 text-center text-[13px] text-tm">No stocks found for this filter</div>
        )}
      </div>
    </Card>
  );
}
