import React, { Suspense, lazy, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { SECTOR_ORDER } from './data/stocks.js';
import { computeCIS }    from './utils/scoring.js';
import { computeAlerts } from './utils/alerts.js';
import { buildDataHealth } from './utils/dataQuality.js';
import { exportWatchlistCSV, exportMacroCSV, exportSnapshotJSON } from './utils/export.js';
import { useMarketData }  from './hooks/useMarketData.js';
import { useToast }       from './hooks/useToast.js';
import { useSparklines }  from './hooks/useSparklines.js';
import { useCISHistory }  from './hooks/useCISHistory.js';
import Sidebar            from './components/Sidebar.jsx';
import TopBar             from './components/TopBar.jsx';
import LoadingOverlay     from './components/LoadingOverlay.jsx';
import DataStatusBanner   from './components/DataStatusBanner.jsx';
import Toast              from './components/Toast.jsx';

const Overview = lazy(() => import('./pages/Overview.jsx'));
const MacroTransmission = lazy(() => import('./pages/MacroTransmission.jsx'));
const SectorDrilldown = lazy(() => import('./pages/SectorDrilldown.jsx'));

function PageFallback() {
  return <div role="status" className="p-8 text-[13px] text-tm">Loading dashboard view…</div>;
}

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
    sectors.top40 = { name: 'Watchlist average', chg: +mktAvg.toFixed(2), rel: 0 };
    for (const key of Object.keys(sectors)) {
      if (key !== 'top40') {
        sectors[key].rel = +(sectors[key].chg - mktAvg).toFixed(2);
      }
    }
  } else {
    sectors.top40 = { name: 'Watchlist average', chg: null, rel: 0 };
  }

  return sectors;
}

const ALL_SPARK_SYMBOLS = [
  'BZ=F','GC=F','PL=F','PA=F','USDZAR=X','MTF=F','^TNX',
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
  methodology: 'Heuristic score: macro markets 40%, equal-weight JSE watchlist reaction 35%, confirmation signals 25%.',
};

export default function App() {
  const [page,        setPage]       = useState('overview');
  const [timeframe,   setTimeframe]  = useState('1D');
  const [returnMode,  setReturnMode] = useState('ABS');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme,       setTheme]      = useState(() => localStorage.getItem('jse_theme') ?? 'dark');
  const menuButtonRef = useRef(null);

  const { chartData: cisChartData, addReading: addCisReading } = useCISHistory();

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

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('jse_theme', theme);
  }, [theme]);


  const {
    assets, stocks, history, sourceHealth,
    status, error, lastFetch, progress,
    fetchLive, initFromCache, clearError,
  } = useMarketData();

  const { sparklines, sparkLoading, fetchSparklines } = useSparklines();
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
    () => buildDataHealth({ assets, stocks, status, lastFetch, sparklines, sourceHealth }),
    [assets, stocks, status, lastFetch, sparklines, sourceHealth]
  );

  const cisInput = useMemo(() => ({
    brentChg:       assets.brent?.changePct      ?? 0,
    usdZarChg:      assets.usdZar?.changePct     ?? 0,
    goldChg:        assets.gold?.changePct       ?? 0,
    us10yChg:       assets.us10y?.changePct ?? 0,
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

  // Log CIS reading to history on successful live fetch
  useEffect(() => {
    if (status === 'live' && hasData && lastFetch && cis.regime && cis.regime !== 'NO DATA') {
      addCisReading(cis.total, cis.regime, cis.regimeClass, lastFetch.getTime());
    }
  }, [lastFetch, status, hasData, cis.total, cis.regime, cis.regimeClass, addCisReading]);

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

  const handleExport = useCallback((key) => {
    if (key === 'watchlist-csv') exportWatchlistCSV(stocks, timeframe, returnMode);
    if (key === 'macro-csv')     exportMacroCSV(assets);
    if (key === 'snapshot-json') exportSnapshotJSON(assets, stocks, sectors, cis, alerts);
    addToast('File downloaded', 'info', 2000);
  }, [stocks, assets, sectors, cis, alerts, timeframe, returnMode, addToast]);

  const shared = {
    assets, stocks, sectors, cis, alerts, history,
    timeframe, returnMode, status, hasData, dataHealth, lastFetch,
    onFetch: handleFetch,
    sparklines, sparkLoading,
    cisChartData,
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
        theme={theme} setTheme={setTheme}
      />

      <a className="skip-link" href="#main-content">Skip to market dashboard</a>

      <div className="flex flex-col flex-1 overflow-hidden ml-0 lg:ml-[240px]">
        <TopBar
          page={page}
          status={status} progress={progress}
          onFetch={handleFetch}
          timeframe={timeframe}   setTimeframe={setTimeframe}
          returnMode={returnMode} setReturnMode={setReturnMode}
          onExport={handleExport}
          onMenuClick={openSidebar}
          menuOpen={sidebarOpen}
          menuButtonRef={menuButtonRef}
          theme={theme} setTheme={setTheme}
        />
        <DataStatusBanner
          dataHealth={dataHealth}
          error={error}
          onRetry={handleFetch}
          onDismiss={clearError}
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
