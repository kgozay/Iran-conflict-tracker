import React, { useState } from 'react';
import clsx from 'clsx';
import { Card } from '../widgets/Card.jsx';
import BrentSlider from '../widgets/BrentSlider.jsx';
import CorrelationHeatmap from '../widgets/CorrelationHeatmap.jsx';
import { CountUp, SpotlightCard } from '../widgets/Effects.jsx';

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
  title,
  subtitle,
  isActive,
  spotlightColor,
  stage1,
  stage2,
  stage3,
  netImpact,
}) {
  return (
    <SpotlightCard
      spotlightColor={spotlightColor ?? (isActive ? 'var(--color-bear-spotlight)' : 'var(--color-spotlight)')}
      className="glass rounded-[16px] p-4 sm:p-5 flex flex-col gap-3.5 transition-all duration-300"
    >
      {/* Header */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="font-serif text-[20px] text-tp leading-[1.1]">
            {title}
          </div>
          {subtitle && (
            <div className="text-[11.5px] text-tm mt-0.5">{subtitle}</div>
          )}
        </div>
        <span className={clsx(
          'inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold tracking-[0.06em] px-2.5 py-1 rounded-full border',
          isActive
            ? 'bg-bear/12 text-bear border-bear/40 shadow-[0_0_12px_rgba(249,112,112,0.15)]'
            : 'bg-bg-h text-tm border-bd'
        )}>
          <span className={clsx('w-2 h-2 rounded-full', isActive ? 'bg-bear animate-pulseFast shadow-[0_0_6px_rgba(249,112,112,0.6)]' : 'bg-tm')} />
          {isActive ? 'SHOCK TRANSMITTING' : 'PIPELINE DORMANT'}
        </span>
      </div>

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
              <span className={clsx('font-mono text-[16px] font-bold', stage1.pct >= 0 ? (stage1.inv ? 'text-bear' : 'text-bull') : (stage1.inv ? 'text-bull' : 'text-bear'))}>
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
              Stage 02 · Economic Vector
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
              Stage 03 · JSE Consequence
            </div>
            {stage3.winners?.length > 0 && (
              <div className="mb-2">
                <div className="text-[9.5px] font-mono uppercase tracking-wider text-bull font-semibold mb-1 flex items-center gap-1">
                  <span>▲</span> Tailwind / Beneficiaries
                </div>
                <div className="flex flex-wrap gap-1">
                  {stage3.winners.map((stk, si) => (
                    <span key={si} className="text-[10.5px] font-mono font-medium px-1.5 py-0.5 rounded bg-bull/10 text-bull border border-bull/25">
                      {stk}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {stage3.losers?.length > 0 && (
              <div className="mb-2">
                <div className="text-[9.5px] font-mono uppercase tracking-wider text-bear font-semibold mb-1 flex items-center gap-1">
                  <span>▼</span> Drag / Headwinds
                </div>
                <div className="flex flex-wrap gap-1">
                  {stage3.losers.map((stk, si) => (
                    <span key={si} className="text-[10.5px] font-mono font-medium px-1.5 py-0.5 rounded bg-bear/10 text-bear border border-bear/25">
                      {stk}
                    </span>
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
                    <span key={si} className="text-[10.5px] font-mono font-medium px-1.5 py-0.5 rounded bg-bg-h text-ts border border-bd">
                      {stk}
                    </span>
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
            Net JSE Sector Impact:
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
    </SpotlightCard>
  );
}

/* ── Historical analogues ───────────────────────────────────────────── */
const ANALOGUES = [
  { event:'Gulf War I',     period:'Aug 1990 – Feb 1991', brent:'+74%', zar:'+22%', top40:'-14%', gold:'+8%',  miners:'+11%', regime:'BEARISH' },
  { event:'Kosovo Crisis',  period:'Mar – Jun 1999',      brent:'+32%', zar:'+9%',  top40:'-7%',  gold:'+4%',  miners:'+6%',  regime:'BEARISH' },
  { event:'Iraq War',       period:'Mar – May 2003',      brent:'+41%', zar:'+14%', top40:'+6%',  gold:'+12%', miners:'+18%', regime:'MIXED'   },
  { event:'Libya Conflict', period:'Feb – Oct 2011',      brent:'+25%', zar:'+11%', top40:'-5%',  gold:'+9%',  miners:'+14%', regime:'BEARISH' },
  { event:'Russia–Ukraine', period:'Feb – Sep 2022',      brent:'+58%', zar:'+18%', top40:'-9%',  gold:'+11%', miners:'+22%', regime:'BEARISH' },
  { event:'Oct 7 Hamas',    period:'Oct – Dec 2023',      brent:'+12%', zar:'+8%',  top40:'-4%',  gold:'+7%',  miners:'+9%',  regime:'MIXED'   },
];

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
    { label:'Brent Crude',  key:'brent',     asset: assets.brent,     inv: false },
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
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[11px] font-medium text-tm truncate" title={label}>
                  {label}
                </span>
                <span className={clsx('text-[8.5px] font-mono font-semibold px-1.5 py-0.5 rounded border leading-none shrink-0', status.cls)}>
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
              {src && <span className="text-[9px] text-tx">({src})</span>}
            </div>
          </SpotlightCard>
        );
      })}
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────── */
export default function MacroTransmission({ assets, alerts, hasData, history, stocks }) {
  const [activeTab, setActiveTab] = useState('channels');

  const brentChg = assets.brent?.changePct;
  const brentPrc = assets.brent?.price;
  const zarChg   = assets.usdZar?.changePct;
  const zarPrc   = assets.usdZar?.price;
  const goldChg  = assets.gold?.changePct;
  const goldPrc  = assets.gold?.price;
  const us10yChg = assets.us10y?.changePct;
  const us10yPrc = assets.us10y?.price;
  const us10ySrc = assets.us10y?.source || 'fetching…';

  const fmt = (v, label) => v != null ? `${label ? label + ' ' : ''}${v>=0?'+':''}${v.toFixed(1)}%` : `${label ? label + ' ' : ''}(fetch data)`;

  const triggeredIds = new Set(alerts.map(a => a.id));
  const triggeredCount = Object.keys(THEMATIC_META).filter(id => triggeredIds.has(id)).length;

  const tabs = [
    { id: 'channels',    label: 'Transmission Pipelines & Simulator' },
    { id: 'analogues',   label: 'Historical Analogues & Alerts' },
    { id: 'correlation', label: 'Correlation Heatmap' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-[32px_36px] flex flex-col gap-5 sm:gap-6 animate-fadeUp">

      {/* 7-up macro strip with threshold status pills and PGM basket */}
      <MacroStrip assets={assets} hasData={hasData} />

      {/* Tab Selector */}
      <div className="flex justify-start">
        <div className="grid grid-cols-1 sm:flex sm:items-center w-full sm:w-auto bg-bg-c border border-bd rounded-xl p-[4px] gap-[4px] glass">
          {tabs.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={clsx(
                'min-h-11 px-[18px] py-[8px] text-[13px] font-medium rounded-lg transition-all cursor-pointer select-none',
                activeTab === t.id
                  ? 'bg-bd text-tp shadow-sm font-semibold'
                  : 'text-ts hover:text-tp hover:bg-white/[0.02]'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Transmission Pipelines & Simulator */}
      {activeTab === 'channels' && (
        <div className="flex flex-col gap-6 animate-fadeUp">
          {/* 4 Interactive Transmission Pipeline Cards */}
          <div className="flex flex-col gap-4">
            <ChannelPipelineCard
              title="Oil Price Shock Transmission"
              subtitle="Strait of Hormuz supply disruption & bunker fuel freight premia"
              isActive={hasData && brentChg != null && brentChg > 2}
              spotlightColor={hasData && brentChg != null && brentChg > 2 ? 'var(--color-bear-spotlight)' : undefined}
              stage1={{
                title: 'Brent Crude Oil',
                valueStr: fmt(brentChg),
                priceStr: formatPrice(brentPrc, 'brent'),
                pct: brentChg ?? 0,
                inv: false,
                statusStr: !hasData ? 'STANDBY' : brentChg > 2 ? 'SHOCK ACTIVE' : 'NORMAL RANGE',
                statusCls: !hasData ? 'bg-bg-h text-tm border-bd' : brentChg > 2 ? 'bg-bear/15 text-bear border-bear/40' : 'bg-bg-h text-tm border-bd',
                driver: 'Middle Eastern chokepoint threat, tanker insurance spike & inventory draw',
              }}
              stage2={{
                vectorName: 'Cost-Push Inflation & SARB Hawkish Pause',
                mechanisms: [
                  'Domestic fuel levy & transport inflation (+50c to +R1.20/L per 10% oil surge)',
                  'Logistics CPI passes through to core consumer basket and food distribution',
                  'SARB halts interest rate cuts to defend medium-term inflation target',
                ],
              }}
              stage3={{
                winners: ['Sasol (SOL) · Oil Parity', 'Thungela (TGA) · Energy Arbitrage'],
                losers: ['Banks (SBK, FSR, NED, ABG) · NII Stress', 'Retailers (SHP, MRP, TRU) · Squeeze'],
                neutral: ['Sasol Chemicals', 'Offshore Exporters'],
              }}
              netImpact={{
                verdict: 'Bearish Domestic Credit & Retail | Bullish Synthetic Energy',
                note: 'Fuel cost inflation dampens consumer real disposable income',
                cls: 'text-bear',
              }}
            />

            <ChannelPipelineCard
              title="Currency Transmission & Risk-Off"
              subtitle="Emerging Market portfolio liquidation & US Dollar haven flight"
              isActive={hasData && zarChg != null && zarChg > 0.8}
              spotlightColor={hasData && zarChg != null && zarChg > 0.8 ? 'var(--color-bear-spotlight)' : undefined}
              stage1={{
                title: 'USD / ZAR Exchange Rate',
                valueStr: fmt(zarChg),
                priceStr: formatPrice(zarPrc, 'usdZar'),
                pct: zarChg ?? 0,
                inv: true,
                statusStr: !hasData ? 'STANDBY' : zarChg > 0.8 ? 'PRESSURE ACTIVE' : 'STABLE',
                statusCls: !hasData ? 'bg-bg-h text-tm border-bd' : zarChg > 0.8 ? 'bg-bear/15 text-bear border-bear/40' : 'bg-bg-h text-tm border-bd',
                driver: 'Global haven flight into USD; portfolio outflows from high-beta EM debt',
              }}
              stage2={{
                vectorName: 'Import Inflation & Discretionary Margin Squeeze',
                mechanisms: [
                  'Landed cost of imported capital equipment, electronics & textiles spikes',
                  'SAGB 10-year sovereign bond yields widen on sovereign risk premium',
                  'Offshore earnings translation creates windfall cash flow for multinationals',
                ],
              }}
              stage3={{
                winners: ['Richemont (CFR) · Luxury Haven', 'BAT (BTI) · GBP Dividend', 'Naspers / Prosus (NPN/PRX)'],
                losers: ['Mr Price (MRP) & Truworths (TRU)', 'Tiger Brands (TBS) & AVI'],
                neutral: ['Telecoms (MTN, VOD) · Mixed FX'],
              }}
              netImpact={{
                verdict: 'Rand Hedges Outperform | SA Domestic Cyclicals Underperform',
                note: 'Dual-listed heavyweights cushion Top40 index while local retail de-rates',
                cls: 'text-warn',
              }}
            />

            <ChannelPipelineCard
              title="Safe Haven & Precious Metals Transmission"
              subtitle="Global flight from fiat debasement & sovereign reserve asset bidding"
              isActive={hasData && goldChg != null && goldChg > 1}
              spotlightColor={hasData && goldChg != null && goldChg > 1 ? 'var(--color-bull-spotlight)' : undefined}
              stage1={{
                title: 'Gold & PGM Metal Basket',
                valueStr: fmt(goldChg),
                priceStr: formatPrice(goldPrc, 'gold'),
                pct: goldChg ?? 0,
                inv: false,
                statusStr: !hasData ? 'STANDBY' : goldChg > 1 ? 'HAVEN BID ACTIVE' : 'STEADY',
                statusCls: !hasData ? 'bg-bg-h text-tm border-bd' : goldChg > 1 ? 'bg-bull/15 text-bull border-bull/40' : 'bg-bg-h text-tm border-bd',
                driver: 'Central bank accumulation, sovereign wealth haven bid & geopolitical hedging',
              }}
              stage2={{
                vectorName: 'Mining Terms-of-Trade & Free Cash Flow Expansion',
                mechanisms: [
                  'Rand gold price tests all-time highs (dual haven spot + weak ZAR effect)',
                  'Operating margins at deep-level mines surge above AISC breakeven points',
                  'Mining royalty & corporate tax receipts bolster SA National Treasury buffer',
                ],
              }}
              stage3={{
                winners: ['Gold Fields (GFI) · Unhedged', 'AngloGold (ANG) · Tier-1', 'Harmony (HAR) · High Beta', 'Amplats (AMS) · PGM Bid'],
                losers: [],
                neutral: ['Impala Platinum (IMP)', 'Sibanye-Stillwater (SSW)'],
              }}
              netImpact={{
                verdict: 'Strongly Bullish Precious Metals & JSE Mining Complex',
                note: 'Direct monetary hedge protecting South African portfolios during regional war',
                cls: 'text-bull',
              }}
            />

            <ChannelPipelineCard
              title="Global Discount Rate & Duration Compression"
              subtitle="US Treasury yield surge & international cost of equity expansion"
              isActive={hasData && us10yChg != null && us10yChg > 1.5}
              spotlightColor={hasData && us10yChg != null && us10yChg > 1.5 ? 'var(--color-bear-spotlight)' : undefined}
              stage1={{
                title: 'US 10-Year Bond Yield',
                valueStr: fmt(us10yChg),
                priceStr: formatPrice(us10yPrc, 'us10y'),
                pct: us10yChg ?? 0,
                inv: true,
                statusStr: !hasData ? 'STANDBY' : us10yChg > 1.5 ? 'RATE SHOCK ACTIVE' : 'RANGE BOUND',
                statusCls: !hasData ? 'bg-bg-h text-tm border-bd' : us10yChg > 1.5 ? 'bg-bear/15 text-bear border-bear/40' : 'bg-bg-h text-tm border-bd',
                driver: `Global inflation term premium repricing · Source: ${us10ySrc}`,
              }}
              stage2={{
                vectorName: 'Equity Valuation Multiple Contraction',
                mechanisms: [
                  'Global risk-free hurdle rate escalates, raising cost of capital across EMs',
                  'Foreign allocators de-risk long-duration tech, high-P/E equities & bonds',
                  'JSE Top40 trailing valuation multiples compress to match bond yields',
                ],
              }}
              stage3={{
                winners: ['Cash-Rich High-Yield Defensives', 'Short-Duration Value Exporters'],
                losers: ['Listed Property / REITs (GRT, RDF)', 'High-Multiple Growth (CPI, PRX)'],
                neutral: ['JSE Resource Majors'],
              }}
              netImpact={{
                verdict: (us10yChg ?? 0) > 0 ? 'Multiple Contraction on Long-Duration SA Equities' : 'Discount Rate Easing: Valuation Tailwinds for EMs',
                note: 'Higher global discount rates restrict equity multiples for capital importers',
                cls: (us10yChg ?? 0) > 0 ? 'text-bear' : 'text-bull',
              }}
            />
          </div>

          {/* Brent slider simulator taking full width */}
          <div className="w-full">
            <BrentSlider liveBrent={assets.brent} stocks={stocks} />
          </div>
        </div>
      )}

      {/* Tab 2: Historical Analogues & Alerts
          (Both Card panels below pick up SpotlightCard automatically via
          the patched Card.jsx — `spotlight={false}` opts out if needed.) */}
      {activeTab === 'analogues' && (
        <div className="grid grid-cols-1 xl:grid-cols-[1.55fr_1fr] gap-[18px] items-start animate-fadeUp">
          {/* Historical analogues — table-heavy card; spotlight={false} keeps
              the hover halo from competing with row highlights. */}
          <Card spotlight={false}>
            <div className="flex items-baseline justify-between mb-[18px]">
              <div className="font-serif text-[22px] text-tp leading-[1.1]">
                Historical <span className="italic text-warn">analogues</span>
              </div>
              <span className="text-[11px] text-tm">SA market reaction · reference data</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr>
                    {['Event','Period','Brent','USD/ZAR','Watchlist avg','Gold','SA Miners','Regime'].map(h => (
                      <th key={h} className="text-left text-[10px] font-medium text-tm tracking-[0.06em] uppercase pb-3 px-3 border-b border-bd whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ANALOGUES.map((row, i) => {
                    const t40Up  = row.top40.startsWith('+');
                    const regCls = row.regime === 'BEARISH'
                      ? 'bg-bear/12 text-bear border-bear/40'
                      : row.regime === 'MIXED'
                        ? 'bg-warn/12 text-warn border-warn/40'
                        : 'bg-bull/12 text-bull border-bull/40';
                    return (
                      <tr key={row.event} className={clsx('hover:bg-bg-h transition-colors', i < ANALOGUES.length - 1 && 'border-b border-bd')}>
                        <td className="py-[14px] px-3 font-medium text-tp whitespace-nowrap">{row.event}</td>
                        <td className="py-[14px] px-3 text-ts text-[11.5px] whitespace-nowrap">{row.period}</td>
                        <td className="py-[14px] px-3 font-mono font-semibold text-bull">{row.brent}</td>
                        <td className="py-[14px] px-3 font-mono font-semibold text-bear">{row.zar}</td>
                        <td className={clsx('py-[14px] px-3 font-mono font-semibold', t40Up ? 'text-bull' : 'text-bear')}>{row.top40}</td>
                        <td className="py-[14px] px-3 font-mono font-semibold text-bull">{row.gold}</td>
                        <td className="py-[14px] px-3 font-mono font-semibold text-bull">{row.miners}</td>
                        <td className="py-[14px] px-3">
                          <span className={clsx('font-mono text-[9.5px] font-semibold tracking-[0.04em] px-[9px] py-[3px] rounded-full border', regCls)}>
                            {row.regime}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Alert status — uses Card default (spotlight on) */}
          <Card>
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

    </div>
  );
}
