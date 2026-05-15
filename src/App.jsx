import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { SECTOR_ORDER } from './data/stocks.js';
import { computeCIS }    from './utils/scoring.js';
import { computeAlerts } from './utils/alerts.js';
import { buildDataHealth } from './utils/dataQuality.js';
import { exportWatchlistCSV, exportMacroCSV, exportSnapshotJSON } from './utils/export.js';
import { useMarketData }  from './hooks/useMarketData.js';
import { useAutoRefresh } from './hooks/useAutoRefresh.js';
import { useCISHistory }  from './hooks/useCISHistory.js';
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

/* Derive sector aggregates from live stock data. Uses the 1D change;
 * timeframe switching (5D/20D) happens at display level in the Watchlist. */
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
  const { news, newsLoading, newsError, refetchNews } = useNews();

  const { chartData: cisChartData, addReading, clearHistory } = useCISHistory();
  const { toasts, addToast, removeToast } = useToast();

  const prevStatusRef = useRef(status);

  /* On mount: show cache immediately, then fetch as needed. */
  useEffect(() => {
    const cacheState = initFromCache();
    if (cacheState === 'empty') {
      fetchLive(false);
    } else if (cacheState === 'stale') {
      setTimeout(() => fetchLive(true), 600);
    }
    fetchSparklines(ALL_SPARK_SYMBOLS);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* Derived values */
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
    r2035Chg:       assets.r2035?.isStale ? null : (assets.r2035?.changePct ?? 0),
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

  /* Record CIS history when a live fetch completes */
  useEffect(() => {
    const was = prevStatusRef.current;
    prevStatusRef.current = status;
    if (status === 'live' && was === 'loading' && hasData) {
      addReading(cis.total, cis.regime, cis.regimeClass);
    }
  }, [status, hasData, cis, addReading]);

  /* Push notifications for regime changes */
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

  /* Wrapped fetch — accepts explicit boolean, ignores MouseEvent from button clicks */
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
    cisChartData, clearHistory,
    sparklines, sparkLoading,
    news, newsLoading, newsError, refetchNews,
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

      <Sidebar page={page} setPage={setPage} cis={cis} status={status} lastFetch={lastFetch}
               isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-1 overflow-hidden lg:ml-[220px] ml-0">
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
