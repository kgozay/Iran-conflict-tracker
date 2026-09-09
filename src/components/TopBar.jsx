import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { DownloadIcon, TableIcon, LineChartIcon, FileIcon, MenuIcon } from './Icons.jsx';
import { StarBorder } from '../widgets/Effects.jsx';

const PAGE_META = {
  overview:  { kicker: 'Today',   pre: "Today's",      italic: 'transmission' },
  macro:     { kicker: 'Macro',   pre: 'How conflict', italic: 'transmits'    },
  drilldown: { kicker: 'Sectors', pre: 'The',          italic: 'drilldown'    },
};

function SegGroup({ children }) {
  return (
    <div className="flex min-w-0 items-center bg-bg-h border border-bd rounded-lg p-[3px] gap-[2px]">
      {children}
    </div>
  );
}
function SegBtn({ label, active, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={clsx(
        'flex-1 min-w-11 min-h-11 lg:min-h-0 px-3 lg:px-[13px] py-[6px] text-[12px] font-medium rounded-md transition-colors cursor-pointer select-none',
        active ? 'bg-bd text-tp' : 'text-ts hover:text-tp',
      )}>
      {label}
    </button>
  );
}

export default function TopBar({
  page, status, progress,
  onFetch, timeframe, setTimeframe, returnMode, setReturnMode,
  onExport, onMenuClick, menuOpen, menuButtonRef,
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
  const shortDay  = now.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
  const loadingText = isLoading && progress ? ` · ${progress}` : '';

  return (
    <header className="bg-bg/95 border-b border-bd flex-shrink-0 flex flex-col lg:flex-row lg:items-center lg:justify-between px-4 sm:px-6 lg:px-8 py-4 lg:py-[18px] gap-3 lg:gap-4 backdrop-blur-[24px] backdrop-saturate-[160%]">

      {/* ── Left: hamburger + eyebrow + title (magazine cover treatment) ── */}
      <div className="flex items-center gap-2.5 min-w-0 w-full lg:w-auto">
        <button ref={menuButtonRef} onClick={onMenuClick} aria-label="Open menu" aria-expanded={menuOpen} aria-controls="primary-sidebar"
          className="lg:hidden flex-shrink-0 w-11 h-11 inline-flex items-center justify-center text-ts hover:text-tp transition-colors cursor-pointer rounded-lg">
          <MenuIcon className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="mag-eyebrow whitespace-nowrap">
              <span className="sm:hidden">{meta.kicker} · {shortDay.toLowerCase()}</span>
              <span className="hidden sm:inline">{meta.kicker.toLowerCase()} · {dayStr.toLowerCase()}{loadingText}</span>
            </span>
          </div>
          <h1 className="font-serif text-[28px] sm:text-[32px] text-tp leading-[1.05] tracking-[-0.02em] mt-1 whitespace-nowrap">
            <span>{meta.pre}</span>
            {' '}
            <span className="italic" style={{ color: 'var(--color-warn)' }}>
              {meta.italic}
            </span>
          </h1>
        </div>
      </div>

      {/* ── Right: controls ──────────────────────────────────── */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] sm:flex sm:items-center gap-2 lg:gap-2.5 w-full lg:w-auto flex-shrink-0">
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

        <div className="hidden lg:block w-px h-[22px] bg-bd mx-1" />

        {/* Export dropdown */}
        {onExport && (
          <div className="relative" ref={exportRef}>
            <button type="button" onClick={() => setExportOpen(v => !v)}
              aria-expanded={exportOpen} aria-haspopup="menu"
              className="w-full min-h-11 lg:min-h-0 flex items-center justify-center gap-1.5 px-4 py-[9px] text-[12.5px] font-medium text-ts
                         border border-bd rounded-lg hover:text-tp hover:border-ts transition-colors cursor-pointer">
              <DownloadIcon className="w-3.5 h-3.5" />
              Export
            </button>
            {exportOpen && (
              <div role="menu" className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1 glass rounded-xl z-[100] min-w-[190px] py-1">
                {[
                  { label: 'Watchlist CSV',  key: 'watchlist-csv',  Icon: TableIcon     },
                  { label: 'Macro CSV',      key: 'macro-csv',      Icon: LineChartIcon },
                  { label: 'Snapshot JSON',  key: 'snapshot-json',  Icon: FileIcon      },
                ].map(({ label, key, Icon }) => (
                  <button key={key} type="button"
                    role="menuitem"
                    onClick={() => { onExport(key); setExportOpen(false); }}
                    className="w-full min-h-11 flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-ts
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
            className="min-h-11 w-full flex items-center justify-center gap-2 px-[18px] py-[9px] text-[12.5px] font-medium rounded-lg bg-bg-e text-tm cursor-not-allowed">
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
