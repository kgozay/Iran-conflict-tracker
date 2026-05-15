import React, { useMemo } from 'react';
import clsx from 'clsx';
import { getAssetAlertLevel } from '../utils/alerts.js';

function fmtPrice(key, price) {
  if (price == null) return '—';
  if (key === 'usdZar') return price.toFixed(3);
  if (key === 'r2035')  return `${price.toFixed(3)}%`;
  if (key === 'brent')  return price.toFixed(2);
  if (price >= 10000)   return price.toLocaleString('en-ZA', { maximumFractionDigits: 0 });
  return price.toFixed(2);
}

function getImpactLine(assetKey, changePct) {
  if (changePct == null) return 'Awaiting live move to infer market impact';
  const up = changePct >= 0;
  const map = {
    brent:     up ? 'Bearish for SA inflation, rand and domestic cyclicals' : 'Relief for SA inflation, rand and consumer shares',
    usdZar:    up ? 'Rand weakness: pressure on importers, retailers and banks' : 'Rand strength: supportive for domestic cyclicals',
    gold:      up ? 'Safe-haven bid: supportive for gold miners' : 'Haven bid fading: miner hedge weakening',
    platinum:  up ? 'PGM support: helps diversified miners and PGM names' : 'PGM softness: drag for platinum-linked shares',
    palladium: up ? 'Palladium support: watch PGM beta and auto demand read-through' : 'Palladium softness: weak read-through for PGM exposure',
    coal:      up ? 'Coal support: positive for coal/energy-linked earnings' : 'Coal weakness: weaker energy export tailwind',
    r2035:     up ? 'Yield pressure: tighter financial conditions' : 'Yield relief: supportive for duration and credit-sensitive equities',
  };
  return map[assetKey] || (up ? 'Positive market read-through' : 'Negative market read-through');
}

function sourceBadge(asset) {
  if (asset.isStale) return { label: 'STATIC', cls: 'text-bear border-bear/30 bg-bear/8', title: 'Static fallback; excluded from CIS' };
  if (asset.isProxy) return { label: asset.source || 'PROXY', cls: 'text-tm border-bd bg-bg-h', title: `${asset.source || 'Proxy'}${asset.date ? ' · ' + asset.date : ''}` };
  if (asset.isLive)  return { label: asset.source || 'LIVE',  cls: 'text-tm border-bd bg-bg-h', title: `${asset.source || 'Yahoo'}${asset.date ? ' · ' + asset.date : ''}` };
  return null;
}

function KpiSparkline({ assetKey, points, chg }) {
  const path = useMemo(() => {
    if (!points || points.length < 3) return null;
    const W = 200, H = 40;
    const min   = Math.min(...points);
    const max   = Math.max(...points);
    const range = max - min || Math.abs(min) * 0.001 || 1;
    const coords = points.map((d, i) => ({
      x: (i / (points.length - 1)) * W,
      y: H - ((d - min) / range) * (H * 0.9),
    }));
    const line = coords.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const fill = `${line} L ${W},${H} L 0,${H} Z`;
    const last = coords[coords.length - 1];
    return { line, fill, W, H, last };
  }, [points]);

  if (!path) return null;

  const up  = (chg ?? 0) >= 0;
  const col = up ? '52,211,153' : '249,112,112';
  const hex = up ? '#34d399' : '#f97070';
  const id  = `kpi_grad_${assetKey}`;

  return (
    <svg viewBox={`0 0 ${path.W} ${path.H}`} preserveAspectRatio="none"
      className="w-full block" style={{ height: path.H }} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={`rgb(${col})`} stopOpacity="0.28" />
          <stop offset="100%" stopColor={`rgb(${col})`} stopOpacity="0"    />
        </linearGradient>
      </defs>
      <path d={path.fill} fill={`url(#${id})`} />
      <path d={path.line} stroke={`rgb(${col})`} strokeWidth="1.5" fill="none"
        strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={path.last.x.toFixed(1)} cy={path.last.y.toFixed(1)} r="2.5" fill={hex} />
    </svg>
  );
}

function SparklineSkeleton() {
  return <div className="w-full h-[40px] bg-bd/20 rounded animate-pulse" />;
}

function KpiCard({ assetKey, asset, timeframe, sparklineData, sparkLoading }) {
  const { name, price, unit, symbol } = asset;
  const invert = asset.invert ?? false;

  const changePct = timeframe === '5D' ? asset.changePct5D
    : timeframe === '20D' ? asset.changePct20D
    : asset.changePct;

  const isUp  = (changePct ?? 0) >= 0;
  const good  = invert ? !isUp : isUp;
  const chgCl = price == null ? 'text-ts' : good ? 'text-bull' : 'text-bear';
  const sign  = isUp ? '+' : '';
  const chgStr = changePct == null ? '—' : `${sign}${changePct.toFixed(2)}%`;
  const badge  = sourceBadge(asset);

  const sparkKey  = symbol || assetKey;
  const spark     = sparklineData?.[sparkKey];
  const showSpark = timeframe === '1D' && price != null;

  return (
    <div className="bg-bg-c border border-bd rounded-[14px] p-[22px_26px_20px] flex flex-col min-h-[260px]
                    transition-colors hover:border-warn/40">

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] font-medium text-ts leading-none">{name}</span>
        {badge && (
          <span className={clsx(
            'font-mono text-[9.5px] px-[7px] py-[2px] rounded border tracking-[0.04em]',
            badge.cls,
          )} title={badge.title}>
            {badge.label}
          </span>
        )}
      </div>

      {/* Price + change */}
      <div className="mt-[18px]">
        <div className="font-serif text-[56px] text-tp leading-[0.95] tracking-[-0.025em]">
          {fmtPrice(assetKey, price)}
        </div>
        <div className="flex items-baseline gap-2 mt-2.5">
          <span className={clsx('font-mono text-[14px] font-semibold', chgCl)}>{chgStr}</span>
          <span className="text-[11.5px] text-tm">{timeframe === '1D' ? unit : timeframe}</span>
        </div>
      </div>

      {/* Sparkline */}
      <div className="mt-5 mb-4">
        {showSpark
          ? spark?.points?.length >= 3
            ? <KpiSparkline assetKey={assetKey} points={spark.points} chg={changePct} />
            : sparkLoading
              ? <SparklineSkeleton />
              : <div className="h-[40px]" />
          : <div className="h-[40px]" />
        }
      </div>

      {/* Impact line — pinned to bottom */}
      <div className="mt-auto pt-3.5 border-t border-bd text-[11.5px] text-ts leading-[1.5]">
        {getImpactLine(assetKey, changePct)}
      </div>
    </div>
  );
}

/* ── Secondary KPI strip (Platinum · Palladium · Coal) ──────────────── */
export function SecondaryKpiStrip({ assets, timeframe = '1D' }) {
  const keys = ['platinum', 'palladium', 'coal'];
  const present = keys.filter(k => assets?.[k]);
  if (!present.length) return null;

  return (
    <div className="flex bg-bg-c border border-bd rounded-xl overflow-hidden mb-4">
      {present.map((k, i) => {
        const asset = assets[k];
        const changePct = timeframe === '5D' ? asset.changePct5D
          : timeframe === '20D' ? asset.changePct20D
          : asset.changePct;
        const isUp  = (changePct ?? 0) >= 0;
        const good  = (asset.invert ?? false) ? !isUp : isUp;
        const chgCl = changePct == null ? 'text-ts' : good ? 'text-bull' : 'text-bear';
        const sign  = isUp ? '+' : '';
        const chgStr = changePct == null ? '—' : `${sign}${changePct.toFixed(2)}%`;

        return (
          <div key={k}
            className={clsx(
              'flex-1 flex items-center justify-between px-[22px] py-[14px] gap-6',
              i < present.length - 1 && 'border-r border-bd',
            )}>
            <div>
              <div className="text-[11.5px] font-medium text-ts">{asset.name}</div>
              <div className="font-serif text-[26px] text-tp leading-none tracking-[-0.01em] mt-1">
                {fmtPrice(k, asset.price)}
              </div>
            </div>
            <div className={clsx('font-mono text-[13px] font-semibold', chgCl)}>{chgStr}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Hero KPI grid (Brent · USD/ZAR · Gold · SA 10Y) ───────────────── */
export default function KpiGrid({ assets, sparklines, sparkLoading, timeframe = '1D' }) {
  const keys = ['brent', 'usdZar', 'gold', 'r2035'];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
      {keys.map(k =>
        assets[k] ? (
          <KpiCard
            key={k}
            assetKey={k}
            asset={assets[k]}
            timeframe={timeframe}
            sparklineData={sparklines}
            sparkLoading={sparkLoading}
          />
        ) : null
      )}
    </div>
  );
}
