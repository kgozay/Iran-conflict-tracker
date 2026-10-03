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
  { key: 'Telecoms',     label: 'Telecoms',      isMkt: false },
];

const ROW_CLS = 'grid items-center gap-[14px] w-full text-left';
const ROW_STYLE = { gridTemplateColumns: 'minmax(72px, 120px) 1fr 56px 14px' };

function Row({ onClick, ariaLabel, children }) {
  if (!onClick) return <div className={ROW_CLS} style={ROW_STYLE}>{children}<span /></div>;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={clsx(ROW_CLS, 'group min-h-9 -mx-2 px-2 rounded-lg hover:bg-bg-h transition-colors cursor-pointer')}
      style={{ ...ROW_STYLE, width: 'calc(100% + 1rem)' }}
    >
      {children}
      <span aria-hidden="true" className="text-tx group-hover:text-tp transition-colors text-[14px]">›</span>
    </button>
  );
}

export default function HeatStrip({ sectors, onOpenSector }) {
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
        <span className="text-[12px] text-tm">1D · equal-weight</span>
      </div>
      {onOpenSector && (
        <p className="-mt-2.5 mb-3 text-[12px] text-tm">Select a sector to open its drilldown.</p>
      )}

      {/* Rows */}
      <div className="flex flex-col gap-[3px]">
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
            <Row key={key}
              onClick={onOpenSector ? () => onOpenSector(isMkt ? 'All' : key) : undefined}
              ariaLabel={`${label} ${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%. Open ${isMkt ? 'all sectors' : label} in sector drilldown`}>

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
            </Row>
          );
        })}
      </div>
    </Card>
  );
}
