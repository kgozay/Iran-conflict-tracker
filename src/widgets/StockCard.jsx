import React, { useMemo } from 'react';
import clsx from 'clsx';
import { getSignal, SIGNAL_CLS } from '../utils/signals.js';

function seededRng(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function Sparkline({ ticker, chg }) {
  const svg = useMemo(() => {
    const seed = ticker.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const rng  = seededRng(seed);
    const PTS = 24, W = 200, H = 34;
    const data = [];
    let v = 100;
    for (let i = 0; i < PTS; i++) {
      v += (chg / PTS) * 0.8 + (rng() - 0.5) * 1.8;
      data.push(v);
    }
    const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
    const pts = data.map((d, i) =>
      `${i === 0 ? 'M' : 'L'} ${((i / (PTS - 1)) * W).toFixed(1)},${(H - ((d - min) / range) * H).toFixed(1)}`
    ).join(' ');
    return { line: pts, fill: `${pts} L ${W},${H} L 0,${H} Z`, W, H };
  }, [ticker, chg]);

  const col = chg >= 0 ? '52,211,153' : '249,112,112';
  const id  = `s_${ticker.replace(/[^a-z0-9]/gi, '_')}`;

  return (
    <svg viewBox={`0 0 ${svg.W} ${svg.H}`} preserveAspectRatio="none"
      className="w-full block mt-2.5" style={{ height: 32 }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={`rgb(${col})`} stopOpacity="0.28" />
          <stop offset="100%" stopColor={`rgb(${col})`} stopOpacity="0"    />
        </linearGradient>
      </defs>
      <path d={svg.fill} fill={`url(#${id})`} />
      <path d={svg.line} stroke={`rgb(${col})`} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" fill="none" />
      {/* Terminal dot */}
      {(() => {
        const pts = svg.line.split(' ').filter(p => p.includes(','));
        const last = pts[pts.length - 1]?.split(',');
        if (!last) return null;
        return <circle cx={last[0]} cy={last[1]} r="2.5" fill={`rgb(${col})`} />;
      })()}
    </svg>
  );
}

function fmtP(p) {
  if (p == null) return '—';
  if (p >= 1000) return p.toLocaleString('en-ZA', { maximumFractionDigits: 0 });
  if (p >= 100)  return p.toFixed(1);
  return p.toFixed(2);
}

export default function StockCard({ stock }) {
  const chg    = stock.changePct ?? null;
  const isUp   = (chg ?? 0) >= 0;
  const signal = getSignal(chg);
  const sigCls = SIGNAL_CLS[signal] ?? SIGNAL_CLS.NEUTRAL;

  return (
    <div className="bg-bg-c border border-bd rounded-[14px] p-[16px_20px] transition-all hover:border-warn/40 hover:-translate-y-px">
      {/* Ticker + live dot */}
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-[11px] text-ts">{stock.display}</span>
        {stock.isLive && (
          <span className="flex items-center gap-[4px] font-mono text-[9px] text-bull">
            <span className="w-[5px] h-[5px] rounded-full bg-bull inline-block" />
            live
          </span>
        )}
      </div>

      {/* Name */}
      <div className="font-serif text-[15px] text-tp leading-tight mb-2 line-clamp-1">
        {stock.name}
      </div>

      {/* Price + change */}
      <div className="flex items-baseline justify-between">
        <div className="font-serif text-[28px] text-tp leading-none">{fmtP(stock.price)}</div>
        {chg != null && (
          <div className={clsx('font-mono text-[12px] font-semibold', isUp ? 'text-bull' : 'text-bear')}>
            {isUp ? '+' : ''}{chg.toFixed(2)}%
          </div>
        )}
      </div>

      {/* Sparkline */}
      {chg != null
        ? <Sparkline ticker={stock.ticker} chg={chg} />
        : (
          <div className="h-8 mt-2.5 flex items-center justify-center border border-dashed border-bd rounded-lg">
            <span className="font-mono text-[9px] text-tm">awaiting data</span>
          </div>
        )
      }

      {/* Metadata strip */}
      <div className="grid grid-cols-3 gap-1 mt-3 pt-3 border-t border-bd">
        <div className="text-center">
          <div className="font-mono text-[9px] text-tm uppercase tracking-[0.06em]">Mkt cap</div>
          <div className="font-mono text-[10px] text-ts mt-0.5">{stock.mktcap ?? '—'}</div>
        </div>
        <div className="text-center">
          <div className="font-mono text-[9px] text-tm uppercase tracking-[0.06em]">P/E</div>
          <div className="font-mono text-[10px] text-ts mt-0.5">{stock.pe != null ? `${stock.pe}x` : '—'}</div>
        </div>
        <div className="text-center">
          <div className="font-mono text-[9px] text-tm uppercase tracking-[0.06em]">Signal</div>
          <div className="mt-0.5 flex justify-center">
            {signal
              ? <span className={clsx('font-mono text-[8px] px-1.5 py-[2px] rounded-full border', sigCls)}>{signal}</span>
              : <span className="font-mono text-[9px] text-tm">—</span>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
