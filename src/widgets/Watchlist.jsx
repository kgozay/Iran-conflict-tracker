import React, { useState, useMemo } from 'react';
import clsx from 'clsx';
import { Card } from './Card.jsx';
import { getSignal, SIGNAL_CLS } from '../utils/signals.js';
import { exportWatchlistCSV } from '../utils/export.js';
import { CheckIcon, DownloadIcon, DotIcon } from '../components/Icons.jsx';

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

function exposureTags(s) {
  const tags = [];
  const sector = s.sector;
  if (sector === 'Banks') tags.push('Rates sensitive', 'SA credit');
  if (sector === 'Retailers') tags.push('Rand/imports', 'Consumer');
  if (sector === 'Gold Miners') tags.push('Gold hedge', 'USD earnings');
  if (sector === 'PGMs') tags.push('PGM beta', 'China/autos');
  if (sector === 'Energy') tags.push('Oil/coal beta');
  if (sector === 'Industrials') tags.push('Offshore mix');
  if (sector === 'Mining') tags.push('Bulk commodities');
  if (sector === 'Telecoms') tags.push('Defensive yield');
  if (['AGL','BHP','GLN','CFR','BTI','ANH','PRX','NPN'].some(t => (s.display || '').includes(t))) tags.push('Rand hedge');
  return tags.slice(0, 3);
}

function SortArrow({ active, dir }) {
  return <span className={clsx('ml-1 text-[8px]', active ? 'text-warn' : 'text-tm')}>{active ? (dir === 'asc' ? '▲' : '▼') : '·'}</span>;
}

export default function Watchlist({ stocks, timeframe = '1D', returnMode = 'ABS' }) {
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
    return { ...s, _chg: displayChg, _rawChg: raw, _tags: exposureTags(s) };
  }), [stocks, timeframe, returnMode, marketAvgTF]);

  const filtered = useMemo(() => {
    const base = filter === 'ALL' ? rows : rows.filter(s => s.sector === filter);
    return [...base].sort((a, b) => {
      const av = sort.key === 'signal' ? (getSignal(a._chg) ?? '') : sort.key === 'changePct' ? (a._chg ?? -Infinity) : (a[sort.key] ?? '');
      const bv = sort.key === 'signal' ? (getSignal(b._chg) ?? '') : sort.key === 'changePct' ? (b._chg ?? -Infinity) : (b[sort.key] ?? '');
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

  const chgLabel = `${timeframe} CHG${returnMode === 'REL' ? ' (REL)' : ''}`;
  const COLS = [
    { key:'name', label:'NAME / EXPOSURE', align:'left' },
    { key:'sector', label:'SECTOR', align:'left' },
    { key:'price', label:'PRICE (ZAR)', align:'right' },
    { key:'changePct', label:chgLabel, align:'right' },
    { key:'mktcap', label:'MKT CAP', align:'right' },
    { key:'pe', label:'P/E', align:'right' },
    { key:'signal', label:'SIGNAL', align:'right' },
  ];

  const tfHasData = rows.some(s => s.isLive && s._rawChg != null);

  return (
    <Card>
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[9px] font-semibold tracking-[2px] text-ts uppercase">Key Shares Watchlist</span>
          <span className="font-mono text-[8px] text-ts border border-bd bg-bg-e px-1.5 py-0.5 rounded-sm">{filtered.length} NAMES</span>
          {liveCount > 0 && <span className="inline-flex items-center gap-1 font-mono text-[8px] text-bull border border-bull/30 bg-bull/8 px-1.5 py-0.5 rounded-sm"><DotIcon className="w-1.5 h-1.5" /> {liveCount} LIVE</span>}
          {!tfHasData && timeframe !== '1D' && <span className="font-mono text-[8px] text-warn border border-warn/30 bg-warn/8 px-1.5 py-0.5 rounded-sm">{timeframe} HISTORY LOADING</span>}
          {returnMode === 'REL' && marketAvgTF != null && <span className="font-mono text-[8px] text-ts border border-bd bg-bg-e px-1.5 py-0.5 rounded-sm">vs mkt {marketAvgTF >= 0 ? '+' : ''}{marketAvgTF.toFixed(2)}%</span>}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-bg-c border border-bd rounded overflow-hidden">
            {SECTOR_FILTERS.map(f => (
              <button key={f} type="button" onClick={() => setFilter(f)} className={clsx('px-2 py-1 font-mono text-[9px] transition-colors cursor-pointer', filter === f ? 'bg-bg-e text-tp' : 'text-ts hover:text-tp hover:bg-bg-h')}>
                {f === 'ALL' ? 'ALL' : f.replace('Gold Miners','GOLD').toUpperCase()}
              </button>
            ))}
          </div>
          <button type="button" onClick={handleCsv} className="inline-flex items-center gap-1.5 px-2.5 py-1 font-mono text-[9px] text-ts border border-bd bg-bg-c rounded hover:text-tp hover:border-ts transition-colors cursor-pointer whitespace-nowrap">
            {csvDone ? <><CheckIcon className="w-3 h-3" /> SAVED</> : <><DownloadIcon className="w-3 h-3" /> CSV</>}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>{COLS.map(col => <th key={col.key} onClick={() => toggleSort(col.key)} className={clsx('font-mono text-[8px] tracking-[1.5px] text-tm py-1.5 px-1.5 border-b border-bd cursor-pointer select-none hover:text-ts whitespace-nowrap', col.align === 'right' ? 'text-right' : 'text-left')}>{col.label}<SortArrow active={sort.key === col.key} dir={sort.dir} /></th>)}</tr>
          </thead>
          <tbody>
            {filtered.map(s => {
              const chg = s._chg;
              const isUp = (chg ?? 0) >= 0;
              const signal = getSignal(chg);
              const sigCls = SIGNAL_CLS[signal] ?? 'bg-bg-e text-ts border-bd';
              return (
                <tr key={s.ticker} className="hover:bg-bg-h transition-colors group">
                  <td className="py-1.5 px-1.5 border-b border-bd-x min-w-[260px]">
                    <div className="font-sans text-[11px] font-semibold text-tp leading-tight">{s.name}</div>
                    <div className="flex items-center gap-1.5 font-mono text-[8px] text-ts mb-1">{s.display}{s.isLive && <span className="inline-flex items-center gap-0.5 text-bull text-[7px]"><DotIcon className="w-1.5 h-1.5" /> LIVE</span>}</div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {s._tags.map(tag => <span key={tag} className="font-mono text-[7px] text-tm bg-bg-e border border-bd rounded-sm px-1.5 py-0.5">{tag}</span>)}
                    </div>
                  </td>
                  <td className="py-1.5 px-1.5 border-b border-bd-x"><span className="font-mono text-[7px] bg-bg-e text-ts px-1.5 py-0.5 rounded-sm">{s.sector}</span></td>
                  <td className="py-1.5 px-1.5 border-b border-bd-x text-right font-mono text-[10px] font-semibold text-tp">{fmtP(s.price)}</td>
                  <td className={clsx('py-1.5 px-1.5 border-b border-bd-x text-right font-mono text-[10px] font-semibold', chg == null ? 'text-tm' : isUp ? 'text-bull' : 'text-bear')}>{chg == null ? '—' : `${isUp ? '+' : ''}${chg.toFixed(2)}%`}</td>
                  <td className="py-1.5 px-1.5 border-b border-bd-x text-right font-mono text-[10px] text-ts">{s.mktcap}</td>
                  <td className="py-1.5 px-1.5 border-b border-bd-x text-right font-mono text-[10px] text-ts">{s.pe}x</td>
                  <td className="py-1.5 px-1.5 border-b border-bd-x text-right">{signal ? <span className={clsx('font-mono text-[7px] px-1.5 py-0.5 rounded-sm border', sigCls)}>{signal}</span> : <span className="font-mono text-[7px] text-tm">—</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="py-8 text-center font-mono text-[10px] text-tm">No stocks found for this filter</div>}
      </div>
    </Card>
  );
}
