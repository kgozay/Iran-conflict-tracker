import React, { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { XIcon } from './Icons.jsx';

const NAV = [
  { id: 'overview',  label: 'Overview',           sub: 'Today at a glance' },
  { id: 'macro',     label: 'Macro Transmission', sub: 'How conflict flows in' },
  { id: 'drilldown', label: 'Sector Drilldown',   sub: 'Per-sector deep dive' },
];

const TONE_TEXT = { bear: 'text-bear', warn: 'text-warn', bull: 'text-bull', neutral: 'text-ts' };
const TONE_BG   = { bear: 'bg-bear',  warn: 'bg-warn',   bull: 'bg-bull',   neutral: 'bg-ts'   };

export default function Sidebar({
  page, setPage, cis, status, lastFetch,
  isOpen, onClose,
  theme, setTheme,
}) {
  const closeRef = useRef(null);
  const sidebarRef = useRef(null);
  const toneText = TONE_TEXT[cis.regimeClass] ?? TONE_TEXT.neutral;
  const toneBg   = TONE_BG[cis.regimeClass]   ?? TONE_BG.neutral;
  const pct      = Math.max(2, Math.min(98, ((cis.total + 100) / 200) * 100));
  const ts       = lastFetch?.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
  const hasData  = status === 'live' || status === 'cached';

  useEffect(() => {
    if (!isOpen) return undefined;
    closeRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
      if (event.key === 'Tab') {
        const focusable = [...(sidebarRef.current?.querySelectorAll(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        ) ?? [])];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <aside
      id="primary-sidebar"
      ref={sidebarRef}
      aria-label="Primary navigation"
      className={clsx(
        'fixed top-0 left-0 bottom-0 w-[min(300px,86vw)] lg:w-[240px] bg-bg-s border-r border-bd flex flex-col z-50 backdrop-blur-[24px] backdrop-saturate-[160%]',
        'transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0',
        isOpen && 'shadow-[12px_0_40px_-12px_rgba(0,0,0,0.6)] lg:shadow-none',
      )}>

      {/* Mobile close button */}
      <button ref={closeRef} onClick={onClose} aria-label="Close menu"
        className="lg:hidden absolute top-2 right-2 w-11 h-11 inline-flex items-center justify-center text-ts hover:text-tp transition-colors cursor-pointer z-10 rounded-lg">
        <XIcon className="w-4 h-4" />
      </button>

      {/* ── Brand block ─────────────────────────────────────────── */}
      <div className="px-[22px] py-[22px] pb-[18px] border-b border-bd">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-paper flex items-center justify-center flex-shrink-0
                          font-serif italic text-[19px] leading-none" style={{ color: 'var(--color-ink)' }}>
            jc
          </div>
          <div className="min-w-0 flex-1">
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
      <nav aria-label="Dashboard sections" className="py-3 px-3 flex-1">
        {NAV.map(({ id, label, sub }) => (
          <button key={id}
            onClick={() => { setPage(id); onClose?.(); }}
            aria-current={page === id ? 'page' : undefined}
            className={clsx(
              'w-full min-h-14 text-left px-3 py-2.5 border rounded-lg transition-colors cursor-pointer',
              page === id ? 'border-bd-x bg-bg-h' : 'border-transparent hover:bg-bg-h hover:border-bd',
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

      {/* ── Theme Switcher ───────────────────────────────────────── */}
      <div className="px-[22px] py-3.5 border-t border-bd flex items-center justify-between">
        <span className="text-[10.5px] font-medium text-tm tracking-[0.08em] uppercase select-none">Theme</span>
        <button
          type="button"
          onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          className="flex items-center gap-1.5 min-h-11 px-3 py-[6px] text-[11.5px] font-medium text-ts border border-bd rounded-lg hover:text-tp hover:border-ts transition-colors cursor-pointer"
        >
          {theme === 'light' ? (
            <>
              {/* Sun Icon */}
              <svg className="w-3.5 h-3.5 text-warn" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
              <span>Ivory</span>
            </>
          ) : (
            <>
              {/* Moon Icon */}
              <svg className="w-3.5 h-3.5 text-warn" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
              <span>Midnight</span>
            </>
          )}
        </button>
      </div>

      {/* ── Status footer ───────────────────────────────────────── */}
      <div className="px-[22px] py-4 border-t border-bd">
        <div aria-live="polite" className="flex items-center gap-[7px] text-[11px] font-medium text-bull">
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
          SA 10Y: monthly proxy, not the exact R2035 yield
        </div>
      </div>
    </aside>
  );
}
