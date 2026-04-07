import React, { useState, useMemo } from 'react';
import clsx from 'clsx';
import { Card } from './Card.jsx';
import { getSignal, SIGNAL_CLS } from '../utils/signals.js';
import { exportWatchlistCSV } from '../utils/export.js';

const SECTOR_FILTERS = [
  'ALL','Gold Miners','Energy','Banks','Retailers','PGMs','Industrials','Mining','Telecoms',
];

const COLS = [
  { key:'name',      label:'NAME',        align:'left'  },
  { key:'sector',    label:'SECTOR',      align:'left'  },
  { key:'price',     label:'PRICE (ZAR)', align:'right' },
  { key:'changePct', label:'1D CHG',      align:'right' },
  { key:'mktcap',    label:'MKT CAP',     align:'right' },
  { key:'pe',        label:'P/E',         align:'right' },
  { key:'signal',    label:'SIGNAL',      align:'right' },
];

function fmtP(p) {
  if (p == null) return '—';
  if (p >= 1000) return p.toLocaleString('en-ZA', { maximumFractionDigits: 0 });
  if (p >= 100)  return p.toFixed(1);
  return p.toFixed(2);
}

function SortArrow({ active, dir }) {
  return (
    <span className={clsx('ml-1 text-[8px]', active ? 'text-warn' : 'text-tm')}>
      {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );
}

export default function Watchlist({ stocks, timeframe }) {
  const [filter,  setFilter]  = useState('ALL');
  const [sort,    setSort]    = useState({ key: 'sector', dir: 'asc' });
  const [csvDone, setCsvDone] = useState(false);

  const liveCount = stocks.filter(s => s.isLive).length;

  const filtered = useMemo(() => {
    const base = filter === 'ALL' ? stocks : stocks.filter(s => s.sector === filter);
    return [...base].sort((a, b) => {
      // Compute signal on-the-fly for sorting
      const av = sort.key === 'signal'
        ? (getSignal(a.changePct) ?? '')
        : (a[sort.key] ?? '');
      const bv = sort.key === 'signal'
        ? (getSignal(b.changePct) ?? '')
        : (b[sort.key] ?? '');
      const as = typeof av === 'string' ? av.toLowerCase() : av;
      const bs = typeof bv === 'string' ? bv.toLowerCase() : bv;
      return sort.dir === 'asc' ? (as > bs ? 1 : -1) : (as < bs ? 1 : -1);
    });
  }, [stocks, filter, sort]);

  function toggleSort(key) {
    setSort(p => p.key === key
      ? { key, dir: p.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: 'desc' }
    );
  }

  function handleCsv() {
    exportWatchlistCSV(filtered, timeframe);
    setCsvDone(true);
    setTimeout(() => setCsvDone(false), 2500);
  }

  return (
    <Card>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] font-semibold tracking-[2px] text-ts uppercase">
            Key Shares Watchlist
          </span>
          <span className="font-mono text-[8px] text-ts border border-bd bg-bg-e px-1.5 py-0.5 rounded-sm">
            {filtered.length} NAMES
          </span>
          {liveCount > 0 && (
            <span className="font-mono text-[8px] text-bull border border-bull/30 bg-bull/8 px-1.5 py-0.5 rounded-sm">
              {liveCount} LIVE
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Sector filter */}
          <div className="flex bg-bg-c border border-bd rounded overflow-hidden">
            {SECTOR_FILTERS.map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={clsx(
                  'px-2 py-1 font-mono text-[9px] transition-colors cursor-pointer',
                  filter === f ? 'bg-bg-e text-tp' : 'text-ts hover:text-tp hover:bg-bg-h',
                )}
              >
                {f === 'ALL' ? 'ALL' : f.length > 6 ? f.slice(0, 4).toUpperCase() : f.toUpperCase()}
              </button>
            ))}
          </div>

          {/* CSV export */}
          <button
            type="button"
            onClick={handleCsv}
            className="px-2.5 py-1 font-mono text-[9px] text-ts border border-bd bg-bg-c rounded hover:text-tp hover:border-ts transition-colors cursor-pointer whitespace-nowrap"
          >
            {csvDone ? '✓ SAVED' : '↓ CSV'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {COLS.map(col => (
                <th
                  key={col.key}
                  type="button"
                  onClick={() => toggleSort(col.key)}
                  className={clsx(
                    'font-mono text-[8px] tracking-[1.5px] text-tm py-1.5 px-1.5',
                    'border-b border-bd-x cursor-pointer select-none hover:text-ts whitespace-nowrap',
                    col.align === 'right' ? 'text-right' : 'text-left',
                  )}
                >
                  {col.label}
                  <SortArrow active={sort.key === col.key} dir={sort.dir} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => {
              const chg    = s.changePct ?? null;
              const isUp   = (chg ?? 0) >= 0;
              const signal = getSignal(chg);
              const sigCls = SIGNAL_CLS[signal] ?? 'bg-bg-e text-ts border-bd';

              return (
                <tr key={s.ticker} className="hover:bg-bg-h transition-colors group">
                  {/* Name */}
                  <td className="py-1.5 px-1.5 border-b border-bd-x">
                    <div className="font-sans text-[11px] font-semibold text-tp leading-tight">{s.name}</div>
                    <div className="flex items-center gap-1.5 font-mono text-[8px] text-ts">
                      {s.display}
                      {s.isLive && <span className="text-bull text-[7px]">● LIVE</span>}
                    </div>
                  </td>
                  {/* Sector */}
                  <td className="py-1.5 px-1.5 border-b border-bd-x">
                    <span className="font-mono text-[7px] bg-bg-e text-ts px-1.5 py-0.5 rounded-sm">
                      {s.sector}
                    </span>
                  </td>
                  {/* Price */}
                  <td className="py-1.5 px-1.5 border-b border-bd-x text-right font-mono text-[10px] font-semibold text-tp">
                    {fmtP(s.price)}
                  </td>
                  {/* 1D chg */}
                  <td className={clsx(
                    'py-1.5 px-1.5 border-b border-bd-x text-right font-mono text-[10px] font-semibold',
                    chg == null ? 'text-tm' : isUp ? 'text-bull' : 'text-bear',
                  )}>
                    {chg == null ? '—' : `${isUp ? '+' : ''}${chg.toFixed(2)}%`}
                  </td>
                  {/* Mkt cap */}
                  <td className="py-1.5 px-1.5 border-b border-bd-x text-right font-mono text-[10px] text-ts">
                    {s.mktcap}
                  </td>
                  {/* P/E */}
                  <td className="py-1.5 px-1.5 border-b border-bd-x text-right font-mono text-[10px] text-ts">
                    {s.pe}x
                  </td>
                  {/* Signal */}
                  <td className="py-1.5 px-1.5 border-b border-bd-x text-right">
                    {signal
                      ? <span className={clsx('font-mono text-[7px] px-1.5 py-0.5 rounded-sm border', sigCls)}>
                          {signal}
                        </span>
                      : <span className="font-mono text-[7px] text-tm">—</span>
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-8 text-center font-mono text-[10px] text-tm">
            No stocks found for this filter
          </div>
        )}
      </div>
    </Card>
  );
}
