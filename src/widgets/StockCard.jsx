import React from 'react';
import clsx from 'clsx';
import { getSignal, SIGNAL_CLS } from '../utils/signals.js';
import { FUNDAMENTALS_NOTE } from '../data/stocks.js';

function Sparkline({ ticker, points }) {
  const W = 200, H = 34;
  const min = Math.min(...points), max = Math.max(...points), range = max - min || 1;
  const line = points.map((value, i) =>
    `${i === 0 ? 'M' : 'L'} ${((i / (points.length - 1)) * W).toFixed(1)},${(H - ((value - min) / range) * H).toFixed(1)}`
  ).join(' ');
  const fill = `${line} L ${W},${H} L 0,${H} Z`;
  const col = points[points.length - 1] >= points[0] ? '52,211,153' : '249,112,112';
  const id = `s_${ticker.replace(/[^a-z0-9]/gi, '_')}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Intraday price trend (today)"
      className="w-full block mt-2.5" style={{ height: 32 }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={`rgb(${col})`} stopOpacity="0.28" />
          <stop offset="100%" stopColor={`rgb(${col})`} stopOpacity="0"    />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#${id})`} />
      <path d={line} stroke={`rgb(${col})`} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" fill="none" />
      {/* Terminal dot */}
      {(() => {
        const pts = line.split(' ').filter(p => p.includes(','));
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

/* Where the P/E and market cap came from: live this session (no marker), the last
 * live fetch (†, dated tooltip) or the static reference figures (*). */
function fundamentalsLabel(stock) {
  if (stock.fundamentalsSource === 'live') {
    return { mark: '', isLiveish: true, title: 'Live from Yahoo Finance' };
  }
  if (stock.fundamentalsSource === 'cached') {
    const when = new Date(stock.fundamentalsAsOf).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    return { mark: '†', isLiveish: true, title: `Last live value, ${when}` };
  }
  return { mark: '*', isLiveish: false, title: FUNDAMENTALS_NOTE };
}

export default function StockCard({ stock, sparkline, change, period = '1D' }) {
  const chg    = change !== undefined ? change : (stock.changePct ?? null);
  const isUp   = (chg ?? 0) >= 0;
  const signal = getSignal(chg);
  const sigCls = SIGNAL_CLS[signal] ?? SIGNAL_CLS.NEUTRAL;
  const points = sparkline?.points?.filter(value => Number.isFinite(value));
  const fund   = fundamentalsLabel(stock);

  return (
    <div className="glass rounded-[14px] p-[16px_20px] transition-all hover:-translate-y-px">
      {/* Ticker + live dot */}
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-[11.5px] font-semibold text-ts">{stock.display} <span className="font-sans font-normal text-tm">· {stock.sector}</span></span>
        {stock.isLive && (
          <span className="flex items-center gap-[4px] font-mono text-[10px] text-bull">
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
          <div className="text-right">
            <div className={clsx('font-mono text-[13px] font-semibold', isUp ? 'text-bull' : 'text-bear')}>
              {isUp ? '+' : ''}{chg.toFixed(2)}%
            </div>
            <div className="font-mono text-[10px] text-tm">{period}</div>
          </div>
        )}
      </div>

      {/* Sparkline */}
      {points?.length >= 3
        ? <Sparkline ticker={stock.ticker} points={points} />
        : (
          <div className="h-8 mt-2.5 flex items-center">
            <span className="text-[11px] text-tx">No intraday chart</span>
          </div>
        )
      }

      {/* Metadata strip */}
      <div className="grid grid-cols-3 gap-1 mt-3 pt-3 border-t border-bd">
        <div className="text-center" title={fund.title}>
          <div className="font-mono text-[10px] text-tm uppercase tracking-[0.06em]">Mkt cap{fund.mark}</div>
          <div className="font-mono text-[11px] text-ts mt-0.5">{stock.mktcap ?? '—'}</div>
        </div>
        <div className="text-center" title={stock.pe == null && fund.isLiveish ? 'No positive earnings reported (P/E not meaningful)' : fund.title}>
          <div className="font-mono text-[10px] text-tm uppercase tracking-[0.06em]">P/E{fund.mark}</div>
          <div className="font-mono text-[11px] text-ts mt-0.5">
            {stock.pe != null ? `${stock.pe}x` : fund.isLiveish ? 'n/m' : '—'}
          </div>
        </div>
        <div className="text-center">
          <div className="font-mono text-[10px] text-tm uppercase tracking-[0.06em]">Signal</div>
          <div className="mt-0.5 flex justify-center">
            {signal
              ? <span className={clsx('font-mono text-[9.5px] px-1.5 py-[2px] rounded-full border whitespace-nowrap', sigCls)}>{signal}</span>
              : <span className="font-mono text-[9px] text-tm">—</span>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
