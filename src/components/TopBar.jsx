import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { DownloadIcon, TableIcon, LineChartIcon, FileIcon, MenuIcon, RefreshIcon } from './Icons.jsx';

const PAGE_META = {
  overview:  { kicker: 'Today',   pre: "Today's",      italic: 'transmission' },
  macro:     { kicker: 'Macro',   pre: 'How conflict', italic: 'transmits'    },
  drilldown: { kicker: 'Sectors', pre: 'The',          italic: 'drilldown'    },
};

function PeriodSelect({ value, onChange }) {
  return (
    <label className="min-h-11 inline-flex items-center gap-2.5 px-3.5 border border-bd rounded-lg text-[12px] text-tm hover:border-ts transition-colors">
      <span>Period</span>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        aria-label="Performance period"
        className="bg-transparent text-[12.5px] font-semibold text-tp outline-none cursor-pointer"
      >
        <option value="1D">1 day</option>
        <option value="5D">5 days</option>
        <option value="20D">20 days</option>
      </select>
    </label>
  );
}

function RefreshButton({ isLoading, progress, onFetch }) {
  return (
    <button
      type="button"
      disabled={isLoading}
      onClick={() => onFetch()}
      className={clsx(
        'min-h-11 inline-flex items-center justify-center gap-2 px-4 py-[9px] text-[13px] font-semibold rounded-lg transition-colors',
        isLoading
          ? 'bg-bg-e text-tm cursor-not-allowed'
          : 'bg-paper text-[var(--color-ink)] hover:opacity-90 cursor-pointer',
      )}
    >
      {isLoading ? (
        <span className="w-3.5 h-3.5 border-2 border-tm/30 border-t-tm rounded-full animate-spin" />
      ) : (
        <RefreshIcon className="w-3.5 h-3.5" />
      )}
      <span>{isLoading ? (progress || 'Refreshing data') : 'Refresh data'}</span>
    </button>
  );
}

export default function TopBar({
  page, status, progress,
  onFetch, timeframe, setTimeframe,
  onExport, onMenuClick, menuOpen, sidebarCollapsed, menuButtonRef,
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
        <button
          ref={menuButtonRef}
          type="button"
          onClick={onMenuClick}
          aria-label={menuOpen ? 'Hide navigation' : 'Show navigation'}
          aria-expanded={menuOpen}
          aria-controls="primary-sidebar"
          className="lg:hidden flex-shrink-0 w-11 h-11 inline-flex items-center justify-center text-ts hover:text-tp hover:bg-bg-h transition-colors cursor-pointer rounded-lg"
        >
          <MenuIcon className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={onMenuClick}
          aria-label={sidebarCollapsed ? 'Show navigation' : 'Hide navigation'}
          aria-expanded={!sidebarCollapsed}
          aria-controls="primary-sidebar"
          className="hidden lg:inline-flex flex-shrink-0 w-11 h-11 items-center justify-center text-ts hover:text-tp hover:bg-bg-h transition-colors cursor-pointer rounded-lg"
        >
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
      <div className="w-full lg:w-auto flex-shrink-0 flex flex-wrap items-center gap-2 lg:gap-2.5">
        <PeriodSelect value={timeframe} onChange={setTimeframe} />

        {/* Export dropdown */}
        {onExport && (
          <div className="relative" ref={exportRef}>
            <button type="button" onClick={() => setExportOpen(v => !v)}
              aria-expanded={exportOpen} aria-haspopup="menu"
              aria-label="Export data"
              className="w-11 sm:w-auto min-h-11 lg:min-h-0 flex items-center justify-center gap-1.5 px-0 sm:px-4 py-[9px] text-[12.5px] font-medium text-ts
                         border border-bd rounded-lg hover:text-tp hover:border-ts transition-colors cursor-pointer">
              <DownloadIcon className="w-3.5 h-3.5" />
              <span className="sr-only sm:not-sr-only">Export</span>
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

        <RefreshButton isLoading={isLoading} progress={progress} onFetch={onFetch} />
      </div>
    </header>
  );
}
