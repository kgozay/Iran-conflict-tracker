import React, { useMemo } from 'react';
import { Card, CardHeader } from './Card.jsx';

function pearson(a, b) {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const aSlice = a.slice(-n);
  const bSlice = b.slice(-n);
  const meanA = aSlice.reduce((s, v) => s + v, 0) / n;
  const meanB = bSlice.reduce((s, v) => s + v, 0) / n;
  const num = aSlice.reduce((s, v, i) => s + (v - meanA) * (bSlice[i] - meanB), 0);
  const den = Math.sqrt(
    aSlice.reduce((s, v) => s + (v - meanA) ** 2, 0) *
    bSlice.reduce((s, v) => s + (v - meanB) ** 2, 0)
  );
  return den === 0 ? 0 : num / den;
}

const ASSETS = [
  { short: 'Brent',   name: 'Brent',      key: 'BZ=F',        type: 'macro'  },
  { short: 'Gold',    name: 'Gold',        key: 'GC=F',        type: 'macro'  },
  { short: 'ZAR',     name: 'USD/ZAR',     key: 'USDZAR=X',    type: 'macro'  },
  { short: 'US 10Y',  name: 'US 10Y',      key: '^TNX',        type: 'macro'  },
  { short: 'JSE',     name: 'Top40',       key: 'top40',       type: 'sector' },
  { short: 'Miners',  name: 'Miners',      key: 'Gold Miners', type: 'sector' },
  { short: 'Banks',   name: 'Banks',       key: 'Banks',       type: 'sector' },
  { short: 'Retail',  name: 'Retailers',   key: 'Retailers',   type: 'sector' },
  { short: 'Energy',  name: 'Energy',      key: 'Energy',      type: 'sector' },
  { short: 'Indust',  name: 'Industrials', key: 'Industrials', type: 'sector' },
];

const N = ASSETS.length;

function extractReturns(asset, history, stocks) {
  if (asset.type === 'macro') {
    return history[asset.key]?.returns20D ?? [];
  }
  const pool = asset.key === 'top40'
    ? stocks.filter(s => s.isLive && history[s.ticker]?.returns20D)
    : stocks.filter(s => s.sector === asset.key && s.isLive && history[s.ticker]?.returns20D);
  if (!pool.length) return [];
  const arrays = pool.map(s => history[s.ticker].returns20D);
  const minLen = Math.min(...arrays.map(a => a.length));
  const avg = [];
  for (let i = 0; i < minLen; i++) {
    let sum = 0;
    for (const a of arrays) sum += a[a.length - minLen + i];
    avg.push(sum / arrays.length);
  }
  return avg;
}

function cellColor(r, diagonal) {
  if (diagonal) return 'var(--color-bd)';
  const alpha = 0.12 + Math.abs(r) * 0.55;
  return r >= 0
    ? `rgba(52,211,153,${alpha.toFixed(2)})`
    : `rgba(249,112,112,${alpha.toFixed(2)})`;
}

const COL_TEMPLATE = `100px repeat(${N}, 1fr)`;

export default function CorrelationHeatmap({ history, stocks }) {
  if (!history || Object.keys(history).length === 0) return null;

  const matrix = useMemo(() => {
    const returns = ASSETS.map(a => extractReturns(a, history, stocks));
    return ASSETS.map((_, i) =>
      ASSETS.map((__, j) => {
        if (i === j) return { r: 1, text: '—', diag: true };
        if (!returns[i].length || !returns[j].length) return { r: 0, text: '—', diag: false };
        const r = pearson(returns[i], returns[j]);
        return { r, text: r.toFixed(2), diag: false };
      })
    );
  }, [history, stocks]);

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
        <span className="ml-auto opacity-60">20 trading days · equal-weight sectors</span>
      </div>
    </Card>
  );
}
