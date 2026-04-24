import React from 'react';
import RegimeBanner    from '../widgets/RegimeBanner.jsx';
import ScoreDrivers    from '../widgets/ScoreDrivers.jsx';
import KpiGrid         from '../widgets/KpiGrid.jsx';
import HeatStrip       from '../widgets/HeatStrip.jsx';
import ScoreDecomp     from '../widgets/ScoreDecomp.jsx';
import SectorRelChart  from '../widgets/SectorRelChart.jsx';
import AlertsFeed      from '../widgets/AlertsFeed.jsx';
import MorningNote     from '../widgets/MorningNote.jsx';
import CISHistoryChart from '../widgets/CISHistoryChart.jsx';
import Watchlist       from '../widgets/Watchlist.jsx';
import DataHealth      from '../widgets/DataHealth.jsx';
import { RadarIcon, BoltIcon } from '../components/Icons.jsx';

function FetchPrompt({ onFetch }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-5 text-ts">
        <RadarIcon className="w-14 h-14" />
      </div>
      <div className="font-display text-[30px] tracking-[3px] text-ts mb-2">NO LIVE DATA YET</div>
      <div className="font-mono text-[11px] text-tm mb-2 leading-relaxed max-w-md">
        Click below to fetch real-time prices for the JSE watchlist, Brent crude, gold,
        platinum, palladium, USD/ZAR, coal — plus the{' '}
        <span className="text-warn">SA 10Y Yield Proxy</span>.
      </div>
      <div className="font-mono text-[9px] text-tm mb-6">
        Single request · No API key required for market data · Yahoo Finance + Stooq/FRED proxy stack
      </div>
      <button
        onClick={() => onFetch()}
        className="inline-flex items-center gap-2 px-10 py-3.5 bg-warn text-bg font-mono text-[13px] font-semibold rounded hover:bg-warn/80 transition-colors cursor-pointer shadow-lg"
      >
        <BoltIcon className="w-4 h-4" />
        FETCH LIVE DATA NOW
      </button>
      <div className="font-mono text-[9px] text-tm mt-4">
        After fetching, use AUTO refresh buttons in the command bar to stay live.
      </div>
    </div>
  );
}

export default function Overview({
  assets, stocks, sectors, cis, alerts, timeframe, returnMode,
  status, hasData, onFetch, cisChartData, clearHistory,
  sparklines, sparkLoading, dataHealth,
}) {
  const isLoading = status === 'loading';

  if (!hasData && !isLoading) {
    return (
      <div className="p-[18px] animate-fadeUp">
        <FetchPrompt onFetch={onFetch} />
      </div>
    );
  }

  return (
    <div className="p-[18px] animate-fadeUp">
      <RegimeBanner cis={cis} hasData={hasData} dataHealth={dataHealth} />
      <ScoreDrivers cis={cis} hasData={hasData} />
      <KpiGrid assets={assets} cis={cis} hasData={hasData} sparklines={sparklines} sparkLoading={sparkLoading} timeframe={timeframe} />
      <HeatStrip sectors={sectors} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3.5 mb-3.5">
        <div className="xl:col-span-1"><ScoreDecomp cis={cis} hasData={hasData} /></div>
        <div className="xl:col-span-2"><SectorRelChart sectors={sectors} hasData={hasData} /></div>
      </div>

      <div className="mb-3.5">
        <DataHealth health={dataHealth} hasData={hasData} />
      </div>

      <div className="mb-3.5">
        <CISHistoryChart chartData={cisChartData} onClear={clearHistory} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5 mb-3.5">
        <AlertsFeed alerts={alerts} hasData={hasData} />
        <MorningNote assets={assets} sectors={sectors} cis={cis} stocks={stocks} alerts={alerts} dataHealth={dataHealth} hasData={hasData} />
      </div>

      <Watchlist stocks={stocks} timeframe={timeframe} returnMode={returnMode} sectors={sectors} />
    </div>
  );
}
