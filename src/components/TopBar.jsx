import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import {
  BoltIcon, DownloadIcon, TableIcon, LineChartIcon, FileIcon,
  RefreshIcon, ErrorIcon, DotIcon,
} from './Icons.jsx';
import MarketHours from './MarketHours.jsx';

const PAGE_TITLES = {
  overview:  'OVERVIEW',
  macro:     'MACRO TRANSMISSION',
  drilldown: 'SECTOR DRILLDOWN',
};

const BADGES = {
  live:    { cls: 'bg-bull/10 text-bull border border-bull/30', Icon: DotIcon,     text: (t) => `LIVE · ${t}`   },
  cached:  { cls: 'bg-warn/10 text-warn border border-warn/30', Icon: DotIcon,     text: (t) => `CACHED · ${t}` },
  loading: { cls: 'bg-warn/10 text-warn border border-warn/30', Icon: RefreshIcon, text: ()  => 'FETCHING…'     },
  error:   { cls: 'bg-bear/10 text-bear border border-bear/30', Icon: ErrorIcon,   text: ()  => 'ERROR'         },
  empty:   { cls: 'bg-bg-e text-ts border border-bd',           Icon: DotIcon,     text: ()  => 'NO DATA YET'   },
};

const REFRESH_OPTS = [
  { key:'off', label:'OFF' },
  { key:'5m',  label:'5M'  },
  { key:'15m', label:'15M' },
  { key:'30m', label:'30M' },
];

function Pill() { return <div className="w-px h-4 bg-bd mx-1 flex-shrink-0 hidden lg:block" />; }
function Group({ children }) { return <div className="flex bg-bg-c border border-bd rounded overflow-hidden flex-shrink-0">{children}</div>; }
function Btn({ label, active, onClick, title }) {
  return (
    <button type="button" onClick={onClick} title={title} className={clsx(
      'px-2.5 py-1 font-mono text-[10px] transition-colors cursor-pointer select-none whitespace-nowrap',
      active ? 'bg-bg-e text-tp' : 'text-ts hover:text-tp hover:bg-bg-h',
    )}>{label}</button>
  );
}

function DataBadge({ dataHealth }) {
  if (!dataHealth) return null;
  const coverage = dataHealth.quoteCoverage ?? 0;
  const tone = coverage >= 95 && !dataHealth.bondIsStatic ? 'bull' : coverage >= 85 ? 'warn' : 'bear';
  const cls = tone === 'bull'
    ? 'bg-bull/8 text-bull border-bull/30'
    : tone === 'warn'
      ? 'bg-warn/8 text-warn border-warn/30'
      : 'bg-bear/8 text-bear border-bear/30';
  const title = `Quotes ${dataHealth.liveStocks}/${dataHealth.totalStocks}; SA 10Y ${dataHealth.bondSource || 'unknown'}${dataHealth.bondIsStatic ? ' static' : ''}`;
  return (
    <span className={clsx('inline-flex items-center gap-1 font-mono text-[9px] px-2 py-0.5 rounded border whitespace-nowrap', cls)} title={title}>
      <DotIcon className="w-1.5 h-1.5" /> DATA {coverage}%
    </span>
  );
}

export default function TopBar({
  page, status, error, lastFetch, progress,
  onFetch, timeframe, setTimeframe, returnMode, setReturnMode,
  autoRefresh, onExport, dataHealth,
}) {
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);

  useEffect(() => {
    if (!exportOpen) return;
    function handler(e) {
      if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [exportOpen]);

  const badge = BADGES[status] ?? BADGES.empty;
  const BadgeIcon = badge.Icon;
  const ts = lastFetch?.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }) ?? '';
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-ZA', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
  const isLoading = status === 'loading';

  return (
    <header className="min-h-[68px] bg-bg-s border-b border-bd flex items-center justify-between px-5 flex-shrink-0 gap-3 flex-wrap py-2">
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <div className="font-display text-[18px] tracking-[2px] text-tp whitespace-nowrap">JSE CONFLICT WATCH</div>
          <div className="font-mono text-[8px] text-tm tracking-[1px] whitespace-nowrap">
            {PAGE_TITLES[page] ?? 'DASHBOARD'} · {dateStr}{isLoading ? ` · ${progress}` : ''}
          </div>
        </div>
        <div className="hidden 2xl:block"><MarketHours /></div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
        <span className={clsx('inline-flex items-center gap-1.5 font-mono text-[9px] px-2 py-0.5 rounded whitespace-nowrap', badge.cls)}>
          <BadgeIcon className={clsx('flex-shrink-0', BadgeIcon === DotIcon ? 'w-2 h-2' : 'w-2.5 h-2.5', isLoading && 'animate-spin')} />
          {badge.text(ts)}
        </span>
        <DataBadge dataHealth={dataHealth} />
        {dataHealth?.bondIsStatic && (
          <span className="inline-flex items-center gap-1 font-mono text-[8px] text-bear border border-bear/30 bg-bear/8 px-2 py-0.5 rounded-sm whitespace-nowrap">
            <DotIcon className="w-1.5 h-1.5" /> SA 10Y STATIC · EXCLUDED
          </span>
        )}
        {status === 'error' && error && (
          <span className="font-mono text-[8px] text-bear max-w-[180px] truncate hidden lg:block" title={error}>{error}</span>
        )}

        <Pill />
        <Group>{['1D','5D','20D'].map(tf => <Btn key={tf} label={tf} active={timeframe === tf} onClick={() => setTimeframe(tf)} />)}</Group>
        <Group>{['ABS','REL'].map(rm => <Btn key={rm} label={rm} active={returnMode === rm} onClick={() => setReturnMode(rm)} />)}</Group>
        <Pill />

        {autoRefresh && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="font-mono text-[8px] text-tm hidden lg:block">AUTO</span>
            <Group>{REFRESH_OPTS.map(opt => <Btn key={opt.key} label={opt.label} active={autoRefresh.intervalKey === opt.key} onClick={() => autoRefresh.setIntervalKey(opt.key)} />)}</Group>
            {autoRefresh.countdown && <span className="font-mono text-[9px] text-warn w-10 text-right tabular-nums flex-shrink-0">{autoRefresh.countdown}</span>}
          </div>
        )}

        <button type="button" onClick={() => onFetch()} disabled={isLoading} className={clsx(
          'flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] font-semibold rounded transition-colors whitespace-nowrap flex-shrink-0',
          isLoading ? 'bg-bg-e text-tm cursor-not-allowed' : 'bg-warn text-bg hover:bg-warn/80 cursor-pointer',
        )}>
          {isLoading ? <><span className="w-2.5 h-2.5 border-[2px] border-bg/30 border-t-bg rounded-full animate-spin inline-block flex-shrink-0" />FETCHING</> : <><BoltIcon className="w-3 h-3" />FETCH LIVE</>}
        </button>

        {onExport && (
          <div className="relative flex-shrink-0" ref={exportRef}>
            <button type="button" onClick={() => setExportOpen(v => !v)} className="flex items-center gap-1 px-2.5 py-1.5 font-mono text-[10px] text-ts border border-bd bg-bg-c rounded hover:text-tp hover:border-ts transition-colors cursor-pointer whitespace-nowrap">
              <DownloadIcon className="w-3 h-3" /> EXPORT
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-full mt-1 bg-bg-s border border-bd rounded shadow-2xl z-[100] min-w-[180px]">
                {[
                  { label: 'Watchlist CSV', key: 'watchlist-csv', Icon: TableIcon },
                  { label: 'Macro CSV', key: 'macro-csv', Icon: LineChartIcon },
                  { label: 'Snapshot JSON', key: 'snapshot-json', Icon: FileIcon },
                ].map(opt => {
                  const OptIcon = opt.Icon;
                  return (
                    <button key={opt.key} type="button" onClick={() => { onExport(opt.key); setExportOpen(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 font-mono text-[10px] text-ts hover:text-tp hover:bg-bg-h transition-colors cursor-pointer whitespace-nowrap">
                      <OptIcon className="w-3 h-3 flex-shrink-0" />{opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
