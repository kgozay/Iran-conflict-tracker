import React from 'react';
import RegimeBanner   from '../widgets/RegimeBanner.jsx';
import KpiGrid, { SecondaryKpiStrip } from '../widgets/KpiGrid.jsx';
import HeatStrip      from '../widgets/HeatStrip.jsx';
import AlertsFeed     from '../widgets/AlertsFeed.jsx';
import MorningNote    from '../widgets/MorningNote.jsx';
import Watchlist      from '../widgets/Watchlist.jsx';

function FetchPrompt({ onFetch }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="font-serif text-[32px] text-ts mb-3">No live data yet</div>
      <div className="text-[14px] text-tm mb-2 leading-relaxed max-w-md">
        Click below to fetch real-time prices for the JSE watchlist, Brent crude, gold,
        platinum, palladium, USD/ZAR, coal, and the{' '}
        <span className="text-warn">US 10-year yield</span>.
      </div>
      <div className="font-mono text-[11px] text-tx mb-6">
        Single request · No API key required · Yahoo Finance + Stooq/FRED
      </div>
      <button
        onClick={() => onFetch()}
        className="px-10 py-3 bg-paper font-medium text-[13px] rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
        style={{ color: 'var(--color-ink)' }}
      >
        Fetch live data
      </button>
    </div>
  );
}

export default function Overview({
  assets, stocks, sectors, cis, alerts, timeframe, returnMode,
  status, hasData, onFetch, cisChartData,
  sparklines, sparkLoading, dataHealth,
}) {
  const isLoading = status === 'loading';

  if (!hasData && !isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-[32px_36px] animate-fadeUp">
        <FetchPrompt onFetch={onFetch} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-[32px_36px] flex flex-col gap-5 sm:gap-6 animate-fadeUp">

      {/* Secondary KPI strip: Platinum · Palladium · Coal */}
      <SecondaryKpiStrip assets={assets} timeframe={timeframe} />

      {/* Hero macro KPIs: Brent · USD/ZAR · Gold · US 10Y */}
      <KpiGrid
        assets={assets}
        sparklines={sparklines}
        sparkLoading={sparkLoading}
        timeframe={timeframe}
      />

      {/* Two-column grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-[18px] items-start">

        {/* Left: Watchlist + Sector breadth */}
        <div className="flex flex-col gap-[18px]">
          <Watchlist
            stocks={stocks}
            timeframe={timeframe}
            returnMode={returnMode}
            sectors={sectors}
            sparklines={sparklines}
          />
          <HeatStrip sectors={sectors} timeframe={timeframe} />
        </div>

        {/* Right: Regime card + Alerts */}
        <div className="flex flex-col gap-[18px]">
          <RegimeBanner cis={cis} hasData={hasData} cisChartData={cisChartData} />
          <AlertsFeed alerts={alerts} hasData={hasData} />
        </div>
      </div>

      {/* Morning note */}
      <MorningNote
        assets={assets}
        sectors={sectors}
        cis={cis}
        stocks={stocks}
        alerts={alerts}
        dataHealth={dataHealth}
        hasData={hasData}
      />
    </div>
  );
}
