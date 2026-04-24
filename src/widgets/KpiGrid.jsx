import React, { useMemo } from 'react';
import clsx from 'clsx';
import { getAssetAlertLevel } from '../utils/alerts.js';
import { ASSET_ICONS, RadarIcon, DotIcon } from '../components/Icons.jsx';

const TOP_BAR = { bull:'before:bg-bull', bear:'before:bg-bear', warn:'before:bg-warn', ts:'before:bg-ts' };
const CHG_CLR = { bull:'text-bull', bear:'text-bear', warn:'text-warn', ts:'text-ts' };

function fmtPrice(key, price) {
  if (price == null) return '—';
  if (key === 'usdZar') return price.toFixed(3);
  if (key === 'r2035')  return `${price.toFixed(3)}%`;
  if (key === 'brent')  return price.toFixed(2);
  if (price >= 10000)   return price.toLocaleString('en-ZA', { maximumFractionDigits:0 });
  return price.toFixed(2);
}

function getImpactLine(assetKey, changePct) {
  if (changePct == null) return 'Awaiting live move to infer market impact';
  const up = changePct >= 0;
  const map = {
    brent: up ? 'Bearish for SA inflation, rand and domestic cyclicals' : 'Relief for SA inflation, rand and consumer shares',
    usdZar: up ? 'Rand weakness: pressure on importers, retailers and banks' : 'Rand strength: supportive for domestic cyclicals',
    gold: up ? 'Safe-haven bid: supportive for gold miners' : 'Haven bid fading: miner hedge weakening',
    platinum: up ? 'PGM support: helps diversified miners and PGM names' : 'PGM softness: drag for platinum-linked shares',
    palladium: up ? 'Palladium support: watch PGM beta and auto demand read-through' : 'Palladium softness: weak read-through for PGM exposure',
    coal: up ? 'Coal support: positive for coal/energy-linked earnings' : 'Coal weakness: weaker energy export tailwind',
    r2035: up ? 'Yield pressure: tighter financial conditions' : 'Yield relief: supportive for duration and credit-sensitive equities',
  };
  return map[assetKey] || (up ? 'Positive market read-through' : 'Negative market read-through');
}

function sourceBadge(asset) {
  if (asset.isStale) return { label: 'STATIC', cls: 'text-bear border-bear/30 bg-bear/8', title: 'Static fallback; excluded from CIS' };
  if (asset.isProxy) return { label: asset.source || 'PROXY', cls: 'text-warn border-warn/30 bg-warn/8', title: `${asset.source || 'Proxy'}${asset.date ? ' · ' + asset.date : ''}` };
  if (asset.isLive)  return { label: asset.source || 'LIVE', cls: 'text-bull border-bull/30 bg-bull/8', title: `${asset.source || 'Yahoo'}${asset.date ? ' · ' + asset.date : ''}` };
  return null;
}

function KpiSparkline({ assetKey, points, chg }) {
  const path = useMemo(() => {
    if (!points || points.length < 3) return null;
    const W = 200, H = 28;
    const min   = Math.min(...points);
    const max   = Math.max(...points);
    const range = max - min || Math.abs(min) * 0.001 || 1;
    const line  = points
      .map((d, i) =>
        `${i === 0 ? 'M' : 'L'} ${((i / (points.length - 1)) * W).toFixed(1)},${(H - ((d - min) / range) * H).toFixed(1)}`
      )
      .join(' ');
    const fill = `${line} L ${W},${H} L 0,${H} Z`;
    return { line, fill, W, H };
  }, [points]);

  if (!path) return null;

  const col = (chg ?? 0) >= 0 ? '5,208,154' : '239,68,68';
  const id  = `kpi_grad_${assetKey}`;

  return (
    <svg viewBox={`0 0 ${path.W} ${path.H}`} preserveAspectRatio="none" className="w-full block mt-2" style={{ height: 26 }} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={`rgb(${col})`} stopOpacity="0.22" />
          <stop offset="100%" stopColor={`rgb(${col})`} stopOpacity="0"    />
        </linearGradient>
      </defs>
      <path d={path.fill} fill={`url(#${id})`} />
      <path d={path.line} stroke={`rgb(${col})`} strokeWidth="1.5" fill="none" strokeLinejoin="round" />
    </svg>
  );
}

function SparklineSkeleton() {
  return <div className="w-full h-[26px] mt-2 bg-bd/20 rounded animate-pulse" />;
}

function KpiCard({ assetKey, asset, timeframe, sparklineData, sparkLoading }) {
  const { name, price, unit, symbol } = asset;
  const invert = asset.invert ?? false;

  const changePct = timeframe === '5D'
    ? asset.changePct5D
    : timeframe === '20D'
      ? asset.changePct20D
      : asset.changePct;

  const isUp   = (changePct ?? 0) >= 0;
  const good   = invert ? !isUp : isUp;
  const barKey = price == null ? 'ts' : good ? 'bull' : 'bear';
  const chgKey = price == null ? 'ts' : good ? 'bull' : 'bear';
  const alert  = getAssetAlertLevel(assetKey, changePct ?? 0);
  const sign   = isUp ? '+' : '';
  const chgStr = changePct == null ? '—' : `${sign}${changePct.toFixed(2)}%`;
  const badge  = sourceBadge(asset);

  const Icon = ASSET_ICONS[assetKey];
  const sparkKey = symbol || assetKey;
  const spark    = sparklineData?.[sparkKey];
  const showSpark = timeframe === '1D' && price != null;

  return (
    <div className={clsx(
      'relative bg-bg-c border border-bd rounded p-[11px] overflow-hidden transition-colors hover:border-warn/40',
      'before:content-[""] before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px]',
      TOP_BAR[barKey],
    )}>
      {alert && (
        <span className={clsx('absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full',
          alert === 'red' ? 'bg-bear shadow-[0_0_6px_#ef4444] animate-pulseFast' : 'bg-warn shadow-[0_0_6px_#f0b429]'
        )} />
      )}

      <div className="inline-flex items-center gap-1.5 font-mono text-[8px] tracking-[2px] text-ts mb-1.5 pr-4">
        {Icon && <Icon className="w-3 h-3" />}
        {name}
      </div>
      <div className="font-display text-[26px] leading-none tracking-[0.5px] text-tp">{fmtPrice(assetKey, price)}</div>

      <div className="flex items-baseline gap-1.5 mt-1.5">
        <span className={clsx('font-mono text-[11px] font-semibold', CHG_CLR[chgKey])}>{chgStr}</span>
        <span className="font-mono text-[9px] text-tm">{timeframe === '1D' ? unit : timeframe}</span>
        {badge && (
          <span className={clsx('inline-flex items-center gap-0.5 font-mono text-[7px] ml-auto px-1 py-0.5 rounded-sm border', badge.cls)} title={badge.title}>
            <DotIcon className="w-1.5 h-1.5" /> {badge.label}
          </span>
        )}
      </div>

      <div className="font-mono text-[7.5px] text-tm mt-2 leading-snug min-h-[24px]">
        {getImpactLine(assetKey, changePct)}
      </div>

      {showSpark
        ? (spark?.points?.length >= 3
            ? <KpiSparkline assetKey={assetKey} points={spark.points} chg={changePct} />
            : sparkLoading
              ? <SparklineSkeleton />
              : <div className="w-full h-[26px] mt-2" />)
        : <div className="w-full h-[26px] mt-2" />
      }
    </div>
  );
}

function CisTile({ cis, hasData }) {
  const cisColor = !hasData ? 'text-ts'
    : cis.regimeClass === 'bull' ? 'text-bull'
    : cis.regimeClass === 'warn' ? 'text-warn'
    : 'text-bear';

  return (
    <div className="relative bg-bg-c border border-bd rounded p-[11px] overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] before:bg-ts">
      <div className="inline-flex items-center gap-1.5 font-mono text-[8px] tracking-[2px] text-ts mb-1.5">
        <RadarIcon className="w-3 h-3" />
        Conflict Impact
      </div>
      <div className={clsx('font-display text-[36px] leading-none', cisColor)}>
        {hasData ? cis.total : '—'}
      </div>
      <div className="flex items-baseline gap-1.5 mt-1.5">
        <span className={clsx('font-mono text-[11px] font-semibold', cisColor)}>
          {hasData ? cis.regime : 'NO DATA'}
        </span>
      </div>
      <div className="font-mono text-[7.5px] text-tm mt-2 leading-snug min-h-[24px]">
        Heuristic: macro 40%, JSE reaction 35%, confirmation 25%.
      </div>
      <div className="w-full h-[26px] mt-2" />
    </div>
  );
}

export default function KpiGrid({ assets, cis, hasData, sparklines, sparkLoading, timeframe = '1D' }) {
  const keys = ['brent','usdZar','gold','platinum','palladium','coal','r2035'];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 mb-3.5">
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
      <CisTile cis={cis} hasData={hasData} />
    </div>
  );
}
