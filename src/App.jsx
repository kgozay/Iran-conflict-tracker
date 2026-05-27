import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { SECTOR_ORDER } from './data/stocks.js';
import { computeCIS }    from './utils/scoring.js';
import { computeAlerts } from './utils/alerts.js';
import { buildDataHealth } from './utils/dataQuality.js';
import { exportWatchlistCSV, exportMacroCSV, exportSnapshotJSON } from './utils/export.js';
import { useMarketData }  from './hooks/useMarketData.js';
import { useAutoRefresh } from './hooks/useAutoRefresh.js';
import { useToast }       from './hooks/useToast.js';
import { useSparklines }  from './hooks/useSparklines.js';
import { useNews }        from './hooks/useNews.js';
import Sidebar            from './components/Sidebar.jsx';
import TopBar             from './components/TopBar.jsx';
import LoadingOverlay     from './components/LoadingOverlay.jsx';
import Toast              from './components/Toast.jsx';
import Overview           from './pages/Overview.jsx';
import MacroTransmission  from './pages/MacroTransmission.jsx';
import SectorDrilldown    from './pages/SectorDrilldown.jsx';

/* ── PATCH SUMMARY ─────────────────────────────────────────────────────
 * Adds the auto-hide sidebar:
 *   - `sidebarPinned` state (persisted to localStorage `jse_sidebar_pinned`,
 *      defaults to UNPINNED for max reading real estate).
 *   - `sidebarHovered` state — controlled by an invisible 14px-wide edge
 *      trigger on the left of the viewport (desktop only) and by the
 *      sidebar's own onMouseLeave.
 *   - Sidebar is shown when: mobile drawer open, OR pinned, OR hovered.
 *   - Main content's left margin transitions between 0 and 240px based on
 *      `sidebarPinned` (the floating-overlay state doesn't shift content).
 *   - `Sidebar` now receives `visible`, `pinned`, `onPinToggle`,
 *      `onMouseEnter`, `onMouseLeave` and handles its own translate.
 * Everything else is byte-identical with the original file.
 * ──────────────────────────────────────────────────────────────────── */

function deriveSectors(stocks) {
  const live = stocks.filter(s => s.isLive && s.changePct != null);
  const sectors = {};

  for (const sector of SECTOR_ORDER) {
    const ss = live.filter(s => s.sector === sector);
    if (!ss.length) continue;
    const avg = ss.reduce((a, s) => a + s.changePct, 0) / ss.length;
    sectors[sector] = { name: sector, chg: +avg.toFixed(2), rel: null };
  }

  if (live.length > 0) {
    const mktAvg = live.reduce((a, s) => a + s.changePct, 0) / live.length;
    sectors.top40 = { name: 'JSE Market Avg', chg: +mktAvg.toFixed(2), rel: 0 };
    for (const key of Object.keys(sectors)) {
      if (key !== 'top40') {
        sectors[key].rel = +(sectors[key].chg - mktAvg).toFixed(2);
      }
    }
  } else {
    sectors.top40 = { name: 'JSE Market Avg', chg: null, rel: 0 };
  }

  return sectors;
}

const ALL_SPARK_SYMBOLS = [
  'BZ=F','GC=F','PL=F','PA=F','USDZAR=X','MTF=F','^ZA10Y',
  'GFI.JO','ANG.JO','IMP.JO','AMS.JO','SOL.JO',
  'FSR.JO','SBK.JO','CPI.JO','SHP.JO','NPN.JO',
  'PRX.JO','CFR.JO','AGL.JO','MTN.JO','SSW.JO',
];

const EMPTY_CIS = {
  total: 0, regime: 'NO DATA', regimeClass: 'neutral',
  components: {
    macro: { score: 0, weight: 0.40, contrib: 0, parts: [] },
    jse:   { score: 0, weight: 0.35, contrib: 0, parts: [] },
    conf:  { score: 0, weight: 0.25, contrib: 0, parts: [] },
  },
  drivers: [],
  methodology: 'Heuristic score: Macro 40%, JSE equal-weight basket reaction 35%, confirmation signals 25%.',
};

export default function App() {
  const [page,        setPage]       = useState('overview');
  const [timeframe,   setTimeframe]  = useState('1D');
  const [returnMode,  setReturnMode] = useState('ABS');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme,       setTheme]      = useState(() => localStorage.getItem('jse_theme') ?? 'dark');

  /* ── PATCH: sidebar auto-hide state ────────────────────────────── */
  const [sidebarPinned, setSidebarPinned] = useState(
    () => localStorage.getItem('jse_sidebar_pinned') === 'true'
  );
  const [sidebarHovered, setSidebarHovered] = useState(false);

  useEffect(() => {
    localStorage.setItem('jse_sidebar_pinned', String(sidebarPinned));
  }, [sidebarPinned]);

  // Desktop hover-reveal closes itself when pointer leaves the sidebar.
  // Mobile drawer is independent (sidebarOpen).
  const sidebarVisible = sidebarOpen || sidebarPinned || sidebarHovered;
  /* ────────────────────────────────────────────────────────────────── */

  useEffect(() => {
    document.documentElement.dataset.theme = theme === 'light' ? 'light' : '';
    localStorage.setItem('jse_theme', theme);
  }, [theme]);

  const {
    assets, stocks, r2035History, history,
    status, error, lastFetch, progress,
    fetchLive, initFromCache, clearError,
  } = useMarketData();

  const { sparklines, sparkLoading, fetchSparklines } = useSparklines();
  const { news, newsLoading, newsError, lastFetched: newsLastFetched, refetchNews } = useNews();

  const { toasts, addToast, removeToast } = useToast();

  const prevStatusRef = useRef(status);

  useEffect(() => {
    const cacheState = initFromCache();
    if (cacheState === 'empty') {
      fetchLive(false);
    } else if (cacheState === 'stale') {
      setTimeout(() => fetchLive(true), 600);
    }
    fetchSparklines(ALL_SPARK_SYMBOLS);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sectors = useMemo(() => deriveSectors(stocks), [stocks]);
  const hasData = status === 'live' || status === 'cached';
  const dataHealth = useMemo(
    () => buildDataHealth({ assets, stocks, status, lastFetch, sparklines }),
    [assets, stocks, status, lastFetch, sparklines]
  );

  const cisInput = useMemo(() => ({
    brentChg:       assets.brent?.changePct      ?? 0,
    usdZarChg:      assets.usdZar?.changePct     ?? 0,
    goldChg:        assets.gold?.changePct       ?? 0,
    r2035Chg:       assets.r2035?.isStale ? null : (assets.r2035?.change ?? 0),
    includeBond:    !assets.r2035?.isStale,
    top40Chg:       sectors.top40?.chg           ?? 0,
    minersChg:      sectors['Gold Miners']?.chg  ?? 0,
    energyChg:      sectors.Energy?.chg          ?? 0,
    banksChg:       sectors.Banks?.chg           ?? 0,
    retailersChg:   sectors.Retailers?.chg       ?? 0,
    industrialsChg: sectors.Industrials?.chg     ?? 0,
  }), [assets, sectors]);

  const cis    = useMemo(() => hasData ? computeCIS(cisInput) : EMPTY_CIS, [hasData, cisInput]);
  const alerts = useMemo(
    () => hasData ? computeAlerts({ assets, sectors, stocks }) : [],
    [hasData, assets, sectors, stocks]
  );

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const prevRegimeRef = useRef(localStorage.getItem('jse_cw_last_notif_regime'));

  useEffect(() => {
    if (status === 'live' && hasData && cis.regime && cis.regime !== 'NO DATA') {
      const newRegime = cis.regime;
      const prevRegime = prevRegimeRef.current;

      if (prevRegime && newRegime !== prevRegime && Notification.permission === 'granted') {
        new Notification('Iran Conflict Tracker', {
          body: `Market regime changed to ${newRegime} (CIS: ${cis.total.toFixed(1)})`,
          icon: '/favicon.ico',
        });
      }

      if (newRegime !== prevRegime) {
        localStorage.setItem('jse_cw_last_notif_regime', newRegime);
        prevRegimeRef.current = newRegime;
      }
    }
  }, [cis.regime, cis.total, status, hasData]);

  const handleFetch = useCallback(async (silentParam) => {
    const isSilent = silentParam === true;
    const result = await fetchLive(isSilent);
    if (result?.success) {
      const src = result.assets?.r2035?.source;
      const bondLabel = src ? ` · bond via ${src}` : '';
      addToast(`Updated · ${new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })} SAST${bondLabel}`, 'success');
      fetchSparklines(ALL_SPARK_SYMBOLS);
    } else if (result?.error && !isSilent) {
      addToast(result.error, 'error', 6000);
    }
  }, [fetchLive, addToast, fetchSparklines]);

  const autoRefresh = useAutoRefresh(handleFetch);

  const handleExport = useCallback((key) => {
    if (key === 'watchlist-csv') exportWatchlistCSV(stocks, timeframe, returnMode);
    if (key === 'macro-csv')     exportMacroCSV(assets);
    if (key === 'snapshot-json') exportSnapshotJSON(assets, stocks, sectors, cis, alerts);
    addToast('File downloaded', 'info', 2000);
  }, [stocks, assets, sectors, cis, alerts, timeframe, returnMode, addToast]);

  const shared = {
    assets, stocks, sectors, cis, alerts, r2035History, history,
    timeframe, returnMode, status, hasData, dataHealth, lastFetch,
    onFetch: handleFetch,
    sparklines, sparkLoading,
    news, newsLoading, newsError, newsLastFetched, refetchNews,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-tp font-sans">
      <Toast toasts={toasts} onRemove={removeToast} />
      <LoadingOverlay status={status} progress={progress} error={error} onDismiss={clearError} />

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden"
             onClick={() => setSidebarOpen(false)} />
      )}

      {/* PATCH: Desktop edge trigger — invisible 14px strip on the left
          edge that reveals the sidebar on hover. Hidden when pinned and
          hidden on mobile (mobile uses the hamburger). */}
      {!sidebarPinned && (
        <div
          onMouseEnter={() => setSidebarHovered(true)}
          aria-hidden="true"
          className="hidden lg:block fixed top-0 left-0 bottom-0 w-[14px] z-40"
        />
      )}

      <Sidebar
        page={page} setPage={setPage}
        cis={cis} status={status} lastFetch={lastFetch}
        isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}
        visible={sidebarVisible}
        pinned={sidebarPinned}
        onPinToggle={() => setSidebarPinned(p => !p)}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
      />

      {/* PATCH: content margin animates between 0 and 240px based on
          `sidebarPinned`. Hover-reveals overlay the content instead of
          shifting it. Mobile is unchanged. */}
      <div className={
        'flex flex-col flex-1 overflow-hidden transition-[margin] duration-300 ease-out ml-0 ' +
        (sidebarPinned ? 'lg:ml-[240px]' : 'lg:ml-0')
      }>
        <TopBar
          page={page}
          status={status} error={error} lastFetch={lastFetch} progress={progress}
          onFetch={handleFetch}
          timeframe={timeframe}   setTimeframe={setTimeframe}
          returnMode={returnMode} setReturnMode={setReturnMode}
          autoRefresh={autoRefresh}
          onExport={handleExport}
          dataHealth={dataHealth}
          onMenuClick={() => setSidebarOpen(true)}
          theme={theme} setTheme={setTheme}
        />
        <main className="flex-1 overflow-y-auto">
          {page === 'overview'  && <Overview          {...shared} />}
          {page === 'macro'     && <MacroTransmission {...shared} />}
          {page === 'drilldown' && <SectorDrilldown   {...shared} />}
        </main>
      </div>
    </div>
  );
}
