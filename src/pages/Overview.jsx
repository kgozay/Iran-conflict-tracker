import React from 'react';
import RegimeBanner    from '../widgets/RegimeBanner.jsx';
import KpiGrid         from '../widgets/KpiGrid.jsx';
import HeatStrip       from '../widgets/HeatStrip.jsx';
import ScoreDecomp     from '../widgets/ScoreDecomp.jsx';
import SectorRelChart  from '../widgets/SectorRelChart.jsx';
import AlertsFeed      from '../widgets/AlertsFeed.jsx';
import MorningNote     from '../widgets/MorningNote.jsx';
import CISHistoryChart from '../widgets/CISHistoryChart.jsx';
import Watchlist       from '../widgets/Watchlist.jsx';
import MarketHours     from '../components/MarketHours.jsx';

function FetchPrompt({ onFetch }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-5xl mb-5">📡</div>
      <div className="font-display text-[30px] tracking-[3px] text-ts mb-2">NO LIVE DATA YET</div>
      <div className="font-mono text-[11px] text-tm mb-2 leading-relaxed max-w-md">
        Click the button below to fetch real-time prices for all 33 JSE stocks,
        Brent crude, gold, platinum, palladium, USD/ZAR, coal — plus the{' '}
        <span className="text-warn">SA 10Y bond yield (^ZA10Y)</span>.
      </div>
      <div className="font-mono text-[9px] text-tm mb-6">
        All fetched in one request · No API key required · Yahoo Finance
      </div>
      <button
        onClick={onFetch}
        className="px-10 py-3.5 bg-warn text-bg font-mono text-[13px] font-semibold rounded hover:bg-warn/80 transition-colors cursor-pointer shadow-lg"
      >
        ⚡ FETCH LIVE DATA NOW
      </button>
      <div className="font-mono text-[9px] text-tm mt-4">
        After fetching, use the AUTO refresh buttons (1M/5M/15M/30M) to stay live all morning.
      </div>
    </div>
  );
}

export default function Overview({
  assets, stocks, sectors, cis, alerts, timeframe,
  status, hasData, onFetch, cisChartData, clearHistory,
}) {
  const isLoading = status === 'loading';

  if (!hasData && !isLoading) {
    return (
      <div className="p-[18px] animate-fadeUp">
        <div className="flex items-center justify-between mb-4">
          <MarketHours />
          <div className="font-mono text-[9px] text-tm">
            Data sources: <span className="text-ts">Yahoo Finance (stocks/commodities)</span>{' '}
            + <span className="text-warn">SA 10Y Bond Yield (^ZA10Y via Yahoo Finance)</span>
          </div>
        </div>
        <FetchPrompt onFetch={onFetch} />
      </div>
    );
  }

  return (
    <div className="p-[18px] animate-fadeUp">
      {/* Top bar — market hours + data source info */}
      <div className="flex items-center justify-between mb-3.5 gap-3 flex-wrap">
        <MarketHours />
        <div className="flex items-center gap-3 font-mono text-[9px] text-tm">
          {assets.r2035?.isProxy && (
            <span className="text-warn border border-warn/30 bg-warn/8 px-2 py-0.5 rounded-sm">
              ⚠ R2035 using FRED proxy — SARB API unavailable
            </span>
          )}
          {assets.r2035?.isLive && !assets.r2035?.isProxy && (
            <span className="text-bull border border-bull/30 bg-bull/8 px-2 py-0.5 rounded-sm">
              ● R2035 live from SARB · {assets.r2035.date ?? ''}
            </span>
          )}
          <span className="text-ts">Yahoo Finance · Auto-refresh available</span>
        </div>
      </div>

      <RegimeBanner cis={cis} hasData={hasData} />
      <KpiGrid assets={assets} cis={cis} hasData={hasData} />
      <HeatStrip sectors={sectors} />

      {/* Score decomp + sector chart */}
      <div className="grid grid-cols-3 gap-3.5 mb-3.5">
        <div className="col-span-1"><ScoreDecomp cis={cis} hasData={hasData} /></div>
        <div className="col-span-2"><SectorRelChart sectors={sectors} hasData={hasData} /></div>
      </div>

      {/* CIS history chart — full width */}
      <div className="mb-3.5">
        <CISHistoryChart chartData={cisChartData} onClear={clearHistory} />
      </div>

      {/* Alerts + morning note */}
      <div className="grid grid-cols-2 gap-3.5 mb-3.5">
        <AlertsFeed alerts={alerts} hasData={hasData} />
        <MorningNote assets={assets} sectors={sectors} cis={cis} stocks={stocks} hasData={hasData} />
      </div>

      {/* Watchlist */}
      <Watchlist stocks={stocks} timeframe={timeframe} />
    </div>
  );
}
