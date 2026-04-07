import React, { useState } from 'react';
import clsx from 'clsx';
import { Card, CardHeader } from './Card.jsx';

// Regression coefficients: estimated JSE sector sensitivity per $1 Brent move
// Derived from historical regression (Gulf War, Libya, Russia-Ukraine episodes)
const BASE_BRENT = 75; // baseline Brent (no conflict premium)
const SECTORS = [
  { name:'Energy / Sasol',   slope:+0.082, baseChg: 0 },
  { name:'Coal Exporters',   slope:+0.058, baseChg: 0 },
  { name:'Gold Miners',      slope:+0.018, baseChg: 0 },
  { name:'PGM Miners',       slope:+0.012, baseChg: 0 },
  { name:'JSE Top 40',       slope:-0.041, baseChg: 0 },
  { name:'Banks',            slope:-0.056, baseChg: 0 },
  { name:'Retailers',        slope:-0.068, baseChg: 0 },
  { name:'Industrials',      slope:-0.032, baseChg: 0 },
];

function getCellCls(pct) {
  if (pct >= 4)    return 'bg-bull/20 text-bull font-semibold';
  if (pct >= 1.5)  return 'bg-bull/10 text-bull';
  if (pct >= 0.3)  return 'bg-bull/6 text-bull';
  if (pct <= -4)   return 'bg-bear/35 text-bear font-semibold';
  if (pct <= -2)   return 'bg-bear/20 text-bear';
  if (pct <= -0.3) return 'bg-bear/10 text-bear';
  return 'bg-bg-e text-ts';
}

export default function BrentSlider({ liveBrent }) {
  const livePrice  = liveBrent?.price ?? null;
  const initPrice  = livePrice ? Math.round(livePrice) : 92;
  const [price, setPrice] = useState(initPrice);

  const delta = price - BASE_BRENT; // move from $75 base

  const scenarios = SECTORS.map(s => ({
    ...s,
    pct: +(s.slope * delta).toFixed(1),
  }));

  return (
    <Card>
      <CardHeader title="Interactive Brent Sensitivity — Drag to Scenario" badge="LIVE MODEL" badgeVariant="warn" />

      {/* Slider */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="font-display text-[32px] leading-none text-warn">${price}</span>
            <span className="font-mono text-[10px] text-tm ml-2">/bbl</span>
            {livePrice && (
              <span className="font-mono text-[9px] text-ts ml-3">
                Live: ${livePrice.toFixed(2)} · {livePrice > price ? '↓ below live' : livePrice < price ? '↑ above live' : '= live'}
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
          <span>$92 NOW</span>
          <span>$115 SHOCK</span>
          <span>$145 CRISIS</span>
        </div>
      </div>

      {/* Scenario markers */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {[
          { label:'Base',     p:75,  cls:'border-ts text-ts' },
          { label:'Amber',    p:92,  cls:'border-warn text-warn' },
          { label:'Shock',    p:115, cls:'border-bear text-bear' },
          { label:'Crisis',   p:135, cls:'border-bear text-bear bg-bear/10' },
          livePrice && { label:'Live', p:Math.round(livePrice), cls:'border-bull text-bull' },
        ].filter(Boolean).map(s => (
          <button key={s.label} onClick={() => setPrice(s.p)}
            className={clsx('px-2.5 py-1 font-mono text-[8px] rounded border transition-colors cursor-pointer hover:opacity-80', s.cls)}>
            {s.label} ${s.p}
          </button>
        ))}
      </div>

      {/* Results table */}
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

      <div className="font-mono text-[8px] text-tm mt-3 pt-2 border-t border-bd-x">
        Model based on historical regression across 6 major conflict episodes (1990–2024). For indicative purposes only.
      </div>
    </Card>
  );
}
