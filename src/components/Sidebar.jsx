import React from 'react';
import clsx from 'clsx';
import { DotIcon, RefreshIcon, ErrorIcon } from './Icons.jsx';

const NAV = [
  { id:'overview',  label:'Overview',           icon:GridIcon },
  { id:'macro',     label:'Macro Transmission', icon:WaveIcon },
  { id:'drilldown', label:'Sector Drilldown',   icon:BarIcon  },
];

function GridIcon() {
  return <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>;
}
function WaveIcon() {
  return <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
}
function BarIcon() {
  return <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
}

const CHIP = {
  bear:    { border:'border-bear', text:'text-bear', bg:'bg-bear-d' },
  warn:    { border:'border-warn', text:'text-warn', bg:'bg-warn-d' },
  neutral: { border:'border-ts',   text:'text-ts',   bg:'bg-bg-e'   },
  bull:    { border:'border-bull', text:'text-bull', bg:'bg-bull-d' },
};
const BAR_FILL = { bear:'bg-bear', warn:'bg-warn', neutral:'bg-ts', bull:'bg-bull' };

function StatusRow({ status, lastFetch }) {
  const ts = lastFetch?.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });

  if (status === 'loading') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-[8px] text-warn">
        <RefreshIcon className="w-2.5 h-2.5 animate-spin" /> FETCHING…
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-[8px] text-bear">
        <ErrorIcon className="w-2.5 h-2.5" /> ERROR
      </span>
    );
  }
  if (status === 'live') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-[8px] text-bull">
        <DotIcon className="w-1.5 h-1.5 animate-pulse2" /> LIVE · {ts}
      </span>
    );
  }
  if (status === 'cached') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-[8px] text-warn">
        <DotIcon className="w-1.5 h-1.5" /> CACHED · {ts}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[8px] text-ts">
      <DotIcon className="w-1.5 h-1.5" /> NO DATA YET
    </span>
  );
}

export default function Sidebar({ page, setPage, cis, status, lastFetch }) {
  const rc  = CHIP[cis.regimeClass]     ?? CHIP.neutral;
  const bar = BAR_FILL[cis.regimeClass] ?? BAR_FILL.neutral;
  const pct = Math.max(2, Math.min(98, ((cis.total + 100) / 200) * 100));

  const hasData = status === 'live' || status === 'cached';

  return (
    <aside className="fixed top-0 left-0 bottom-0 w-[220px] bg-bg-s border-r border-bd flex flex-col z-50">
      <div className="px-[18px] py-[18px] pb-3.5 border-b border-bd-x">
        <div className="font-display text-[21px] tracking-[1.5px] text-tp leading-none">JSE CONFLICT WATCH</div>
        <div className="font-mono text-[8px] text-ts tracking-[2.5px] mt-1.5">MARKET INTELLIGENCE · V3.0</div>
      </div>

      <div className={clsx('mx-4 my-3.5 p-3 rounded border text-center', rc.border, rc.bg)}>
        <div className="font-mono text-[8px] tracking-[2px] text-ts mb-1.5">CONFLICT REGIME</div>
        <div className={clsx('font-display text-[18px] tracking-[1.5px] leading-none', rc.text)}>
          {!hasData ? 'NO DATA' : cis.regime}
        </div>
        <div className={clsx('font-display text-[40px] leading-none tracking-[1px] mt-0.5', rc.text)}>
          {!hasData ? '—' : cis.total}
        </div>
        <div className="font-mono text-[8px] text-ts mt-1">CONFLICT IMPACT SCORE</div>
      </div>

      <div className="px-4 pb-2.5 flex items-center gap-2">
        <span className="font-mono text-[8px] text-tm">-100</span>
        <div className="flex-1 h-[3px] bg-bg-e rounded-full overflow-hidden relative">
          <div className="absolute top-0 left-1/2 w-px h-full bg-white/20" />
          <div className={clsx('h-full rounded-full transition-[width] duration-700', bar)}
            style={{ width:`${pct}%` }} />
        </div>
        <span className="font-mono text-[8px] text-tm">+100</span>
      </div>

      <nav className="py-1.5 flex-1">
        {NAV.map(({ id, label, icon:Icon }) => (
          <button key={id} onClick={() => setPage(id)}
            className={clsx(
              'w-full flex items-center gap-2.5 px-[18px] py-2.5 text-[12.5px] font-medium border-l-2 transition-all text-left cursor-pointer',
              page === id
                ? 'text-tp border-warn bg-bg-c'
                : 'text-ts border-transparent hover:text-tp hover:bg-bg-c'
            )}>
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="px-4 py-2.5 border-t border-bd-x">
        <div className="mb-1">
          <StatusRow status={status} lastFetch={lastFetch} />
        </div>
        <div className="font-mono text-[8px] text-tm">SA 10Y via Stooq / Yahoo</div>
        <div className="font-mono text-[7px] text-tm mt-0.5">Govt yield proxy · not exact R2035</div>
      </div>
    </aside>
  );
}
