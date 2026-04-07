import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { SECTOR_ORDER } from './data/stocks.js';
import { computeCIS }    from './utils/scoring.js';
import { computeAlerts } from './utils/alerts.js';
import { exportWatchlistCSV, exportMacroCSV, exportSnapshotJSON } from './utils/export.js';
import { useMarketData }  from './hooks/useMarketData.js';
import { useAutoRefresh } from './hooks/useAutoRefresh.js';
import { useCISHistory }  from './hooks/useCISHistory.js';
import { useToast }       from './hooks/useToast.js';
import Sidebar            from './components/Sidebar.jsx';
import TopBar             from './components/TopBar.jsx';
import LoadingOverlay     from './components/LoadingOverlay.jsx';
import Toast              from './components/Toast.jsx';
import Overview           from './pages/Overview.jsx';
import MacroTransmission  from './pages/MacroTransmission.jsx';
import SectorDrilldown    from './pages/SectorDrilldown.jsx';

/* Derive sector aggregates from live stock data */
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

const EMPTY_CIS = {
  total: 0, regime: 'NO DATA', regimeClass: 'neutral',
  components: {
    macro: { score: 0, weight: 0.40, contrib: 0 },
    jse:   { score: 0, weight: 0.35, contrib: 0 },
    conf:  { score: 0, weight: 0.25, contrib: 0 },
  },
};

export default function App() {
  const [page,       setPage]       = useState('overview');
  const [timeframe,  setTimeframe]  = useState('1D');
  const [returnMode, setReturnMode] = useState('ABS');

  const { assets, stocks, status, error, lastFetch, progress, fetchLive, initFromCache } =
    useMarketData();

  const { chartData: cisChartData, addReading, clearHistory } = useCISHistory();
  const { toasts, addToast, removeToast } = useToast();

  const prevStatusRef = useRef(status);

  /* On mount: show cache immediately, refetch if stale */
  useEffect(() => {
    const isStale = initFromCache();
    if (isStale) {
      // Small delay so UI paints the cached data first
      setTimeout(() => fetchLive(true), 600);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* Derived values */
  const sectors = useMemo(() => deriveSectors(stocks), [stocks]);
  const hasData = status === 'live' || status === 'cached';

  const cisInput = useMemo(() => ({
    brentChg:       assets.brent?.changePct      ?? 0,
    usdZarChg:      assets.usdZar?.changePct     ?? 0,
    goldChg:        assets.gold?.changePct       ?? 0,
    r2035Chg:       assets.r2035?.changePct      ?? 0,
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

  /* Wrapped fetch — adds toast feedback */
  const handleFetch = useCallback(async (silent = false) => {
    const result = await fetchLive(silent);
    if (result?.success) {
      const src = result.assets?.r2035?.source;
      const bondLabel = src ? ` · R2035 via ${src}` : '';
      addToast(`↻ Updated · ${new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })} SAST${bondLabel}`, 'success');
    } else if (result?.error && !silent) {
      addToast(result.error, 'error', 6000);
    }
  }, [fetchLive, addToast]);

  const autoRefresh = useAutoRefresh(handleFetch);

  const handleExport = useCallback((key) => {
    if (key === 'watchlist-csv') exportWatchlistCSV(stocks, timeframe);
    if (key === 'macro-csv')     exportMacroCSV(assets);
    if (key === 'snapshot-json') exportSnapshotJSON(assets, stocks, sectors, cis, alerts);
    addToast('↓ File downloaded', 'info', 2000);
  }, [stocks, assets, sectors, cis, alerts, timeframe, addToast]);

  const shared = {
    assets, stocks, sectors, cis, alerts,
    timeframe, returnMode, status, hasData,
    onFetch: handleFetch,
    cisChartData, clearHistory,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-tp font-sans">
      <Toast toasts={toasts} onRemove={removeToast} />
      <LoadingOverlay status={status} progress={progress} error={error} env={null} onDismiss={() => {}} />
      <Sidebar page={page} setPage={setPage} cis={cis} status={status} lastFetch={lastFetch} />

      <div className="flex flex-col flex-1 overflow-hidden" style={{ marginLeft: 220 }}>
        <TopBar
          page={page}
          status={status} error={error} lastFetch={lastFetch} progress={progress}
          onFetch={handleFetch}
          timeframe={timeframe}   setTimeframe={setTimeframe}
          returnMode={returnMode} setReturnMode={setReturnMode}
          autoRefresh={autoRefresh}
          onExport={handleExport}
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
