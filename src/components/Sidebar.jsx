import React from 'react';
import clsx from 'clsx';
import { XIcon } from './Icons.jsx';

const NAV = [
  { id: 'overview',  label: 'Overview',           sub: 'Today at a glance' },
  { id: 'macro',     label: 'Macro Transmission', sub: 'How conflict flows in' },
  { id: 'drilldown', label: 'Sector Drilldown',   sub: 'Per-sector deep dive' },
];

const TONE_TEXT = { bear: 'text-bear', warn: 'text-warn', bull: 'text-bull', neutral: 'text-ts' };
const TONE_BG   = { bear: 'bg-bear',  warn: 'bg-warn',   bull: 'bg-bull',   neutral: 'bg-ts'   };

export default function Sidebar({ page, setPage, cis, status, lastFetch, isOpen, onClose }) {
  const toneText = TONE_TEXT[cis.regimeClass] ?? TONE_TEXT.neutral;
  const toneBg   = TONE_BG[cis.regimeClass]   ?? TONE_BG.neutral;
  const pct      = Math.max(2, Math.min(98, ((cis.total + 100) / 200) * 100));
  const ts       = lastFetch?.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
  const hasData  = status === 'live' || status === 'cached';

  return (
    <aside className={clsx(
      'fixed top-0 left-0 bottom-0 w-[240px] bg-bg-c border-r border-bd flex flex-col z-50',
      'transition-transform duration-300 ease-in-out lg:translate-x-0',
      isOpen ? 'translate-x-0' : '-translate-x-full',
    )}>

      {/* Mobile close button */}
      <button onClick={onClose} aria-label="Close menu"
        className="lg:hidden absolute top-3 right-3 p-1 text-ts hover:text-tp transition-colors cursor-pointer z-10">
        <XIcon className="w-4 h-4" />
      </button>

      {/* ── Brand block ─────────────────────────────────────────── */}
      <div className="px-[22px] py-[22px] pb-[18px] border-b border-bd">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-paper flex items-center justify-center flex-shrink-0
                          font-serif italic text-[19px] leading-none" style={{ color: 'var(--color-ink)' }}>
            jc
          </div>
          <div>
            <div className="font-serif text-[20px] text-tp leading-none tracking-[-0.01em]">
              Conflict <span className="italic text-warn">Watch</span>
            </div>
            <div className="font-mono text-[10.5px] text-tm mt-1 tracking-[0.04em]">JSE · v3.0</div>
          </div>
        </div>
      </div>

      {/* ── CIS regime mini-panel ───────────────────────────────── */}
      <div className="px-[22px] py-5 border-b border-bd">
        <div className="text-[10.5px] font-medium text-tm tracking-[0.08em] uppercase">
          Conflict regime
        </div>
        <div className={clsx('font-serif italic text-[18px] leading-[1.1] mt-1.5', toneText)}>
          {!hasData ? 'no data' : cis.regime.toLowerCase()}
        </div>
        <div className="flex items-baseline gap-2 mt-2">
          <span className={clsx('font-serif text-[44px] leading-none tracking-[-0.03em]', toneText)}>
            {!hasData ? '—' : cis.total}
          </span>
          {hasData && cis.trendDelta != null && (
            <span className="font-mono text-[11px] font-semibold text-bear">
              ↓ {cis.trendDelta}
            </span>
          )}
        </div>
        {/* Mini slider */}
        <div className="relative h-[4px] bg-bg-h rounded-full mt-3">
          <div className="absolute left-1/2 top-[-1px] w-px h-[6px] bg-bd-x" />
          <div
            className={clsx('absolute top-0 left-0 h-full rounded-full transition-[width] duration-700', toneBg)}
            style={{ width: `${pct}%`, opacity: 0.85 }}
          />
        </div>
        <div className="flex justify-between font-mono text-[9.5px] text-tx mt-[5px]">
          <span>-100</span><span>0</span><span>+100</span>
        </div>
      </div>

      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav className="py-3 flex-1">
        {NAV.map(({ id, label, sub }) => (
          <button key={id}
            onClick={() => { setPage(id); onClose?.(); }}
            className={clsx(
              'w-full text-left px-[22px] py-3 border-l-[3px] transition-colors cursor-pointer',
              page === id ? 'border-warn bg-bg-h' : 'border-transparent hover:bg-bg-h',
            )}>
            <div className={clsx('font-serif text-[17px] leading-[1.15]', page === id ? 'text-tp' : 'text-ts')}>
              {label}
            </div>
            <div className={clsx('text-[11px] mt-[3px]', page === id ? 'text-ts' : 'text-tm')}>
              {sub}
            </div>
          </button>
        ))}
      </nav>

      {/* ── Status footer ───────────────────────────────────────── */}
      <div className="px-[22px] py-4 border-t border-bd">
        <div className="flex items-center gap-[7px] text-[11px] font-medium text-bull">
          <span
            className="w-[6px] h-[6px] rounded-full bg-bull animate-pulse2 flex-shrink-0"
            style={{ boxShadow: '0 0 8px rgba(52,211,153,0.55)' }}
          />
          {status === 'loading'
            ? 'Fetching…'
            : status === 'error'
              ? <span className="text-bear">Error</span>
              : ts ? `Live · ${ts} SAST` : 'Connecting…'}
        </div>
        <div className="font-mono text-[10.5px] text-tm mt-[6px] leading-[1.5]">
          SA 10Y via Stooq · proxy, not exact R2035
        </div>
      </div>
    </aside>
  );
}
