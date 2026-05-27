import React from 'react';
import clsx from 'clsx';
import { XIcon } from './Icons.jsx';

/* ── PATCH SUMMARY ─────────────────────────────────────────────────────
 * Auto-hide sidebar:
 *   - New props from App.jsx: `visible`, `pinned`, `onPinToggle`,
 *     `onMouseEnter`, `onMouseLeave`.
 *   - The desktop `lg:translate-x-0` hardcode is removed — visibility on
 *     desktop is driven by `visible` (mobile drawer || pinned || hovered).
 *   - When pinned, sidebar occupies its 240px slot. When unpinned but
 *     hovered, it overlays the content with a stronger shadow so it reads
 *     as a floating drawer rather than a layout column.
 *   - New pin/unpin button next to the brand. Persists via App.jsx →
 *     localStorage `jse_sidebar_pinned`.
 * Everything else is byte-identical with the original file.
 * ──────────────────────────────────────────────────────────────────── */

const NAV = [
  { id: 'overview',  label: 'Overview',           sub: 'Today at a glance' },
  { id: 'macro',     label: 'Macro Transmission', sub: 'How conflict flows in' },
  { id: 'drilldown', label: 'Sector Drilldown',   sub: 'Per-sector deep dive' },
];

const TONE_TEXT = { bear: 'text-bear', warn: 'text-warn', bull: 'text-bull', neutral: 'text-ts' };
const TONE_BG   = { bear: 'bg-bear',  warn: 'bg-warn',   bull: 'bg-bull',   neutral: 'bg-ts'   };

function PinIcon({ filled }) {
  // Outline = unpinned, filled = pinned. Tilted thumbtack glyph.
  return filled ? (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M14.5 3.5l6 6-3 3-1.5-.5L11 17l-1.5 1.5-4.5-4.5L6.5 12.5l5-5L11 6l3.5-2.5z"/>
      <path d="M9 15l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ) : (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.5 3.5l6 6-3 3-1.5-.5L11 17l-1.5 1.5-4.5-4.5L6.5 12.5l5-5L11 6l3.5-2.5z"/>
      <path d="M9 15l-4 4"/>
    </svg>
  );
}

export default function Sidebar({
  page, setPage, cis, status, lastFetch,
  isOpen, onClose,
  visible, pinned, onPinToggle, onMouseEnter, onMouseLeave,
}) {
  const toneText = TONE_TEXT[cis.regimeClass] ?? TONE_TEXT.neutral;
  const toneBg   = TONE_BG[cis.regimeClass]   ?? TONE_BG.neutral;
  const pct      = Math.max(2, Math.min(98, ((cis.total + 100) / 200) * 100));
  const ts       = lastFetch?.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
  const hasData  = status === 'live' || status === 'cached';

  // `visible` is the unified prop from App.jsx (mobile || pinned || hovered).
  // Fall back to `isOpen` if a caller hasn't been upgraded yet.
  const showing = visible ?? isOpen;

  return (
    <aside
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={clsx(
        'fixed top-0 left-0 bottom-0 w-[240px] bg-bg-s border-r border-bd flex flex-col z-50 backdrop-blur-[24px] backdrop-saturate-[160%]',
        'transition-transform duration-300 ease-in-out',
        showing ? 'translate-x-0' : '-translate-x-full',
        // Hover-overlay state gets a stronger shadow so it reads as a drawer.
        !pinned && showing && 'shadow-[12px_0_40px_-12px_rgba(0,0,0,0.6)]',
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
          <div className="min-w-0 flex-1">
            <div className="font-serif text-[20px] text-tp leading-none tracking-[-0.01em]">
              Conflict <span className="italic text-warn">Watch</span>
            </div>
            <div className="font-mono text-[10.5px] text-tm mt-1 tracking-[0.04em]">JSE · v3.0</div>
          </div>

          {/* PATCH: Pin / unpin toggle — desktop only */}
          {onPinToggle && (
            <button
              type="button"
              onClick={onPinToggle}
              aria-pressed={!!pinned}
              aria-label={pinned ? 'Unpin sidebar (hover-only mode)' : 'Pin sidebar open'}
              title={pinned ? 'Click to unpin (sidebar will auto-hide)' : 'Click to pin sidebar open'}
              className={clsx(
                'hidden lg:inline-flex items-center justify-center w-7 h-7 rounded-md border transition-colors cursor-pointer flex-shrink-0',
                pinned
                  ? 'text-warn border-warn/40 bg-warn/8 hover:bg-warn/12'
                  : 'text-ts border-bd bg-bg-h hover:text-tp hover:border-ts',
              )}>
              <PinIcon filled={!!pinned} />
            </button>
          )}
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
      <nav className="py-3 flex-1">
        {NAV.map(({ id, label, sub }) => (
          <button key={id}
            onClick={() => { setPage(id); onClose?.(); }}
            aria-current={page === id ? 'page' : undefined}
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
