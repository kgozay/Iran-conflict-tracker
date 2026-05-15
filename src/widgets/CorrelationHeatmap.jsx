import React, { useMemo } from 'react';
import { Card, CardHeader } from './Card.jsx';
import clsx from 'clsx';

function pearson(a, b) {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const aSlice = a.slice(-n);
  const bSlice = b.slice(-n);
  const meanA = aSlice.reduce((s, v) => s + v, 0) / n;
  const meanB = bSlice.reduce((s, v) => s + v, 0) / n;
  const num = aSlice.reduce((s, v, i) => s + (v - meanA) * (bSlice[i] - meanB), 0);
  const den = Math.sqrt(aSlice.reduce((s, v) => s + (v - meanA) ** 2, 0) * bSlice.reduce((s, v) => s + (v - meanB) ** 2, 0));
  return den === 0 ? 0 : num / den;
}

const HEATMAP_ASSETS = [
  { name: 'Brent', key: 'BZ=F', type: 'macro' },
  { name: 'Gold', key: 'GC=F', type: 'macro' },
  { name: 'USD/ZAR', key: 'USDZAR=X', type: 'macro' },
  { name: 'SA 10Y', key: '^ZA10Y', type: 'macro' },
  { name: 'Top40', key: 'top40', type: 'sector' },
  { name: 'Miners', key: 'Gold Miners', type: 'sector' },
  { name: 'Banks', key: 'Banks', type: 'sector' },
  { name: 'Retailers', key: 'Retailers', type: 'sector' },
  { name: 'Energy', key: 'Energy', type: 'sector' },
  { name: 'Industrials', key: 'Industrials', type: 'sector' },
];

function extractReturns(asset, history, stocks) {
  if (asset.type === 'macro') {
    return history[asset.key]?.returns20D || [];
  } else {
    let relevantStocks;
    if (asset.key === 'top40') {
      relevantStocks = stocks.filter(s => s.isLive && history[s.ticker]?.returns20D);
    } else {
      relevantStocks = stocks.filter(s => s.sector === asset.key && s.isLive && history[s.ticker]?.returns20D);
    }
    
    if (!relevantStocks.length) return [];
    
    // Get all valid arrays
    const arrays = relevantStocks.map(s => history[s.ticker].returns20D);
    const minLen = Math.min(...arrays.map(a => a.length));
    
    const avg = [];
    for (let i = 0; i < minLen; i++) {
      let sum = 0;
      for (const a of arrays) {
        sum += a[a.length - minLen + i];
      }
      avg.push(sum / arrays.length);
    }
    return avg;
  }
}

export default function CorrelationHeatmap({ history, stocks }) {
  if (!history || Object.keys(history).length === 0) return null;

  const matrix = useMemo(() => {
    const returns = HEATMAP_ASSETS.map(asset => extractReturns(asset, history, stocks));
    
    const mat = [];
    for (let i = 0; i < HEATMAP_ASSETS.length; i++) {
      const row = [];
      for (let j = 0; j < HEATMAP_ASSETS.length; j++) {
        if (i === j) {
          row.push({ r: 1, text: '1.00', bg: 'rgba(100,116,139,0.3)' });
        } else if (!returns[i].length || !returns[j].length) {
          row.push({ r: 0, text: '—', bg: 'rgba(100,116,139,0.1)' });
        } else {
          const r = pearson(returns[i], returns[j]);
          let bg;
          if (r > 0) bg = `rgba(34,197,94,${Math.abs(r)})`;
          else bg = `rgba(239,68,68,${Math.abs(r)})`;
          row.push({ r, text: r.toFixed(2), bg });
        }
      }
      mat.push(row);
    }
    return mat;
  }, [history, stocks]);

  const n = HEATMAP_ASSETS.length;

  return (
    <Card>
      <CardHeader title="20D Asset Correlation Heatmap" badge="MACRO TO JSE" />
      <div className="overflow-x-auto mt-2 pb-2 pt-2">
        <div style={{ minWidth: 400 }}>
          {/* Header Row */}
          <div className="grid gap-px mb-2" style={{ gridTemplateColumns: `80px repeat(${n}, 1fr)` }}>
            <div />
            {HEATMAP_ASSETS.map(a => (
              <div key={a.name}
                   className="text-[9px] font-mono text-ts flex items-end justify-center h-16 pb-1"
                   style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                {a.name}
              </div>
            ))}
          </div>

          {/* Matrix Rows */}
          {HEATMAP_ASSETS.map((asset, i) => (
            <div key={asset.name} className="grid gap-px mb-px" style={{ gridTemplateColumns: `80px repeat(${n}, 1fr)` }}>
              <div className="text-[10px] font-mono text-tp self-center text-right pr-2">
                {asset.name}
              </div>
              {matrix[i].map((cell, j) => (
                <div 
                  key={j} 
                  className="h-6 flex items-center justify-center text-[9px] font-mono rounded-sm"
                  style={{ backgroundColor: cell.bg }}
                >
                  {cell.text}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-bd-x text-[9px] font-mono text-ts justify-center">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-bull/80 rounded-sm"></span> Green = co-movement</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-bear/80 rounded-sm"></span> Red = inverse</span>
      </div>
    </Card>
  );
}
