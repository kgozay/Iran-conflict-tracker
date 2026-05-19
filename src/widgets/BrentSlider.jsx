import React, { useState } from 'react';
import clsx from 'clsx';
import { Card, CardHeader } from './Card.jsx';

// Regression coefficients: estimated JSE sector sensitivity per $1 Brent move
const BASE_BRENT = 75;
const SECTORS = [
  { name:'Energy / Sasol',   slope:+0.082 },
  { name:'Coal Exporters',   slope:+0.058 },
  { name:'Gold Miners',      slope:+0.018 },
  { name:'PGM Miners',       slope:+0.012 },
  { name:'JSE Top 40',       slope:-0.041 },
  { name:'Banks',            slope:-0.056 },
  { name:'Retailers',        slope:-0.068 },
  { name:'Industrials',      slope:-0.032 },
];

const SECTOR_SLOPES = {
  'Energy': 0.082,
  'Gold Miners': 0.018,
  'PGMs': 0.012,
  'Banks': -0.056,
  'Retailers': -0.068,
  'Industrials': -0.032,
  'Mining': -0.041,
  'Telecoms': -0.041,
};
const DEFAULT_SLOPE = -0.041;

function getStockSlope(stock) {
  if (stock.display === 'EXX' || stock.display === 'TGA') return 0.058; // Coal exporters
  if (stock.display === 'SOL') return 0.082; // Sasol
  return SECTOR_SLOPES[stock.sector] ?? DEFAULT_SLOPE;
}

function getCellCls(pct) {
  if (pct >= 4)    return 'bg-bull/20 text-bull font-semibold';
  if (pct >= 1.5)  return 'bg-bull/10 text-bull';
  if (pct >= 0.3)  return 'bg-bull/6 text-bull';
  if (pct <= -4)   return 'bg-bear/35 text-bear font-semibold';
  if (pct <= -2)   return 'bg-bear/20 text-bear';
  if (pct <= -0.3) return 'bg-bear/10 text-bear';
  return 'bg-bg-e text-ts';
}

export default function BrentSlider({ liveBrent, stocks = [] }) {
  const livePrice = liveBrent?.price ?? null;
  const initPrice = livePrice ? Math.round(livePrice) : 92;
  const [price, setPrice] = useState(initPrice);

  const delta = price - BASE_BRENT;

  const scenarios = SECTORS.map(s => ({
    ...s,
    pct: +(s.slope * delta).toFixed(1),
  }));

  // Watchlist simulation
  const watchlistSims = (stocks || []).map(s => {
    const slope = getStockSlope(s);
    const estPct = +(slope * delta).toFixed(1);
    return {
      ...s,
      simPct: estPct,
    };
  });

  const avgWatchlistImpact = watchlistSims.length > 0
    ? +(watchlistSims.reduce((acc, s) => acc + s.simPct, 0) / watchlistSims.length).toFixed(2)
    : 0;

  const sortedSims = [...watchlistSims].sort((a, b) => b.simPct - a.simPct);
  const topGainers  = sortedSims.filter(s => s.simPct > 0).slice(0, 3);
  const topLosers   = [...sortedSims].reverse().filter(s => s.simPct < 0).slice(0, 3);

  return (
    <Card>
      <CardHeader title="Interactive Brent Sensitivity — Drag to Scenario" badge="LIVE MODEL" badgeVariant="warn" />

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="font-display text-[32px] leading-none text-warn">${price}</span>
            <span className="font-mono text-[10px] text-tm ml-2">/bbl</span>
            {livePrice && (
              <span className="font-mono text-[9px] text-ts ml-3">
                Live: ${livePrice.toFixed(2)} · {livePrice > price ? 'below live' : livePrice < price ? 'above live' : 'at live'}
              </span>
            )}
          </div>
          <div className="text-right">
            <div className="font-mono text-[8px] text-tm">vs $75 base</div>
            <div className={clsx('font-mono text-[12px] font-semibold', delta > 0 ? 'text-warn' : 'text-bull')}>
              {delta >= 0 ? '+' : ''}${delta}/bbl conflict premium
            </div>
          </div>
        </div>

        <input
          type="range" min={55} max={145} step={1}
          value={price}
          onChange={e => setPrice(+e.target.value)}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #f0b429 0%, #f0b429 ${((price-55)/90)*100}%, #1c2740 ${((price-55)/90)*100}%, #1c2740 100%)`,
          }}
        />

        <div className="flex justify-between font-mono text-[8px] text-tm mt-1">
          <span>$55 FLOOR</span>
          <span>$75 BASE</span>
          <span>{livePrice ? `$${Math.round(livePrice)} NOW` : '$92 EST'}</span>
          <span>$115 SHOCK</span>
          <span>$145 CRISIS</span>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap mb-4">
        {[
          { label:'Base',   p:75,  cls:'border-ts text-ts' },
          { label:'Amber',  p:92,  cls:'border-warn text-warn' },
          { label:'Shock',  p:115, cls:'border-bear text-bear' },
          { label:'Crisis', p:135, cls:'border-bear text-bear bg-bear/10' },
          livePrice && { label:'Live', p:Math.round(livePrice), cls:'border-bull text-bull' },
        ].filter(Boolean).map(s => (
          <button key={s.label} onClick={() => setPrice(s.p)}
            className={clsx('px-2.5 py-1 font-mono text-[8px] rounded border transition-colors cursor-pointer hover:opacity-80', s.cls)}>
            {s.label} ${s.p}
          </button>
        ))}
      </div>

      {/* Grid of Sector coefficients and Watchlist shock simulator */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 pt-4 border-t border-bd-x">
        {/* Left: Sector table */}
        <div>
          <div className="text-[10px] font-semibold text-ts mb-2 tracking-[0.05em] uppercase">Sector Beta Regressions</div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse font-mono text-[10px]">
              <thead>
                <tr>
                  <th className="text-left text-[8px] tracking-[1px] text-tm py-1.5 px-2 border-b border-bd-x">SECTOR</th>
                  <th className="text-right text-[8px] tracking-[1px] text-tm py-1.5 px-2 border-b border-bd-x">EST. IMPACT</th>
                  <th className="text-right text-[8px] tracking-[1px] text-tm py-1.5 px-2 border-b border-bd-x">DIRECTION</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map(s => (
                  <tr key={s.name} className="hover:bg-bg-h transition-colors">
                    <td className="py-1.5 px-2 border-b border-bd-x text-ts text-[9px]">{s.name}</td>
                    <td className={clsx('py-1.5 px-2 border-b border-bd-x text-right font-semibold', getCellCls(s.pct))}>
                      {s.pct >= 0 ? '+' : ''}{s.pct}%
                    </td>
                    <td className="py-1.5 px-2 border-b border-bd-x text-right">
                      <div className="h-1.5 w-full bg-bg-e rounded-full overflow-hidden">
                        <div
                          className={clsx('h-full rounded-full transition-all duration-300', s.pct >= 0 ? 'bg-bull' : 'bg-bear')}
                          style={{ width:`${Math.min(100, Math.abs(s.pct) * 12)}%`, marginLeft: s.pct >= 0 ? '50%' : `${50 - Math.min(50, Math.abs(s.pct)*12)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Watchlist simulation summary */}
        <div className="flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-semibold text-ts mb-2 tracking-[0.05em] uppercase">Simulated Watchlist Impact</div>
            {watchlistSims.length === 0 ? (
              <div className="glass-sub rounded-xl p-4 text-center text-tm text-[11px]">
                No stocks in watchlist to simulate. Fetch data to initialize.
              </div>
            ) : (
              <div className="glass-sub rounded-xl p-[18px] flex flex-col gap-4">
                {/* Average watchlist move */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[9px] text-tm uppercase font-semibold">Average Watchlist Delta</div>
                    <div className="text-[11px] text-ts mt-0.5">Average simulated shift across JSE universe</div>
                  </div>
                  <div className={clsx(
                    'font-serif text-[32px] leading-none tracking-[-0.01em]',
                    avgWatchlistImpact >= 0 ? 'text-bull' : 'text-bear'
                  )}>
                    {avgWatchlistImpact >= 0 ? '+' : ''}{avgWatchlistImpact.toFixed(2)}%
                  </div>
                </div>

                {/* Specific gainers and losers */}
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-bd-x">
                  {/* Gainers */}
                  <div>
                    <div className="text-[8.5px] text-bull font-semibold tracking-[0.05em] uppercase mb-2">Top Positive Movers</div>
                    <div className="flex flex-col gap-1.5">
                      {topGainers.length === 0 ? (
                        <div className="text-[9.5px] text-tm font-mono">None</div>
                      ) : (
                        topGainers.map(s => (
                          <div key={s.ticker} className="flex justify-between items-center text-[10px] font-mono">
                            <span className="text-ts">{s.display}</span>
                            <span className="text-bull font-semibold">+{s.simPct.toFixed(1)}%</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Losers */}
                  <div>
                    <div className="text-[8.5px] text-bear font-semibold tracking-[0.05em] uppercase mb-2">Top Negative Movers</div>
                    <div className="flex flex-col gap-1.5">
                      {topLosers.length === 0 ? (
                        <div className="text-[9.5px] text-tm font-mono">None</div>
                      ) : (
                        topLosers.map(s => (
                          <div key={s.ticker} className="flex justify-between items-center text-[10px] font-mono">
                            <span className="text-ts">{s.display}</span>
                            <span className="text-bear font-semibold">{s.simPct.toFixed(1)}%</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="text-tm text-[8.5px] font-mono leading-relaxed mt-4">
            *Watchlist simulations scale linear sensitivities of {watchlistSims.length} JSE tickers to a ${price} Brent price. Actual market execution may vary.
          </div>
        </div>
      </div>

      <div className="font-mono text-[8px] text-tm mt-3 pt-2 border-t border-bd-x">
        Model based on historical regression across 6 major conflict episodes (1990–2024). Indicative only.
      </div>
    </Card>
  );
}
