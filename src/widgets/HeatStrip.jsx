import React from 'react';
import clsx from 'clsx';
import { Card } from './Card.jsx';

const SECTOR_ROWS = [
  { key: 'top40',        label: 'Watchlist avg', isMkt: true  },
  { key: 'Gold Miners',  label: 'Gold Miners',   isMkt: false },
  { key: 'PGMs',         label: 'PGMs',          isMkt: false },
  { key: 'Energy',       label: 'Energy',        isMkt: false },
  { key: 'Banks',        label: 'Banks',         isMkt: false },
  { key: 'Retailers',    label: 'Retailers',     isMkt: false },
  { key: 'Industrials',  label: 'Industrials',   isMkt: false },
  { key: 'Mining',       label: 'Mining',        isMkt: false },
];

export default function HeatStrip({ sectors, timeframe = '1D' }) {
  const rows = SECTOR_ROWS
    .map(r => ({ ...r, chg: sectors[r.key]?.chg ?? null }))
    .filter(r => r.chg != null);

  if (!rows.length) return null;

  const max = Math.max(...rows.map(r => Math.abs(r.chg)), 0.01);

  return (
    <Card>
      {/* Header */}
      <div className="flex items-baseline justify-between mb-[18px]">
        <div className="font-serif text-[22px] text-tp leading-[1.1]">
          Sector <span className="italic text-warn">breadth</span>
        </div>
        <span className="text-[11px] text-tm">{timeframe} · equal-weight</span>
      </div>

      {/* Rows */}
      <div className="flex flex-col gap-[11px]">
        {rows.map(({ key, label, chg, isMkt }) => {
          const up  = chg >= 0;
          const col = isMkt ? 'text-warn' : up ? 'text-bull' : 'text-bear';
          const barCol = isMkt
            ? 'rgba(232,176,74,0.88)'
            : up ? 'rgba(52,211,153,0.88)' : 'rgba(249,112,112,0.88)';
          const w = (Math.abs(chg) / max) * 100; // 0–100, fraction of full track
          const barW   = `${w / 2}%`;
          const barLeft = up ? '50%' : `calc(50% - ${w / 2}%)`;

          return (
            <div key={key}
              className="grid items-center gap-[14px]"
              style={{ gridTemplateColumns: 'minmax(72px, 120px) 1fr 56px' }}>

              {/* Label */}
              <div className={clsx('text-[13px] text-tp', isMkt ? 'font-semibold' : 'font-medium')}>
                {label}
              </div>

              {/* Bar track */}
              <div className="relative h-[18px] bg-bg-h rounded overflow-hidden">
                {/* Centre tick */}
                <div className="absolute left-1/2 top-0 w-px h-full bg-bd" />
                {/* Fill bar */}
                <div
                  className="absolute top-0 h-full rounded-sm"
                  style={{ left: barLeft, width: barW, background: barCol }}
                />
              </div>

              {/* Value */}
              <div className={clsx('font-mono text-[13.5px] font-semibold text-right', col)}>
                {chg >= 0 ? '+' : ''}{chg.toFixed(2)}%
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
