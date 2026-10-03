import React, { useState } from 'react';
import clsx from 'clsx';
import { Card } from '../widgets/Card.jsx';
import BrentSlider from '../widgets/BrentSlider.jsx';
import CorrelationHeatmap from '../widgets/CorrelationHeatmap.jsx';
import CrisisComparison from '../widgets/CrisisComparison.jsx';
import CISBacktest from '../widgets/CISBacktest.jsx';
import { useBackfill } from '../hooks/useBackfill.js';
import { CountUp, SpotlightCard } from '../widgets/Effects.jsx';
import { getChannelEvidence, chipMove } from '../utils/transmission.js';
import { buildCISInput } from '../utils/cisInput.js';

/* ── PATCH SUMMARY ─────────────────────────────────────────────────────
 * Two targeted FX additions to this page (everything else is unchanged):
 *   1. <MacroStrip>  — each of the 6 macro tiles is wrapped in
 *      <SpotlightCard> (FX5, directional tint) and the % value is
 *      animated with <CountUp> (FX1).
 *   2. <ChannelCard> — each transmission channel card is wrapped in
 *      <SpotlightCard>. Spotlight colour follows isActive (bear when
 *      active, neutral when dormant).
 * Card.jsx already wraps its body in SpotlightCard, so the Historical
 * analogues / Alert status / Correlation cards below pick up the halo
 * automatically.
 * ──────────────────────────────────────────────────────────────────── */

/* ── Price and Threshold Utilities ───────────────────────────────────── */
function formatPrice(val, key) {
  if (val == null) return null;
  if (key === 'brent') return `$${val.toFixed(2)}/bbl`;
  if (key === 'usdZar') return `R${val.toFixed(2)}`;
  if (key === 'gold') return `$${Math.round(val).toLocaleString()}/oz`;
  if (key === 'platinum' || key === 'palladium' || key === 'pgm') return `$${Math.round(val).toLocaleString()}/oz`;
  if (key === 'us10y') return `${val.toFixed(3)}%`;
  return `${val.toFixed(2)}`;
}

function getAssetStatus(key, pct) {
  if (pct == null) return { text: 'NO DATA', cls: 'bg-bg-h text-tm border-bd' };

  if (key === 'brent') {
    if (pct >= 2.5) return { text: 'SHOCK ACTIVE', cls: 'bg-bear/15 text-bear border-bear/40' };
    if (pct >= 1.0) return { text: 'ELEVATED',     cls: 'bg-warn/15 text-warn border-warn/40' };
    if (pct <= -1.0)return { text: 'COOLING',      cls: 'bg-bull/15 text-bull border-bull/40' };
    return { text: 'STABLE', cls: 'bg-bg-h text-tm border-bd' };
  }

  if (key === 'usdZar') {
    if (pct >= 1.2) return { text: 'SHOCK ACTIVE', cls: 'bg-bear/15 text-bear border-bear/40' };
    if (pct >= 0.6) return { text: 'PRESSURE',     cls: 'bg-warn/15 text-warn border-warn/40' };
    if (pct <= -0.6)return { text: 'ZAR RALLY',    cls: 'bg-bull/15 text-bull border-bull/40' };
    return { text: 'STABLE', cls: 'bg-bg-h text-tm border-bd' };
  }

  if (key === 'gold' || key === 'platinum' || key === 'palladium' || key === 'pgm') {
    if (pct >= 1.2) return { text: 'HAVEN BID', cls: 'bg-bull/15 text-bull border-bull/40' };
    if (pct >= 0.5) return { text: 'FIRM',      cls: 'bg-bull/10 text-bull/90 border-bull/30' };
    if (pct <= -0.6)return { text: 'SOFT',      cls: 'bg-bear/15 text-bear border-bear/40' };
    return { text: 'STABLE', cls: 'bg-bg-h text-tm border-bd' };
  }

  if (key === 'us10y') {
    if (pct >= 3.0) return { text: 'YIELD SPIKE', cls: 'bg-bear/15 text-bear border-bear/40' };
    if (pct >= 1.2) return { text: 'ELEVATED',    cls: 'bg-warn/15 text-warn border-warn/40' };
    if (pct <= -1.5)return { text: 'EASING',      cls: 'bg-bull/15 text-bull border-bull/40' };
    return { text: 'STABLE', cls: 'bg-bg-h text-tm border-bd' };
  }

  return { text: 'STABLE', cls: 'bg-bg-h text-tm border-bd' };
}

/* Price-direction colour; `inv` flips it for assets where a rise is negative for SA (USD/ZAR, US 10Y). */
function changeColor(pct, inv) {
  if (pct == null) return 'text-tm';
  return (pct >= 0) !== inv ? 'text-bull' : 'text-bear';
}

function ExposureChip({ label, stocks, cls }) {
  const move = chipMove(label, stocks);
  return (
    <span
      className={clsx('inline-flex items-center gap-1.5 text-[10.5px] font-mono font-medium px-1.5 py-0.5 rounded border', cls)}
      title={move ? `Live 1D: ${move.detail}` : undefined}
    >
      {label}
      {move && (
        <span className={clsx(
          'font-semibold pl-1.5 border-l border-bd-x',
          move.avg >= 0 ? 'text-bull' : 'text-bear',
        )}>
          {move.avg >= 0 ? '+' : ''}{move.avg.toFixed(2)}%
        </span>
      )}
    </span>
  );
}

/* ── SVG Pipeline Connector ─────────────────────────────────────────── */
function PipelineConnector({ active, label }) {
  return (
    <div className="flex flex-col md:flex-row items-center justify-center my-1 md:my-0 px-1 py-1 shrink-0 self-center">
      {/* Desktop horizontal flow */}
      <div className="hidden md:flex flex-col items-center">
        {label && <span className="text-[8.5px] font-mono text-tm mb-0.5 tracking-wider uppercase">{label}</span>}
        <svg className="w-8 h-5 overflow-visible" viewBox="0 0 32 20">
          <line
            x1="0" y1="10" x2="22" y2="10"
            stroke={active ? 'var(--color-warn)' : 'var(--color-bd)'}
            strokeWidth="2"
            className={active ? 'pipeline-active-flow' : undefined}
          />
          <polygon
            points="22,6 30,10 22,14"
            fill={active ? 'var(--color-warn)' : 'var(--color-tx)'}
          />
        </svg>
      </div>

      {/* Mobile vertical flow */}
      <div className="flex md:hidden flex-col items-center">
        <svg className="w-5 h-7 overflow-visible" viewBox="0 0 20 28">
          <line
            x1="10" y1="0" x2="10" y2="18"
            stroke={active ? 'var(--color-warn)' : 'var(--color-bd)'}
            strokeWidth="2"
            className={active ? 'pipeline-active-flow' : undefined}
          />
          <polygon
            points="6,18 10,26 14,18"
            fill={active ? 'var(--color-warn)' : 'var(--color-tx)'}
          />
        </svg>
        {label && <span className="text-[8.5px] font-mono text-tm mt-0.5 tracking-wider uppercase">{label}</span>}
      </div>
    </div>
  );
}

/* ── Transmission Channel Pipeline Card ─────────────────────────────── */
function ChannelPipelineCard({
  id,
  expanded,
  onToggle,
  onOpenSector,
  stocks,
  title,
  subtitle,
  isActive,
  spotlightColor,
  stage1,
  stage2,
  stage3,
  netImpact,
  evidence,
}) {
  const evidenceLabels = {
    missing: 'MACRO DATA UNAVAILABLE',
    idle: 'NO MACRO TRIGGER',
    insufficient: 'AWAITING SECTOR DATA',
    consistent: 'SECTOR MOVE CONSISTENT',
    divergent: 'SECTOR MOVE DIVERGES',
    mixed: 'MIXED SECTOR RESPONSE',
  };
  const evidenceCls = {
    missing: 'bg-bg-h text-tm border-bd',
    idle: 'bg-bg-h text-tm border-bd',
    insufficient: 'bg-warn/12 text-warn border-warn/40',
    consistent: 'bg-bull/12 text-bull border-bull/40',
    divergent: 'bg-bear/12 text-bear border-bear/40',
    mixed: 'bg-warn/12 text-warn border-warn/40',
  };
  return (
    <SpotlightCard
      spotlightColor={spotlightColor ?? (isActive ? 'var(--color-bear-spotlight)' : 'var(--color-spotlight)')}
      className="glass rounded-[16px] p-4 sm:p-5 flex flex-col gap-3.5 transition-all duration-300 scroll-mt-4"
    >
      {/* Header doubles as the expand/collapse control */}
      <h3 className="m-0">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={`${id}-detail`}
          className="w-full flex flex-wrap items-center justify-between gap-2 text-left cursor-pointer group"
        >
          <span className="flex items-start gap-2.5 min-w-0">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={clsx('w-4 h-4 mt-1 flex-shrink-0 text-tm group-hover:text-tp transition-transform duration-200', expanded ? 'rotate-90' : '')}>
              <polyline points="9 6 15 12 9 18" />
            </svg>
            <span className="min-w-0">
              <span className="block font-serif font-normal text-[20px] text-tp leading-[1.1]">{title}</span>
              {subtitle && <span className="block text-[11.5px] font-normal text-tm mt-0.5">{subtitle}</span>}
            </span>
          </span>
          <span className="flex items-center gap-2 flex-wrap">
            <span className={clsx('font-mono text-[13px] font-semibold', stage1.colorCls)}>
              {stage1.shortLabel} {stage1.valueStr}
            </span>
            <span className={clsx(
              'inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold tracking-[0.06em] px-2.5 py-1 rounded-full border',
              evidenceCls[evidence.state]
            )}>
              <span className={clsx('w-2 h-2 rounded-full', isActive ? 'bg-warn' : 'bg-tm')} />
              {evidenceLabels[evidence.state]}
            </span>
          </span>
        </button>
      </h3>

      {expanded && (<div id={`${id}-detail`} className="flex flex-col gap-3.5 animate-fadeUp">
      {/* 3-Stage Visual Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1.15fr_auto_1.25fr] items-stretch gap-2 my-0.5">
        {/* Stage 1: Catalyst Shock */}
        <div className={clsx(
          'rounded-xl p-3.5 flex flex-col justify-between border transition-all duration-300',
          isActive ? 'bg-bear/5 border-bear/30' : 'bg-bg-c/60 border-bd'
        )}>
          <div>
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[9.5px] font-mono uppercase tracking-wider font-semibold text-tm">
                Stage 01 · Catalyst Shock
              </span>
              <span className={clsx('text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded border', stage1.statusCls)}>
                {stage1.statusStr}
              </span>
            </div>
            <div className="font-serif text-[19px] text-tp leading-tight mb-1">
              {stage1.title}
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={clsx('font-mono text-[16px] font-bold', stage1.colorCls)}>
                {stage1.valueStr}
              </span>
              {stage1.priceStr && (
                <span className="text-[11px] font-mono text-ts">({stage1.priceStr})</span>
              )}
            </div>
          </div>
          <div className="text-[11px] text-tm mt-3 pt-2 border-t border-bd/60 leading-snug">
            {stage1.driver}
          </div>
        </div>

        {/* Connector 1 -> 2 */}
        <PipelineConnector active={isActive} label="Transmission" />

        {/* Stage 2: Economic Transmission Vector */}
        <div className={clsx(
          'rounded-xl p-3.5 flex flex-col justify-between border transition-all duration-300',
          isActive ? 'bg-warn/5 border-warn/30' : 'bg-bg-c/60 border-bd'
        )}>
          <div>
            <div className="text-[9.5px] font-mono uppercase tracking-wider font-semibold text-tm mb-2">
              Stage 02 · Potential Economic Channel
            </div>
            <div className="font-serif text-[17px] text-tp leading-tight mb-2">
              {stage2.vectorName}
            </div>
            <ul className="space-y-1.5 text-[11.5px] text-ts">
              {stage2.mechanisms.map((mech, mi) => (
                <li key={mi} className="flex items-start gap-1.5 leading-snug">
                  <span className="text-warn text-[10px] mt-0.5">›</span>
                  <span>{mech}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Connector 2 -> 3 */}
        <PipelineConnector active={isActive} label="JSE Vector" />

        {/* Stage 3: JSE Sector Impact */}
        <div className={clsx(
          'rounded-xl p-3.5 flex flex-col justify-between border transition-all duration-300',
          isActive ? 'bg-bull/5 border-bull/30' : 'bg-bg-c/60 border-bd'
        )}>
          <div>
            <div className="text-[9.5px] font-mono uppercase tracking-wider font-semibold text-tm mb-2">
              Stage 03 · Expected JSE Exposure
            </div>
            {stage3.winners?.length > 0 && (
              <div className="mb-2">
                <div className="text-[9.5px] font-mono uppercase tracking-wider text-bull font-semibold mb-1 flex items-center gap-1">
                  <span>▲</span> Expected tailwind
                </div>
                <div className="flex flex-wrap gap-1">
                  {stage3.winners.map((stk, si) => (
                    <ExposureChip key={si} label={stk} stocks={stocks} cls="bg-bull/10 text-bull border-bull/25" />
                  ))}
                </div>
              </div>
            )}
            {stage3.losers?.length > 0 && (
              <div className="mb-2">
                <div className="text-[9.5px] font-mono uppercase tracking-wider text-bear font-semibold mb-1 flex items-center gap-1">
                  <span>▼</span> Expected headwind
                </div>
                <div className="flex flex-wrap gap-1">
                  {stage3.losers.map((stk, si) => (
                    <ExposureChip key={si} label={stk} stocks={stocks} cls="bg-bear/10 text-bear border-bear/25" />
                  ))}
                </div>
              </div>
            )}
            {stage3.neutral?.length > 0 && (
              <div>
                <div className="text-[9.5px] font-mono uppercase tracking-wider text-ts font-semibold mb-1">
                  — Neutral / Mixed Hedges
                </div>
                <div className="flex flex-wrap gap-1">
                  {stage3.neutral.map((stk, si) => (
                    <ExposureChip key={si} label={stk} stocks={stocks} cls="bg-bg-h text-ts border-bd" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer: Net Sector Impact */}
      <div className="pt-2.5 border-t border-bd flex flex-wrap items-center justify-between gap-2 mt-0.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-medium text-tm tracking-[0.06em] uppercase">
            Expected sector impact:
          </span>
          <span className={clsx('text-[12.5px] font-semibold', netImpact.cls)}>
            {netImpact.verdict}
          </span>
        </div>
        {netImpact.note && (
          <span className="text-[11px] text-ts italic">
            {netImpact.note}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ts" aria-label="Observed one-day sector moves">
        <span className="font-medium text-tm">Observed 1D:</span>
        {evidence.observations.map(item => (
          <button
            key={item.sector}
            type="button"
            onClick={() => onOpenSector?.(item.sector)}
            title={`Open ${item.sector} in sector drilldown`}
            className="font-mono min-h-7 px-1.5 -mx-1.5 rounded hover:bg-bg-h hover:text-tp underline decoration-dotted decoration-tx underline-offset-4 cursor-pointer"
          >
            {item.sector}{' '}
            <span className={item.changePct == null ? 'text-tm' : item.changePct >= 0 ? 'text-bull' : 'text-bear'}>
              {item.changePct == null ? '—' : `${item.changePct >= 0 ? '+' : ''}${item.changePct.toFixed(2)}%`}
            </span>
          </button>
        ))}
        <span className="basis-full text-tm">Sector agreement describes co-movement, not proof of cause.</span>
      </div>
      </div>)}
    </SpotlightCard>
  );
}

/* ── Alert status meta ──────────────────────────────────────────────── */
const THEMATIC_META = {
  'oil-shock':       { name:'Oil Shock Alert',          detail:'Brent >+3% AND ZAR >+0.8%' },
  'domestic-stress': { name:'Domestic Stress',          detail:'ZAR >+1% AND Banks <-1.5% AND Retail <-1.5%' },
  'miner-support':   { name:'Miner Support',            detail:'Gold >+1.5% AND ZAR >+0.5% AND Miners >+1%' },
  'deescalation':    { name:'De-escalation Relief',     detail:'Brent <-2% AND ZAR stable AND market >+1%' },
  'us10y-red':       { name:'US 10Y Surge',             detail:'US 10Y change >+5%' },
  'us10y-amber':     { name:'US 10Y Rising',            detail:'US 10Y change >+2%' },
  'brent-red':       { name:'Brent >+4% Critical',      detail:'Hard red threshold' },
  'brent-amber':     { name:'Brent >+2% Amber',         detail:'Amber threshold' },
  'zar-red':         { name:'USD/ZAR >+1.5% Critical',  detail:'Hard red threshold' },
  'zar-amber':       { name:'USD/ZAR >+0.8% Amber',     detail:'Amber threshold' },
  'gold-red':        { name:'Gold >+2% Red',            detail:'Red threshold' },
  'gold-amber':      { name:'Gold >+1% Amber',          detail:'Amber threshold' },
  'top40-red':       { name:'Market <-2% Red',          detail:'Hard red threshold' },
  'top40-amber':     { name:'Market <-1% Amber',        detail:'Amber threshold' },
  'energy-hot':      { name:'Energy RED-HOT',           detail:'Energy basket >+4%' },
  'energy-amber':    { name:'Energy Bullish',           detail:'Energy basket >+2%' },
};
const STATUS_CLS = {
  red:   'bg-bear/12 text-bear border-bear/40',
  amber: 'bg-warn/12 text-warn border-warn/40',
  green: 'bg-bull/12 text-bull border-bull/40',
  off:   'bg-bg-h text-tm border-bd',
};

/* ── MacroStrip ─────────────────────────────────────────────────────── */
function MacroStrip({ assets, hasData }) {
  const plat = assets.platinum;
  const pal  = assets.palladium;
  const pgmPct = (plat?.changePct != null && pal?.changePct != null)
    ? (plat.changePct * 0.6 + pal.changePct * 0.4)
    : (plat?.changePct ?? pal?.changePct ?? null);
  const pgmPrice = (plat?.price != null && pal?.price != null)
    ? (plat.price * 0.6 + pal.price * 0.4)
    : (plat?.price ?? pal?.price ?? null);

  const items = [
    { label:'Brent Crude',  key:'brent',     asset: assets.brent,     inv: true  },
    { label:'USD / ZAR',    key:'usdZar',    asset: assets.usdZar,    inv: true  },
    { label:'Gold Spot',    key:'gold',      asset: assets.gold,      inv: false },
    { label:'Platinum',     key:'platinum',  asset: assets.platinum,  inv: false },
    { label:'Palladium',    key:'palladium', asset: assets.palladium, inv: false },
    { label:'PGM Basket',   key:'pgm',       asset: { price: pgmPrice, changePct: pgmPct, source: '60/40 synth' }, inv: false },
    { label:'US 10Y Yield', key:'us10y',     asset: assets.us10y,     inv: true  },
  ];

  if (!hasData) {
    return (
      <div className="glass rounded-xl px-4 py-3 text-[13px] text-tm text-center">
        Fetch live data to see macro figures in the transmission analysis
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
      {items.map(({ label, key, asset, inv }) => {
        const pct    = asset?.changePct;
        const price  = asset?.price;
        const good   = pct == null ? null : inv ? pct <= 0 : pct >= 0;
        const col    = pct == null ? 'text-tm' : good ? 'text-bull' : 'text-bear';
        const src    = asset?.source;
        const status = getAssetStatus(key, pct);
        const priceStr = formatPrice(price, key);
        const spot   = pct == null ? 'var(--color-spotlight)'
          : good ? 'var(--color-bull-spotlight)' : 'var(--color-bear-spotlight)';

        return (
          <SpotlightCard
            key={key}
            spotlightColor={spot}
            className="glass-sub rounded-xl py-3 px-3.5 flex flex-col justify-between"
          >
            <div>
              <div className="flex flex-wrap items-center justify-between gap-x-1 gap-y-1 mb-1">
                <span className="text-[11.5px] font-medium text-ts leading-tight">
                  {label}
                </span>
                <span className={clsx('text-[9.5px] font-mono font-semibold px-1.5 py-0.5 rounded border leading-none shrink-0 whitespace-nowrap', status.cls)}>
                  {status.text}
                </span>
              </div>
              <div className={clsx('font-serif text-[24px] sm:text-[26px] leading-none tracking-[-0.02em] my-1', col)}>
                {pct != null
                  ? <><span>{pct >= 0 ? '+' : ''}</span><CountUp to={pct} decimals={2} suffix="%" /></>
                  : '—'}
              </div>
            </div>

            <div className="text-[10.5px] font-mono text-ts flex items-center justify-between pt-1 border-t border-bd/60 mt-1">
              <span>{priceStr ?? '—'}</span>
              {src && <span className="text-[10px] text-tx truncate ml-1">{src}</span>}
            </div>
          </SpotlightCard>
        );
      })}
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────── */
export default function MacroTransmission({ assets, alerts, hasData, history, stocks, sectors, cis, cisHistory, onOpenSector }) {
  const [activeTab, setActiveTab] = useState('channels');
  // Rebuilt daily CIS history is heavy, so only fetch it once a view needs it.
  const backfill = useBackfill(activeTab === 'crisis' || activeTab === 'backtest');
  const [userOpenChannels, setUserOpenChannels] = useState(null);

  const brentChg = assets.brent?.changePct;
  const brentPrc = assets.brent?.price;
  const zarChg   = assets.usdZar?.changePct;
  const zarPrc   = assets.usdZar?.price;
  const goldChg  = assets.gold?.changePct;
  const goldPrc  = assets.gold?.price;
  const us10yChg = assets.us10y?.changePct;
  const us10yPrc = assets.us10y?.price;
  const us10ySrc = assets.us10y?.source || 'fetching…';

  const oilEvidence = getChannelEvidence(brentChg, 2, sectors, [
    { sector: 'Energy', direction: 1 }, { sector: 'Banks', direction: -1 }, { sector: 'Retailers', direction: -1 },
  ]);
  const currencyEvidence = getChannelEvidence(zarChg, 0.8, sectors, [
    { sector: 'Gold Miners', direction: 1 }, { sector: 'Banks', direction: -1 }, { sector: 'Retailers', direction: -1 },
  ]);
  const havenEvidence = getChannelEvidence(goldChg, 1, sectors, [
    { sector: 'Gold Miners', direction: 1 }, { sector: 'PGMs', direction: 1 },
  ]);
  const ratesEvidence = getChannelEvidence(us10yChg, 1.5, sectors, [
    { sector: 'Banks', direction: -1 }, { sector: 'Property', direction: -1 }, { sector: 'Retailers', direction: -1 }, { sector: 'Industrials', direction: -1 },
  ]);

  const fmt = v => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` : '—';

  const triggeredIds = new Set(alerts.map(a => a.id));
  const triggeredCount = Object.keys(THEMATIC_META).filter(id => triggeredIds.has(id)).length;

  const channels = [
    {
      id: 'oil',
      name: 'Oil price',
      threshold: 2,
      title: "Oil Price Shock Transmission",
      evidence: oilEvidence,
      subtitle: "Strait of Hormuz supply disruption & bunker fuel freight premia",
      isActive: hasData && brentChg != null && brentChg > 2,
      spotlightColor: hasData && brentChg != null && brentChg > 2 ? 'var(--color-bear-spotlight)' : undefined,
      stage1: {
        shortLabel: 'Brent',
        colorCls: changeColor(brentChg, true),
          title: 'Brent Crude Oil',
          valueStr: fmt(brentChg),
          priceStr: formatPrice(brentPrc, 'brent'),
          pct: brentChg ?? 0,
          inv: true,
          statusStr: !hasData ? 'STANDBY' : brentChg > 2 ? 'SHOCK ACTIVE' : 'NORMAL RANGE',
          statusCls: !hasData ? 'bg-bg-h text-tm border-bd' : brentChg > 2 ? 'bg-bear/15 text-bear border-bear/40' : 'bg-bg-h text-tm border-bd',
          driver: 'Middle Eastern chokepoint threat, tanker insurance spike & inventory draw',
      },
      stage2: {
          vectorName: 'Cost-Push Inflation & SARB Hawkish Pause',
          mechanisms: [
            'Domestic fuel levy & transport inflation (+50c to +R1.20/L per 10% oil surge)',
            'Logistics CPI passes through to core consumer basket and food distribution',
            'SARB halts interest rate cuts to defend medium-term inflation target',
          ],
      },
      stage3: {
          winners: ['Sasol (SOL) · Oil Parity', 'Thungela (TGA) · Energy Arbitrage'],
          losers: ['Banks (SBK, FSR, NED, ABG) · NII Stress', 'Retailers (SHP, MRP, TRU) · Squeeze'],
          neutral: ['Sasol Chemicals', 'Offshore Exporters'],
      },
      netImpact: {
          verdict: 'Bearish Domestic Credit & Retail | Bullish Synthetic Energy',
          note: 'Fuel cost inflation dampens consumer real disposable income',
          cls: 'text-bear',
      },
    },
    {
      id: 'currency',
      name: 'Rand',
      threshold: 0.8,
      title: "Currency Transmission & Risk-Off",
      evidence: currencyEvidence,
      subtitle: "Emerging Market portfolio liquidation & US Dollar haven flight",
      isActive: hasData && zarChg != null && zarChg > 0.8,
      spotlightColor: hasData && zarChg != null && zarChg > 0.8 ? 'var(--color-bear-spotlight)' : undefined,
      stage1: {
        shortLabel: 'USD/ZAR',
        colorCls: changeColor(zarChg, true),
          title: 'USD / ZAR Exchange Rate',
          valueStr: fmt(zarChg),
          priceStr: formatPrice(zarPrc, 'usdZar'),
          pct: zarChg ?? 0,
          inv: true,
          statusStr: !hasData ? 'STANDBY' : zarChg > 0.8 ? 'PRESSURE ACTIVE' : 'STABLE',
          statusCls: !hasData ? 'bg-bg-h text-tm border-bd' : zarChg > 0.8 ? 'bg-bear/15 text-bear border-bear/40' : 'bg-bg-h text-tm border-bd',
          driver: 'Global haven flight into USD; portfolio outflows from high-beta EM debt',
      },
      stage2: {
          vectorName: 'Import Inflation & Discretionary Margin Squeeze',
          mechanisms: [
            'Landed cost of imported capital equipment, electronics & textiles spikes',
            'SAGB 10-year sovereign bond yields widen on sovereign risk premium',
            'Offshore earnings translation creates windfall cash flow for multinationals',
          ],
      },
      stage3: {
          winners: ['Richemont (CFR) · Luxury Haven', 'BAT (BTI) · GBP Dividend', 'Naspers / Prosus (NPN/PRX)'],
          losers: ['Mr Price (MRP) & Truworths (TRU)', 'Tiger Brands & AVI (TBS, AVI)'],
          neutral: ['Telecoms (MTN, VOD) · Mixed FX'],
      },
      netImpact: {
          verdict: 'Rand Hedges Outperform | SA Domestic Cyclicals Underperform',
          note: 'Dual-listed heavyweights cushion Top40 index while local retail de-rates',
          cls: 'text-warn',
      },
    },
    {
      id: 'haven',
      name: 'Safe haven',
      threshold: 1,
      title: "Safe Haven & Precious Metals Transmission",
      evidence: havenEvidence,
      subtitle: "Global flight from fiat debasement & sovereign reserve asset bidding",
      isActive: hasData && goldChg != null && goldChg > 1,
      spotlightColor: hasData && goldChg != null && goldChg > 1 ? 'var(--color-bull-spotlight)' : undefined,
      stage1: {
        shortLabel: 'Gold',
        colorCls: changeColor(goldChg, false),
          title: 'Gold & PGM Metal Basket',
          valueStr: fmt(goldChg),
          priceStr: formatPrice(goldPrc, 'gold'),
          pct: goldChg ?? 0,
          inv: false,
          statusStr: !hasData ? 'STANDBY' : goldChg > 1 ? 'HAVEN BID ACTIVE' : 'STEADY',
          statusCls: !hasData ? 'bg-bg-h text-tm border-bd' : goldChg > 1 ? 'bg-bull/15 text-bull border-bull/40' : 'bg-bg-h text-tm border-bd',
          driver: 'Central bank accumulation, sovereign wealth haven bid & geopolitical hedging',
      },
      stage2: {
          vectorName: 'Mining Terms-of-Trade & Free Cash Flow Expansion',
          mechanisms: [
            'Rand gold price tests all-time highs (dual haven spot + weak ZAR effect)',
            'Operating margins at deep-level mines surge above AISC breakeven points',
            'Mining royalty & corporate tax receipts bolster SA National Treasury buffer',
          ],
      },
      stage3: {
          winners: ['Gold Fields (GFI) · Unhedged', 'AngloGold (ANG) · Tier-1', 'Harmony (HAR) · High Beta', 'Valterra (VAL) · PGM Bid'],
          losers: [],
          neutral: ['Impala Platinum (IMP)', 'Sibanye-Stillwater (SSW)'],
      },
      netImpact: {
          verdict: 'Strongly Bullish Precious Metals & JSE Mining Complex',
          note: 'Direct monetary hedge protecting South African portfolios during regional war',
          cls: 'text-bull',
      },
    },
    {
      id: 'rates',
      name: 'Global rates',
      threshold: 1.5,
      title: "Global Discount Rate & Duration Compression",
      evidence: ratesEvidence,
      subtitle: "US Treasury yield surge & international cost of equity expansion",
      isActive: hasData && us10yChg != null && us10yChg > 1.5,
      spotlightColor: hasData && us10yChg != null && us10yChg > 1.5 ? 'var(--color-bear-spotlight)' : undefined,
      stage1: {
        shortLabel: 'US 10Y',
        colorCls: changeColor(us10yChg, true),
          title: 'US 10-Year Bond Yield',
          valueStr: fmt(us10yChg),
          priceStr: formatPrice(us10yPrc, 'us10y'),
          pct: us10yChg ?? 0,
          inv: true,
          statusStr: !hasData ? 'STANDBY' : us10yChg > 1.5 ? 'RATE SHOCK ACTIVE' : 'RANGE BOUND',
          statusCls: !hasData ? 'bg-bg-h text-tm border-bd' : us10yChg > 1.5 ? 'bg-bear/15 text-bear border-bear/40' : 'bg-bg-h text-tm border-bd',
          driver: `Global inflation term premium repricing · Source: ${us10ySrc}`,
      },
      stage2: {
          vectorName: 'Equity Valuation Multiple Contraction',
          mechanisms: [
            'Global risk-free hurdle rate escalates, raising cost of capital across EMs',
            'Foreign allocators de-risk long-duration tech, high-P/E equities & bonds',
            'JSE Top40 trailing valuation multiples compress to match bond yields',
          ],
      },
      stage3: {
          winners: ['Cash-Rich High-Yield Defensives', 'Short-Duration Value Exporters'],
          losers: ['Listed Property / REITs (GRT, RDF)', 'High-Multiple Growth (CPI, PRX)'],
          neutral: ['JSE Resource Majors'],
      },
      netImpact: {
          verdict: (us10yChg ?? 0) > 0 ? 'Multiple Contraction on Long-Duration SA Equities' : 'Discount Rate Easing: Valuation Tailwinds for EMs',
          note: 'Higher global discount rates restrict equity multiples for capital importers',
          cls: (us10yChg ?? 0) > 0 ? 'text-bear' : 'text-bull',
      },
    },
  ];

  const tabs = [
    { id: 'channels',    label: 'Transmission channels' },
    { id: 'simulator',   label: 'Scenario simulator' },
    { id: 'analogues',   label: 'Alert thresholds' },
    { id: 'correlation', label: 'Correlations' },
    { id: 'crisis',      label: 'Crisis comparison' },
    { id: 'backtest',    label: 'Backtest' },
  ];

  const activeCount = channels.filter(c => c.isActive).length;

  // Until the reader toggles something, active channels are open and quiet ones are collapsed.
  const defaultOpen = new Set(channels.filter(c => c.isActive).map(c => c.id));
  const openChannels = userOpenChannels ?? defaultOpen;
  const setOpenChannels = update => setUserOpenChannels(prev =>
    typeof update === 'function' ? update(prev ?? defaultOpen) : update
  );

  function toggleChannel(id) {
    setOpenChannels(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function jumpToChannel(id) {
    setOpenChannels(prev => new Set(prev).add(id));
    requestAnimationFrame(() => {
      document.getElementById(`channel-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  const allOpen = openChannels.size === channels.length;

  return (
    <div className="p-4 sm:p-6 lg:p-[32px_36px] flex flex-col gap-5 sm:gap-6 animate-fadeUp">

      {/* 7-up macro strip with threshold status pills and PGM basket */}
      <MacroStrip assets={assets} hasData={hasData} />

      {/* Tab Selector */}
      <div className="flex justify-start">
        <div role="tablist" aria-label="Macro transmission views"
          className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center w-full sm:w-auto bg-bg-c border border-bd rounded-xl p-[4px] gap-[4px] glass">
          {tabs.map(t => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={activeTab === t.id}
              onClick={() => setActiveTab(t.id)}
              className={clsx(
                'min-h-11 px-[18px] py-[8px] text-[13px] font-medium rounded-lg transition-all cursor-pointer select-none',
                activeTab === t.id
                  ? 'bg-bd text-tp shadow-sm font-semibold'
                  : 'text-ts hover:text-tp hover:bg-bg-h'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Transmission channels */}
      {activeTab === 'channels' && (
        <div className="flex flex-col gap-4 animate-fadeUp">
          {/* At-a-glance: which channels are firing right now */}
          <section aria-label="Channel summary" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[13.5px] text-ts m-0">
                {!hasData
                  ? 'Fetch live data to see which channels are active.'
                  : activeCount === 0
                    ? 'No channel has crossed its trigger today. Open any channel to see how it would transmit.'
                    : <><strong className="text-tp">{activeCount} of {channels.length}</strong> channels have crossed their trigger today. Active channels are expanded below.</>}
              </p>
              <button
                type="button"
                onClick={() => setOpenChannels(allOpen ? new Set() : new Set(channels.map(c => c.id)))}
                className="min-h-9 px-3 text-[12px] font-medium text-ts hover:text-tp border border-bd hover:border-ts rounded-full transition-colors cursor-pointer"
              >
                {allOpen ? 'Collapse all' : 'Expand all'}
              </button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {channels.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => jumpToChannel(c.id)}
                  className={clsx(
                    'glass-sub rounded-xl p-3.5 text-left flex flex-col gap-1.5 cursor-pointer transition-colors hover:border-bd-x',
                    c.isActive && 'border-warn/40',
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-[12.5px] font-semibold text-tp">{c.name}</span>
                    <span className={clsx(
                      'font-mono text-[9.5px] font-semibold tracking-[0.06em] px-1.5 py-0.5 rounded border',
                      c.isActive ? 'bg-warn/12 text-warn border-warn/40' : 'bg-bg-h text-tm border-bd',
                    )}>
                      {!hasData ? 'NO DATA' : c.isActive ? 'ACTIVE' : 'QUIET'}
                    </span>
                  </span>
                  <span className={clsx('font-mono text-[15px] font-semibold', c.stage1.colorCls)}>
                    {c.stage1.shortLabel} {c.stage1.valueStr}
                  </span>
                  <span className="text-[11px] text-tm">Triggers above +{c.threshold}% · view details ›</span>
                </button>
              ))}
            </div>
          </section>

          {channels.map(({ id, name, threshold, ...props }) => (
            <ChannelPipelineCard
              key={id}
              id={id}
              expanded={openChannels.has(id)}
              onToggle={() => toggleChannel(id)}
              onOpenSector={onOpenSector}
              stocks={stocks}
              {...props}
            />
          ))}
        </div>
      )}

      {/* Tab 2: Scenario simulator */}
      {activeTab === 'simulator' && (
        <div className="animate-fadeUp">
          <BrentSlider
            liveBrent={assets.brent}
            stocks={stocks}
            cisInput={hasData ? buildCISInput(assets, sectors) : null}
            liveCis={hasData ? cis : null}
          />
        </div>
      )}

      {/* Alert thresholds are calculated from the current market snapshot. */}
      {activeTab === 'analogues' && (
        <div className="animate-fadeUp">
          <Card spotlight={false}>
            <div className="flex items-baseline justify-between mb-[18px]">
              <div className="font-serif text-[22px] text-tp leading-[1.1]">
                Alert <span className="italic text-warn">status</span>
              </div>
              {hasData && (
                <span className="text-[11px] font-semibold text-bear">
                  {triggeredCount} of {Object.keys(THEMATIC_META).length}
                </span>
              )}
            </div>
            <p className="text-[11.5px] text-tm mb-4">Thresholds use the current 1D market snapshot. Historical comparisons are omitted until their sources and calculation windows can be verified.</p>
            <div className="flex flex-col max-h-[420px] overflow-y-auto">
              {Object.entries(THEMATIC_META).map(([id, sig], i, arr) => {
                const triggered  = triggeredIds.has(id);
                const liveAlert  = alerts.find(a => a.id === id);
                const lvlKey     = !hasData ? 'off' : !triggered ? 'off' : liveAlert?.lvl === 'green' ? 'green' : liveAlert?.lvl === 'amber' ? 'amber' : 'red';
                return (
                  <div key={id}
                    className={clsx('flex items-start justify-between gap-2.5 py-3', i < arr.length - 1 && 'border-b border-bd')}>
                    <div className="min-w-0 flex-1">
                      <div className={clsx('text-[12.5px] font-medium', triggered && hasData ? 'text-tp' : 'text-ts')}>
                        {sig.name}
                      </div>
                      <div className="text-[10.5px] text-tm mt-[3px]">{sig.detail}</div>
                      {triggered && liveAlert?.text && (
                        <div className="text-[11px] text-warn mt-1 truncate">{liveAlert.text}</div>
                      )}
                    </div>
                    <span className={clsx(
                      'flex-shrink-0 font-mono text-[9.5px] font-semibold tracking-[0.06em] px-[8px] py-[3px] rounded border whitespace-nowrap mt-0.5',
                      STATUS_CLS[lvlKey],
                    )}>
                      {!hasData ? 'NO DATA' : triggered ? 'TRIGGERED' : 'OFF'}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Tab 3: Correlation Heatmap */}
      {activeTab === 'correlation' && (
        <div className="animate-fadeUp">
          <CorrelationHeatmap history={history} stocks={stocks} />
        </div>
      )}

      {activeTab === 'crisis' && (
        <div className="animate-fadeUp">
          <CrisisComparison backfill={backfill} />
        </div>
      )}

      {activeTab === 'backtest' && (
        <div className="animate-fadeUp">
          <CISBacktest backfill={backfill} cisHistory={cisHistory} />
        </div>
      )}

    </div>
  );
}
