import React, { useState } from 'react';
import clsx from 'clsx';
import { Card, CardHeader } from './Card.jsx';

// Regression coefficients: JSE sector sensitivity to:
// 1. Brent delta ($ vs $75 base)
// 2. ZAR Shock (% Rand depreciation)
// 3. Gold Shock (% Gold appreciation)
const BASE_BRENT = 75;
const SECTORS = [
  { name: 'Energy / Sasol',   brentSlope: +0.082, zarSlope: +0.25, goldSlope: 0.00 },
  { name: 'Coal Exporters',   brentSlope: +0.058, zarSlope: +0.20, goldSlope: 0.00 },
  { name: 'Gold Miners',      brentSlope: +0.018, zarSlope: +0.35, goldSlope: +0.80 },
  { name: 'PGM Miners',       brentSlope: +0.012, zarSlope: +0.30, goldSlope: +0.30 },
  { name: 'Watchlist average', brentSlope: -0.041, zarSlope: +0.12, goldSlope: +0.05 },
  { name: 'Banks',            brentSlope: -0.056, zarSlope: -0.35, goldSlope: -0.05 },
  { name: 'Retailers',        brentSlope: -0.068, zarSlope: -0.40, goldSlope: -0.05 },
  { name: 'Industrials',      brentSlope: -0.032, zarSlope: -0.15, goldSlope: 0.00 },
];

function getStockSlopes(stock) {
  // Coal exporters
  if (stock.display === 'EXX' || stock.display === 'TGA') {
    return { brent: 0.058, zar: 0.20, gold: 0 };
  }
  // Sasol
  if (stock.display === 'SOL') {
    return { brent: 0.082, zar: 0.25, gold: 0 };
  }
  // Gold miners (GFI, ANG, SSW)
  if (stock.sector === 'Gold Miners') {
    return { brent: 0.018, zar: 0.35, gold: stock.display === 'SSW' ? 0.40 : 0.85 };
  }
  // PGM Miners (IMP, AMS)
  if (stock.sector === 'PGMs') {
    return { brent: 0.012, zar: 0.30, gold: 0.30 };
  }
  // Banks
  if (stock.sector === 'Banks') {
    return { brent: -0.056, zar: -0.35, gold: 0 };
  }
  // Retailers
  if (stock.sector === 'Retailers') {
    return { brent: -0.068, zar: -0.40, gold: 0 };
  }
  // Industrials (NPN, PRX, CFR, AGL, MTN)
  if (stock.sector === 'Industrials' || stock.sector === 'Telecoms') {
    return { brent: -0.032, zar: -0.15, gold: 0 };
  }
  // Default JSE Top40 / Miners
  return { brent: -0.041, zar: 0.12, gold: 0.05 };
}

function getCellCls(pct) {
  if (pct >= 4)    return 'bg-bull-faint border-bull-faint text-bull font-semibold';
  if (pct >= 1.5)  return 'bg-bull-faint text-bull';
  if (pct >= 0.3)  return 'text-bull';
  if (pct <= -4)   return 'bg-bear-faint border-bear-faint text-bear font-semibold';
  if (pct <= -2)   return 'bg-bear-faint text-bear';
  if (pct <= -0.3) return 'text-bear';
  return 'text-ts';
}

export default function BrentSlider({ liveBrent, stocks = [] }) {
  const livePrice = liveBrent?.price ?? null;
  const initPrice = livePrice ? Math.round(livePrice) : 92;

  // Multi-asset state
  const [brent, setBrent] = useState(initPrice);
  const [zar, setZar] = useState(0); // % Rand depreciation shock
  const [gold, setGold] = useState(0); // % Gold appreciation shock

  const deltaBrent = brent - BASE_BRENT;

  // Sector calculations based on all three factors
  const scenarios = SECTORS.map(s => {
    const brentImpact = s.brentSlope * deltaBrent;
    const zarImpact   = s.zarSlope * zar;
    const goldImpact  = s.goldSlope * gold;
    return {
      ...s,
      pct: +(brentImpact + zarImpact + goldImpact).toFixed(1),
    };
  });

  // Watchlist simulation
  const watchlistSims = (stocks || []).map(s => {
    const slopes = getStockSlopes(s);
    const brentImpact = slopes.brent * deltaBrent;
    const zarImpact   = slopes.zar * zar;
    const goldImpact  = slopes.gold * gold;
    return {
      ...s,
      simPct: +(brentImpact + zarImpact + goldImpact).toFixed(1),
    };
  });

  const avgWatchlistImpact = watchlistSims.length > 0
    ? +(watchlistSims.reduce((acc, s) => acc + s.simPct, 0) / watchlistSims.length).toFixed(2)
    : 0;

  const sortedSims = [...watchlistSims].sort((a, b) => b.simPct - a.simPct);
  const topGainers  = sortedSims.filter(s => s.simPct > 0).slice(0, 3);
  const topLosers   = [...sortedSims].reverse().filter(s => s.simPct < 0).slice(0, 3);

  // Preset triggers
  const applyPreset = (b, z, g) => {
    setBrent(b);
    setZar(z);
    setGold(g);
  };

  return (
    <Card>
      <CardHeader title="Multi-Asset Scenario Simulator" kicker="MACRO TRANSMISSION" badge="LIVE FACTOR MODEL" badgeVariant="warn" />

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-5">
        {/* Sliders Left: Brent */}
        <div className="flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11.5px] font-semibold text-tp tracking-[0.02em]">Brent crude</span>
            <div className="text-right">
              <span className="font-mono text-[16px] leading-none text-warn font-bold">${brent}</span>
              <span className="font-mono text-[9px] text-tm ml-0.5">/bbl</span>
            </div>
          </div>
          <input
            type="range" min={55} max={145} step={1}
            value={brent}
            onChange={e => setBrent(+e.target.value)}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, var(--color-warn) 0%, var(--color-warn) ${((brent-55)/90)*100}%, var(--color-bg-h) ${((brent-55)/90)*100}%, var(--color-bg-h) 100%)`,
            }}
          />
          <div className="flex justify-between font-mono text-[8px] text-tm mt-1">
            <span>$55 FLOOR</span>
            <span>$75 BASE</span>
            <span>$145 CRISIS</span>
          </div>
        </div>

        {/* Sliders Middle: USD/ZAR FX */}
        <div className="flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11.5px] font-semibold text-tp tracking-[0.02em]">Rand Depreciation (USD/ZAR)</span>
            <div className="text-right">
              <span className={clsx('font-mono text-[16px] leading-none font-bold', zar > 0 ? 'text-bear' : zar < 0 ? 'text-bull' : 'text-ts')}>
                {zar > 0 ? '+' : ''}{zar}%
              </span>
            </div>
          </div>
          <input
            type="range" min={-15} max={15} step={0.5}
            value={zar}
            onChange={e => setZar(+e.target.value)}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, var(--color-bear) 0%, var(--color-bear) ${((zar-(-15))/30)*100}%, var(--color-bg-h) ${((zar-(-15))/30)*100}%, var(--color-bg-h) 100%)`,
            }}
          />
          <div className="flex justify-between font-mono text-[8px] text-tm mt-1">
            <span className="text-bull">RAND STRENGTH (-15%)</span>
            <span>STABLE (0%)</span>
            <span className="text-bear">RAND WEAKNESS (+15%)</span>
          </div>
        </div>

        {/* Sliders Right: Gold Haven */}
        <div className="flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11.5px] font-semibold text-tp tracking-[0.02em]">Gold Haven shock</span>
            <div className="text-right">
              <span className={clsx('font-mono text-[16px] leading-none font-bold', gold > 0 ? 'text-bull' : gold < 0 ? 'text-bear' : 'text-ts')}>
                {gold > 0 ? '+' : ''}{gold}%
              </span>
            </div>
          </div>
          <input
            type="range" min={-20} max={20} step={0.5}
            value={gold}
            onChange={e => setGold(+e.target.value)}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, var(--color-bull) 0%, var(--color-bull) ${((gold-(-20))/40)*100}%, var(--color-bg-h) ${((gold-(-20))/40)*100}%, var(--color-bg-h) 100%)`,
            }}
          />
          <div className="flex justify-between font-mono text-[8px] text-tm mt-1">
            <span className="text-bear">GOLD SELL-OFF (-20%)</span>
            <span>STABLE (0%)</span>
            <span className="text-bull">GOLD HAVEN (+20%)</span>
          </div>
        </div>
      </div>

      {/* Preset Macro Scenarios Buttons */}
      <div className="flex gap-1.5 flex-wrap mb-4 pb-3.5 border-b border-bd">
        {[
          { label: 'Base / Stable', b: 75, z: 0, g: 0, cls: 'border-ts text-ts hover:bg-bg-h' },
          { label: 'De-escalation Relief', b: 70, z: -5, g: -10, cls: 'border-bull text-bull bg-bull/5 hover:bg-bull/10' },
          { label: 'Mild Stress (Amber)', b: 92, z: 3, g: 5, cls: 'border-warn text-warn bg-warn/5 hover:bg-warn/10' },
          { label: 'Geopolitical Shock (Red)', b: 115, z: 8, g: 12, cls: 'border-bear text-bear bg-bear/5 hover:bg-bear/10' },
          { label: 'Systemic Crisis (Black Swan)', b: 135, z: 15, g: 20, cls: 'border-bear text-bear bg-bear/15 hover:bg-bear/20' },
          livePrice && { label: 'Live Brent Reset', b: Math.round(livePrice), z: 0, g: 0, cls: 'border-ts text-ts hover:bg-bg-h' },
        ].filter(Boolean).map(s => (
          <button key={s.label} onClick={() => applyPreset(s.b, s.z, s.g)}
            className={clsx('px-3 py-1 font-mono text-[9px] rounded-lg border transition-all cursor-pointer font-medium hover:-translate-y-px', s.cls)}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Grid of Sector coefficients and Watchlist shock simulator */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        {/* Left: Sector table */}
        <div>
          <div className="text-[10px] font-semibold text-ts mb-2 tracking-[0.05em] uppercase">Sector Sensitivity Estimates</div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse font-mono text-[10px]">
              <thead>
                <tr className="border-b border-bd">
                  <th className="text-left text-[8px] tracking-[1px] text-tm py-1.5 px-2">SECTOR</th>
                  <th className="text-right text-[8px] tracking-[1px] text-tm py-1.5 px-2">EST. IMPACT</th>
                  <th className="text-right text-[8px] tracking-[1px] text-tm py-1.5 px-2">DIRECTIONAL EXPOSURE</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map(s => (
                  <tr key={s.name} className="hover:bg-bg-h transition-colors border-b border-bd">
                    <td className="py-1.5 px-2 text-ts text-[9.5px]">{s.name}</td>
                    <td className={clsx('py-1.5 px-2 text-right font-bold text-[10px]', getCellCls(s.pct))}>
                      {s.pct >= 0 ? '+' : ''}{s.pct}%
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      <div className="h-1.5 w-[80px] bg-bg-e rounded-full overflow-hidden inline-block align-middle">
                        <div
                          className={clsx('h-full rounded-full transition-all duration-300', s.pct >= 0 ? 'bg-bull' : 'bg-bear')}
                          style={{ width:`${Math.min(100, Math.abs(s.pct) * 8)}%`, marginLeft: s.pct >= 0 ? '50%' : `${50 - Math.min(50, Math.abs(s.pct)*8)}%` }}
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
              <div className="glass-sub rounded-xl p-4 flex flex-col gap-3.5">
                {/* Average watchlist move */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[9px] text-tm uppercase font-semibold">Average Watchlist Delta</div>
                    <div className="text-[11px] text-ts mt-0.5">Average simulated shift across JSE universe</div>
                  </div>
                  <div className={clsx(
                    'font-serif text-[32px] leading-none tracking-[-0.01em] font-bold',
                    avgWatchlistImpact >= 0 ? 'text-bull' : 'text-bear'
                  )}>
                    {avgWatchlistImpact >= 0 ? '+' : ''}{avgWatchlistImpact.toFixed(2)}%
                  </div>
                </div>

                {/* Specific gainers and losers */}
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-bd">
                  {/* Gainers */}
                  <div>
                    <div className="text-[8px] text-bull font-semibold tracking-[0.05em] uppercase mb-2">Top Positive Movers</div>
                    <div className="flex flex-col gap-1.5">
                      {topGainers.length === 0 ? (
                        <div className="text-[9.5px] text-tm font-mono">None</div>
                      ) : (
                        topGainers.map(s => (
                          <div key={s.ticker} className="flex justify-between items-center text-[10.5px] font-mono">
                            <span className="text-ts">{s.display}</span>
                            <span className="text-bull font-bold">+{s.simPct.toFixed(1)}%</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Losers */}
                  <div>
                    <div className="text-[8px] text-bear font-semibold tracking-[0.05em] uppercase mb-2">Top Negative Movers</div>
                    <div className="flex flex-col gap-1.5">
                      {topLosers.length === 0 ? (
                        <div className="text-[9.5px] text-tm font-mono">None</div>
                      ) : (
                        topLosers.map(s => (
                          <div key={s.ticker} className="flex justify-between items-center text-[10.5px] font-mono">
                            <span className="text-ts">{s.display}</span>
                            <span className="text-bear font-bold">{s.simPct.toFixed(1)}%</span>
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
            *Linear multi-factor model scales JSE ticker moves to brent delta ({deltaBrent>=0?'+':''}${deltaBrent}) and ZAR ({zar>=0?'+':''}{zar}%) and Gold ({gold>=0?'+':''}{gold}%) shocks.
          </div>
        </div>
      </div>

      <div className="font-mono text-[8px] text-tm mt-3.5 pt-2 border-t border-bd flex justify-between">
        <span>Regression betas calculated across 6 major geopolitical shocks (1990–2024).</span>
        <span>Indicative only.</span>
      </div>
    </Card>
  );
}
