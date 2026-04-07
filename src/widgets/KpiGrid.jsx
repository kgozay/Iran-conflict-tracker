import React from 'react';
import clsx from 'clsx';
import { getAssetAlertLevel } from '../utils/alerts.js';

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

function KpiCard({ assetKey, asset }) {
  const { name, price, changePct, unit, icon, isLive, isProxy, source } = asset;
  const invert   = asset.invert ?? false;
  const isUp     = (changePct ?? 0) >= 0;
  const good     = invert ? !isUp : isUp;
  const barKey   = price == null ? 'ts' : good ? 'bull' : 'bear';
  const chgKey   = price == null ? 'ts' : good ? 'bull' : 'bear';
  const alert    = getAssetAlertLevel(assetKey, changePct ?? 0);
  const sign     = isUp ? '+' : '';
  const chgStr   = changePct == null ? '—' : `${sign}${changePct.toFixed(2)}%`;

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
      <div className="font-mono text-[8px] tracking-[2px] text-ts mb-1.5">{icon} {name}</div>
      <div className="font-display text-[26px] leading-none tracking-[0.5px] text-tp">{fmtPrice(assetKey, price)}</div>
      <div className="flex items-baseline gap-1.5 mt-1.5">
        <span className={clsx('font-mono text-[11px] font-semibold', CHG_CLR[chgKey])}>{chgStr}</span>
        <span className="font-mono text-[9px] text-tm">{unit}</span>
        {isLive && !isProxy && <span className="font-mono text-[7px] text-bull ml-auto">● LIVE</span>}
        {isProxy && <span className="font-mono text-[7px] text-warn ml-auto">● PROXY</span>}
      </div>
    </div>
  );
}

export default function KpiGrid({ assets, cis, hasData }) {
  // R2035 replaces sa10y; order matches dashboard layout
  const keys = ['brent','usdZar','gold','platinum','palladium','coal','r2035'];
  const cisColor = !hasData ? 'text-ts'
    : cis.regimeClass === 'bull' ? 'text-bull'
    : cis.regimeClass === 'warn' ? 'text-warn'
    : 'text-bear';

  return (
    <div className="grid grid-cols-4 gap-2.5 mb-3.5">
      {keys.map(k => assets[k] ? <KpiCard key={k} assetKey={k} asset={assets[k]} /> : null)}
      <div className="relative bg-bg-c border border-bd rounded p-[11px] overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] before:bg-ts">
        <div className="font-mono text-[8px] tracking-[2px] text-ts mb-1.5">🌍 Conflict Impact</div>
        <div className={clsx('font-display text-[36px] leading-none', cisColor)}>
          {hasData ? cis.total : '—'}
        </div>
        <div className="flex items-baseline gap-1.5 mt-1.5">
          <span className={clsx('font-mono text-[11px] font-semibold', cisColor)}>
            {hasData ? cis.regime : 'NO DATA'}
          </span>
        </div>
      </div>
    </div>
  );
}
