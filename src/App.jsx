import React, { Suspense, lazy, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import clsx from 'clsx';
import { JSE_STOCKS } from './data/stocks.js';
import { deriveSectors } from './utils/sectors.js';
import { mergeFundamentals } from './utils/fundamentals.js';
import { computeCIS }    from './utils/scoring.js';
import { buildCISInput } from './utils/cisInput.js';
import { computeAlerts } from './utils/alerts.js';
import { buildDataHealth } from './utils/dataQuality.js';
import { exportWatchlistCSV, exportMacroCSV, exportSnapshotJSON, exportCISHistoryCSV } from './utils/export.js';
import { useMarketData }  from './hooks/useMarketData.js';
import { useToast }       from './hooks/useToast.js';
import { useSparklines }  from './hooks/useSparklines.js';
import { useCISHistory }  from './hooks/useCISHistory.js';
import { useFundamentals } from './hooks/useFundamentals.js';
import { useNotifications } from './hooks/useNotifications.js';
import Sidebar            from './components/Sidebar.jsx';
import TopBar             from './components/TopBar.jsx';
import LoadingOverlay     from './components/LoadingOverlay.jsx';
import Toast              from './components/Toast.jsx';

const Overview = lazy(() => import('./pages/Overview.jsx'));
const MacroTransmission = lazy(() => import('./pages/MacroTransmission.jsx'));
const SectorDrilldown = lazy(() => import('./pages/SectorDrilldown.jsx'));

function PageFallback() {
  return <div role="status" className="p-8 text-[13px] text-tm">Loading dashboard view…</div>;
}

const ALL_SPARK_SYMBOLS = [
  'BZ=F','GC=F','PL=F','PA=F','USDZAR=X','MTF=F','^TNX',
  'GFI.JO','ANG.JO','IMP.JO','VAL.JO','SOL.JO',
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
  methodology: 'Heuristic score: macro markets 40%, equal-weight JSE watchlist reaction 35%, confirmation signals 25%.',
};

export default function App() {
  const [page,        setPage]       = useState('overview');
  const [timeframe,   setTimeframe]  = useState('1D');
  const [drillSector, setDrillSector] = useState('All');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem('jse_sidebar_collapsed') === 'true'
  );
  const [theme,       setTheme]      = useState(() => localStorage.getItem('jse_theme') ?? 'dark');
  const menuButtonRef = useRef(null);
  const contentRef = useRef(null);
  const startupRef = useRef(false);

  const {
    history: cisHistory, chartData: cisChartData, addReading: addCisReading,
    syncServer: syncCisServer, serverStatus: cisServerStatus,
  } = useCISHistory();

  /* ── Navigate wrapper with View Transitions API fallback ── */
  const navigateTo = useCallback((newPage) => {
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        setPage(newPage);
      });
    } else {
      setPage(newPage);
    }
  }, []);

  /* Jump from any page straight into one sector on the drilldown page */
  const openSector = useCallback((sector) => {
    setDrillSector(sector);
    navigateTo('drilldown');
    requestAnimationFrame(() => document.getElementById('main-content')?.scrollTo({ top: 0 }));
  }, [navigateTo]);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const toggleSidebar = useCallback(() => {
    if (window.matchMedia('(min-width: 1024px)').matches) {
      setSidebarCollapsed(collapsed => !collapsed);
      return;
    }
    openSidebar();
  }, [openSidebar]);
  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('jse_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('jse_sidebar_collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (contentRef.current) contentRef.current.inert = sidebarOpen;
  }, [sidebarOpen]);


  const {
    assets, stocks: marketStocks, history, sourceHealth,
    status, lastFetch, progress,
    fetchLive, initFromCache,
  } = useMarketData();

  // Live P/E and market cap layered over the static reference figures
  const { liveFundamentals, cachedFundamentals, fetchFundamentals } = useFundamentals();
  const stocks = useMemo(
    () => mergeFundamentals(marketStocks, liveFundamentals, cachedFundamentals),
    [marketStocks, liveFundamentals, cachedFundamentals]
  );

  const { sparklines, sparkLoading, fetchSparklines } = useSparklines();
  const { toasts, addToast, removeToast } = useToast();

  const prevStatusRef = useRef(status);

  useEffect(() => {
    if (startupRef.current) return;
    startupRef.current = true;

    const cacheState = initFromCache();
    // Always refresh on entry. Cached data remains visible while the update
    // runs, and an empty cache gets the foreground loading treatment.
    fetchLive(cacheState !== 'empty');
    fetchSparklines(ALL_SPARK_SYMBOLS);
    fetchFundamentals(JSE_STOCKS.map(s => s.ticker));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sectors = useMemo(() => deriveSectors(stocks), [stocks]);
  const hasData = status === 'live' || status === 'cached';
  const dataHealth = useMemo(
    () => buildDataHealth({ assets, stocks, status, lastFetch, sparklines, sourceHealth }),
    [assets, stocks, status, lastFetch, sparklines, sourceHealth]
  );

  const cisInput = useMemo(() => buildCISInput(assets, sectors), [assets, sectors]);

  const cis    = useMemo(() => hasData ? computeCIS(cisInput) : EMPTY_CIS, [hasData, cisInput]);
  const alerts = useMemo(
    () => hasData ? computeAlerts({ assets, sectors, stocks }) : [],
    [hasData, assets, sectors, stocks]
  );

  // Log CIS reading to history on successful live fetch
  useEffect(() => {
    if (status === 'live' && hasData && lastFetch && cis.regime && cis.regime !== 'NO DATA') {
      addCisReading(cis.total, cis.regime, cis.regimeClass, lastFetch.getTime(),
        assets.jseTop40?.isLive ? assets.jseTop40.price : null);
    }
  }, [lastFetch, status, hasData, cis.total, cis.regime, cis.regimeClass, addCisReading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Each live fetch also lets the server take a shared reading (throttled server-side)
  useEffect(() => {
    if (status === 'live' && lastFetch) syncCisServer(true);
  }, [lastFetch, status, syncCisServer]);

  const handleFetch = useCallback(async (silentParam) => {
    const isSilent = silentParam === true;
    const result = await fetchLive(isSilent);
    if (result?.success) {
      addToast(`Updated · ${new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })} SAST`, result.warning ? 'info' : 'success');
      fetchSparklines(ALL_SPARK_SYMBOLS);
    } else if (result?.error && !isSilent) {
      addToast(result.error, 'error', 6000);
    }
  }, [fetchLive, addToast, fetchSparklines]);

  const pollInBackground = useCallback(() => handleFetch(true), [handleFetch]);
  const { notifyEnabled, notifySupported, toggleNotify } = useNotifications({
    cis, alerts, hasData, addToast, onPoll: pollInBackground,
  });

  const handleExport = useCallback((key) => {
    if (key === 'watchlist-csv') exportWatchlistCSV(stocks, timeframe);
    if (key === 'macro-csv')     exportMacroCSV(assets);
    if (key === 'snapshot-json') exportSnapshotJSON(assets, stocks, sectors, cis, alerts);
    if (key === 'cis-history-csv') exportCISHistoryCSV(cisHistory);
    addToast('File downloaded', 'info', 2000);
  }, [stocks, assets, sectors, cis, alerts, timeframe, cisHistory, addToast]);

  const shared = {
    assets, stocks, sectors, cis, alerts, history,
    timeframe, status, hasData, dataHealth, lastFetch,
    onFetch: handleFetch,
    sparklines, sparkLoading,
    cisChartData, cisHistory, cisServerStatus,
    onOpenSector: openSector,
    onNavigate: navigateTo,
    drillSector, setDrillSector,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-tp font-sans">
      <Toast toasts={toasts} onRemove={removeToast} />
      <LoadingOverlay status={status} progress={progress} />

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden"
             aria-hidden="true" onClick={closeSidebar} />
      )}

      <Sidebar
        page={page} setPage={navigateTo}
        cis={cis} status={status} lastFetch={lastFetch}
        isOpen={sidebarOpen} onClose={closeSidebar}
        isCollapsed={sidebarCollapsed}
        theme={theme} setTheme={setTheme}
      />

      <a className="skip-link" href="#main-content">Skip to market dashboard</a>

      <div
        ref={contentRef}
        aria-hidden={sidebarOpen || undefined}
        className={clsx(
          'flex flex-col flex-1 overflow-hidden ml-0 transition-[margin] duration-200 ease-out',
          sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-[240px]',
        )}
      >
        <TopBar
          page={page}
          status={status} progress={progress}
          onFetch={handleFetch}
          timeframe={timeframe}   setTimeframe={setTimeframe}
          onExport={handleExport}
          onMenuClick={toggleSidebar}
          menuOpen={sidebarOpen}
          sidebarCollapsed={sidebarCollapsed}
          menuButtonRef={menuButtonRef}
          theme={theme} setTheme={setTheme}
          notifyEnabled={notifyEnabled} notifySupported={notifySupported} onToggleNotify={toggleNotify}
        />
        <main id="main-content" tabIndex="-1" className="flex-1 overflow-y-auto">
          <Suspense fallback={<PageFallback />}>
            {page === 'overview'  && <Overview          {...shared} />}
            {page === 'macro'     && <MacroTransmission {...shared} />}
            {page === 'drilldown' && <SectorDrilldown   {...shared} />}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
