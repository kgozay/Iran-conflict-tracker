import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { DownloadIcon, TableIcon, LineChartIcon, FileIcon, MenuIcon } from './Icons.jsx';
import { ShinyText, StarBorder } from '../widgets/Effects.jsx';

/* ── PATCH SUMMARY ─────────────────────────────────────────────────────
 * - Eyebrow line above the title now uses the `mag-eyebrow` class (V4
 *   cover treatment: italic Instrument Serif "— today" instead of small caps).
 * - Title body uses <ShinyText> (FX2) for a slow shine sweep.
 * - "Refresh data" button is wrapped in <StarBorder> (FX8). It keeps the
 *   loading state — when isLoading we render the plain disabled button so
 *   the spinner stays legible and we don't animate around a busy CTA.
 * ──────────────────────────────────────────────────────────────────── */

const PAGE_META = {
  overview:  { kicker: 'Today',   pre: "Today's",      italic: 'transmission' },
  macro:     { kicker: 'Macro',   pre: 'How conflict', italic: 'transmits'    },
  drilldown: { kicker: 'Sectors', pre: 'The',          italic: 'drilldown'    },
};

function SegGroup({ children }) {
  return (
    <div className="flex items-center bg-bg-h border border-bd rounded-lg p-[3px] gap-[2px]">
      {children}
    </div>
  );
}
function SegBtn({ label, active, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className={clsx(
        'px-[13px] py-[6px] text-[12px] font-medium rounded-md transition-colors cursor-pointer select-none',
        active ? 'bg-bd text-tp' : 'text-ts hover:text-tp',
      )}>
      {label}
    </button>
  );
}

export default function TopBar({
  page, status, error, lastFetch, progress,
  onFetch, timeframe, setTimeframe, returnMode, setReturnMode,
  autoRefresh, onExport, dataHealth, onMenuClick,
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

  const meta      = PAGE_META[page] ?? PAGE_META.overview;
  const isLoading = status === 'loading';
  const now       = new Date();
  const dayStr    = now.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const eyebrow   = `${meta.kicker.toLowerCase()} · ${dayStr.toLowerCase()}${isLoading && progress ? ' · ' + progress : ''}`;

  return (
    <header className="bg-black/40 border-b border-bd flex-shrink-0 flex items-center justify-between px-8 py-[22px] gap-4 backdrop-blur-[24px] backdrop-saturate-[160%]">

      {/* ── Left: hamburger + eyebrow + title (magazine cover treatment) ── */}
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={onMenuClick} aria-label="Open menu"
          className="lg:hidden flex-shrink-0 p-1.5 text-ts hover:text-tp transition-colors cursor-pointer">
          <MenuIcon className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="mag-eyebrow">— {eyebrow}</span>
            {dataHealth?.bondIsStatic && (
              <span className="font-mono text-[9px] text-bear border border-bear/30 bg-bear/8 px-[6px] py-[2px] rounded">
                SA 10Y STATIC
              </span>
            )}
          </div>
          {/* FX2 ShinyText sweep on the title */}
          <div className="font-serif text-[32px] text-tp leading-[1.1] tracking-[-0.02em] mt-1">
            <ShinyText text={meta.pre} color="var(--color-tp)" shineColor="#ffffff" speed={3.6}/>
            {' '}
            <span className="italic" style={{ color: 'var(--color-warn)' }}>
              <ShinyText text={meta.italic} color="var(--color-warn)" shineColor="#fff5d6" speed={3.6}/>
            </span>
          </div>
        </div>
      </div>

      {/* ── Right: controls ──────────────────────────────────── */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <SegGroup>
          {['1D', '5D', '20D'].map(tf => (
            <SegBtn key={tf} label={tf} active={timeframe === tf} onClick={() => setTimeframe(tf)} />
          ))}
        </SegGroup>

        <SegGroup>
          {['ABS', 'REL'].map(rm => (
            <SegBtn key={rm} label={rm} active={returnMode === rm} onClick={() => setReturnMode(rm)} />
          ))}
        </SegGroup>

        <div className="w-px h-[22px] bg-bd mx-1" />

        {/* Export dropdown */}
        {onExport && (
          <div className="relative" ref={exportRef}>
            <button type="button" onClick={() => setExportOpen(v => !v)}
              className="flex items-center gap-1.5 px-4 py-[9px] text-[12.5px] font-medium text-ts
                         border border-bd rounded-lg hover:text-tp hover:border-ts transition-colors cursor-pointer">
              <DownloadIcon className="w-3.5 h-3.5" />
              Export
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-full mt-1 glass rounded-xl z-[100] min-w-[180px] py-1">
                {[
                  { label: 'Watchlist CSV',  key: 'watchlist-csv',  Icon: TableIcon     },
                  { label: 'Macro CSV',      key: 'macro-csv',      Icon: LineChartIcon },
                  { label: 'Snapshot JSON',  key: 'snapshot-json',  Icon: FileIcon      },
                ].map(({ label, key, Icon }) => (
                  <button key={key} type="button"
                    onClick={() => { onExport(key); setExportOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-ts
                               hover:text-tp hover:bg-bg-h transition-colors cursor-pointer whitespace-nowrap">
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Refresh data — wrapped in StarBorder when idle, plain when loading */}
        {isLoading ? (
          <button type="button" disabled
            className="flex items-center gap-2 px-[18px] py-[9px] text-[12.5px] font-medium rounded-lg bg-bg-e text-tm cursor-not-allowed">
            <span className="w-3 h-3 border-2 border-tm/30 border-t-tm rounded-full animate-spin inline-block" />
            Refreshing…
          </button>
        ) : (
          <StarBorder color="var(--color-warn)" speed="5s" onClick={() => onFetch()}>
            Refresh data
          </StarBorder>
        )}
      </div>
    </header>
  );
}
