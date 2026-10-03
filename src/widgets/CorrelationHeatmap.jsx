import React, { useMemo } from 'react';
import { Card, CardHeader } from './Card.jsx';
import { averageDatedReturns, alignedCorrelation } from '../utils/correlation.js';

const ASSETS = [
  { short: 'Brent',   name: 'Brent',      key: 'BZ=F',        type: 'macro'  },
  { short: 'Gold',    name: 'Gold',        key: 'GC=F',        type: 'macro'  },
  { short: 'ZAR',     name: 'USD/ZAR',     key: 'USDZAR=X',    type: 'macro'  },
  { short: 'US 10Y',  name: 'US 10Y',      key: '^TNX',        type: 'macro'  },
  { short: 'JSE avg', name: 'Watchlist average', key: 'top40', type: 'sector' },
  { short: 'Miners',  name: 'Miners',      key: 'Gold Miners', type: 'sector' },
  { short: 'Banks',   name: 'Banks',       key: 'Banks',       type: 'sector' },
  { short: 'Retail',  name: 'Retailers',   key: 'Retailers',   type: 'sector' },
  { short: 'Energy',  name: 'Energy',      key: 'Energy',      type: 'sector' },
  { short: 'Indust',  name: 'Industrials', key: 'Industrials', type: 'sector' },
];

const N = ASSETS.length;

function extractReturns(asset, history, stocks) {
  if (asset.type === 'macro') {
    return new Map((history[asset.key]?.datedReturns20D ?? []).map(point => [point.date, point.value]));
  }
  const pool = asset.key === 'top40'
    ? stocks.filter(s => history[s.ticker]?.datedReturns20D)
    : stocks.filter(s => s.sector === asset.key && history[s.ticker]?.datedReturns20D);
  return averageDatedReturns(pool.map(stock => history[stock.ticker].datedReturns20D), 0.7);
}

function cellColor(r, diagonal) {
  if (diagonal) return 'var(--color-bd)';
  if (r == null) return 'var(--color-bg-e)';
  const alpha = 0.12 + Math.abs(r) * 0.55;
  return r >= 0
    ? `rgba(52,211,153,${alpha.toFixed(2)})`
    : `rgba(249,112,112,${alpha.toFixed(2)})`;
}

const COL_TEMPLATE = `100px repeat(${N}, 1fr)`;

export default function CorrelationHeatmap({ history, stocks }) {
  const matrix = useMemo(() => {
    const returns = ASSETS.map(a => extractReturns(a, history ?? {}, stocks ?? []));
    return ASSETS.map((_, i) =>
      ASSETS.map((__, j) => {
        if (i === j) return { r: 1, text: '—', diag: true, count: returns[i].size };
        const { value, count } = alignedCorrelation(returns[i], returns[j]);
        return { r: value, text: value == null ? '—' : value.toFixed(2), diag: false, count };
      })
    );
  }, [history, stocks]);

  const hasDatedHistory = Object.values(history ?? {}).some(item => item?.datedReturns20D?.length);
  if (!hasDatedHistory) {
    return <Card><CardHeader title="20D correlation" italic="heatmap" />
      <p className="text-[13px] text-tm">Dated history is unavailable. Refresh data to calculate aligned correlations.</p>
    </Card>;
  }

  return (
    <Card>
      <CardHeader title="20D correlation" kicker="MACRO → JSE" italic="heatmap" />
      <div className="overflow-x-auto mt-3">
        <div style={{ minWidth: 560 }}>
          {/* Column header row */}
          <div className="grid gap-[2px] mb-[3px]" style={{ gridTemplateColumns: COL_TEMPLATE }}>
            <div />
            {ASSETS.map(a => (
              <div
                key={a.short}
                className="font-mono text-[10px] text-ts text-center leading-none py-[5px] px-[2px] truncate"
                title={a.name}
              >
                {a.short}
              </div>
            ))}
          </div>

          {/* Matrix rows */}
          {ASSETS.map((asset, i) => (
            <div key={asset.short} className="grid gap-[2px] mb-[2px]" style={{ gridTemplateColumns: COL_TEMPLATE }}>
              {/* Row label */}
              <div className="font-mono text-[10px] text-tp self-center text-right pr-[10px] truncate" title={asset.name}>
                {asset.short}
              </div>
              {/* Cells */}
              {matrix[i].map((cell, j) => (
                <div
                  key={j}
                  className="h-[26px] flex items-center justify-center font-mono text-[11px] rounded-[3px]"
                  style={{
                    backgroundColor: cellColor(cell.r, cell.diag),
                    color: cell.diag ? 'var(--color-tm)' : 'var(--color-tp)',
                  }}
                  title={cell.diag ? `${asset.name}: ${cell.count} sessions` : `${asset.name} and ${ASSETS[j].name}: ${cell.count} shared sessions${cell.r == null ? ' (at least 10 required)' : ''}`}
                >
                  {cell.text}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-4 pt-3 border-t border-bd font-mono text-[10px] text-ts">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-[10px] h-[10px] rounded-[2px]" style={{ background: 'rgba(52,211,153,0.65)' }} />
          co-movement
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-[10px] h-[10px] rounded-[2px]" style={{ background: 'rgba(249,112,112,0.65)' }} />
          inverse
        </span>
        <span className="ml-auto opacity-60">Up to 20 daily returns · shared dates · ≥10 sessions · ≥70% basket coverage</span>
      </div>
    </Card>
  );
}
