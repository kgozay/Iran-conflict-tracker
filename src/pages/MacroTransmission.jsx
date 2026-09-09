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

/* ── Flow node styles ───────────────────────────────────────────────── */
const NODE_CLS = {
  red:     'bg-bear/12 text-bear border border-bear/40',
  warn:    'bg-warn/12 text-warn border border-warn/40',
  green:   'bg-bull/12 text-bull border border-bull/40',
  neutral: 'bg-bg-h text-ts border border-bd',
};
const ACTIVE_NODE_PULSE = {
  red:     'active-node-red',
  warn:    'active-node-warn',
  green:   'active-node-green',
};
function Node({ v, active, children }) {
  return (
    <span className={clsx(
      'px-[10px] py-[5px] rounded-md text-[11px] font-medium whitespace-nowrap transition-all duration-300',
      NODE_CLS[v] ?? NODE_CLS.neutral,
      active && ACTIVE_NODE_PULSE[v]
    )}>
      {children}
    </span>
  );
}
function Arr({ active }) {
  return (
    <span className={clsx(
      'text-[14px] select-none transition-all duration-300',
      active ? 'text-warn font-semibold active-arrow px-[2px]' : 'text-tm'
    )}>
      ›
    </span>
  );
}

/* ── Transmission channel card ─────────────────────────────────────── *
 * PATCH: outer container is now <SpotlightCard>. Spotlight colour shifts
 * to the bear tint when the channel is firing.
 */
function ChannelCard({ title, italic, rows, impact, impactCls, isActive }) {
  const spot = isActive ? 'var(--color-bear-spotlight)' : 'var(--color-spotlight)';
  return (
    <SpotlightCard
      spotlightColor={spot}
      className="glass rounded-[16px] p-[22px_26px] flex flex-col gap-[14px]"
    >
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <div className="font-serif text-[20px] text-tp leading-[1.1]">
          {title} <span className="italic text-warn">{italic}</span>
        </div>
        <span className={clsx(
          'inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.06em] px-[9px] py-[3px] rounded-full border',
          isActive
            ? 'bg-bear/12 text-bear border-bear/40'
            : 'bg-bg-h text-tm border-bd',
        )}>
          <span className={clsx('w-[6px] h-[6px] rounded-full', isActive ? 'bg-bear shadow-[0_0_6px_rgba(249,112,112,0.55)]' : 'bg-tm')} />
          {isActive ? 'ACTIVE' : 'DORMANT'}
        </span>
      </div>

      {/* Flow rows */}
      <div className="flex flex-col gap-2">
        {rows.map((row, ri) => (
          <div key={ri} className="flex items-center gap-1.5 flex-wrap">
            {row.map((n, ni) =>
              ni === 0
                ? <Node key={ni} v={n.v} active={isActive}>{n.t}</Node>
                : <React.Fragment key={ni}>
                    <Arr active={isActive} />
                    <Node v={n.v} active={isActive}>{n.t}</Node>
                  </React.Fragment>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="pt-[14px] border-t border-bd mt-0.5">
        <div className="text-[10.5px] font-medium text-tm tracking-[0.06em] uppercase">Net sector impact</div>
        <div className={clsx('text-[13.5px] font-semibold mt-[3px]', impactCls)}>{impact}</div>
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

/* ── MacroStrip ─────────────────────────────────────────────────────── *
 * PATCH: each tile wrapped in <SpotlightCard> with directional tint;
 *        % change rendered with <CountUp>.
 */
function MacroStrip({ assets, hasData }) {
  const items = [
    { label:'Brent',    key:'brent',    inv:false },
    { label:'USD/ZAR',  key:'usdZar',   inv:true  },
    { label:'Gold',     key:'gold',     inv:false },
    { label:'Platinum', key:'platinum', inv:false },
    { label:'US 10Y',   key:'us10y',    inv:true  },
    { label:'Palladium',key:'palladium',inv:false },
  ];

  if (!hasData) {
    return (
      <div className="glass rounded-xl px-4 py-3 text-[13px] text-tm text-center">
        Fetch live data to see macro figures in the transmission analysis
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
      {items.map(({ label, key, inv }) => {
        const asset = assets[key];
        const pct   = asset?.changePct;
        const good  = pct == null ? null : inv ? pct <= 0 : pct >= 0;
        const col   = pct == null ? 'text-tm' : good ? 'text-bull' : 'text-bear';
        const src   = asset?.source;
        const spot  = pct == null ? 'var(--color-spotlight)'
          : good ? 'var(--color-bull-spotlight)' : 'var(--color-bear-spotlight)';

        return (
          <SpotlightCard
            key={key}
            spotlightColor={spot}
            className="glass-sub rounded-xl py-[14px] px-[18px] text-center"
          >
            <div className="text-[11px] font-medium text-tm">
              {label}
              {src && <span className="text-tx ml-1">({src})</span>}
            </div>
            <div className={clsx('font-serif text-[28px] leading-none tracking-[-0.02em] mt-1', col)}>
              {pct != null
                ? <><span>{pct >= 0 ? '+' : ''}</span><CountUp to={pct} decimals={2} suffix="%" /></>
                : '—'}
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
  const zarChg   = assets.usdZar?.changePct;
  const goldChg  = assets.gold?.changePct;
  const us10yChg = assets.us10y?.changePct;
  const us10yPrc = assets.us10y?.price;
  const us10ySrc = assets.us10y?.source || 'fetching…';

  const fmt = (v, label) => v != null ? `${label} ${v>=0?'+':''}${v.toFixed(1)}%` : `${label} (fetch data)`;

  const triggeredIds = new Set(alerts.map(a => a.id));
  const triggeredCount = Object.keys(THEMATIC_META).filter(id => triggeredIds.has(id)).length;

  const tabs = [
    { id: 'channels',    label: 'Transmission Channels & Simulator' },
    { id: 'analogues',   label: 'Historical Analogues & Alerts' },
    { id: 'correlation', label: 'Correlation Heatmap' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-[32px_36px] flex flex-col gap-5 sm:gap-6 animate-fadeUp">

      {/* 6-up macro strip */}
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

      {/* Tab 1: Transmission Map & Simulator */}
      {activeTab === 'channels' && (
        <div className="flex flex-col gap-6 animate-fadeUp">
          {/* Transmission channels 2×2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ChannelCard title="Oil price" italic="shock"
              isActive={hasData && brentChg != null && brentChg > 2}
              impactCls="text-bear" impact="JSE Banks / Retailers — DOWN"
              rows={[
                [{v:'red',t:fmt(brentChg,'Brent')},{v:'warn',t:'Fuel levy up'},{v:'warn',t:'CPI up'},{v:'red',t:'SARB hawkish'}],
                [{v:'red',t:'Rates hold/up'},{v:'red',t:'Bond sell-off'},{v:'red',t:'Banks NII ↓'},{v:'red',t:'JSE Banks ↓'}],
                [{v:'green',t:'Sasol revenue ↑'},{v:'green',t:'Coal / gas ↑'},{v:'green',t:'Energy basket ↑'}],
              ]}
            />
            <ChannelCard title="Currency" italic="pressure"
              isActive={hasData && zarChg != null && zarChg > 0.8}
              impactCls="text-bear" impact="Retailers / Industrials — DOWN"
              rows={[
                [{v:'red',t:fmt(zarChg,'USD/ZAR')},{v:'warn',t:'Import CPI ↑'},{v:'red',t:'Retail margins ↓'}],
                [{v:'red',t:'Consumer conf ↓'},{v:'red',t:'SA spend ↓'},{v:'red',t:'Retail rev ↓'}],
                [{v:'red',t:'USD debt cost ↑'},{v:'red',t:'Corp margins ↓'},{v:'neutral',t:'Offshore JSE flat'}],
              ]}
            />
            <ChannelCard title="Safe haven /" italic="mining"
              isActive={hasData && goldChg != null && goldChg > 1}
              impactCls="text-bull" impact="Gold miners / PGMs — UP"
              rows={[
                [{v:'green',t:fmt(goldChg,'Gold')},{v:'green',t:'Mining rev ↑'},{v:'green',t:'GFI / ANG ↑'}],
                [{v:'green',t:'PGMs bid'},{v:'green',t:'IMP / AMS ↑'},{v:'green',t:'Mining basket ↑'}],
                [{v:'warn',t:'ZAR weak'},{v:'green',t:'ZAR-denom rev ↑'},{v:'green',t:'Miner margins ↑'}],
              ]}
            />
            <ChannelCard title="US rates /" italic="global discount rate"
              isActive={hasData && us10yChg != null && us10yChg > 2}
              impactCls={(us10yChg ?? 0) > 0 ? 'text-bear' : 'text-bull'}
              impact={(us10yChg ?? 0) > 0 ? 'Higher discount rate: EM assets pressured' : 'Lower discount rate: EM assets supported'}
              rows={[
                [{v:'red',t:fmt(us10yChg,'US 10Y')},{v:'warn',t:`Yield ${us10yPrc?.toFixed(3)??'—'}%`},{v:'neutral',t:`Source: ${us10ySrc}`}],
                [{v:'red',t:'Global discount rate ↑'},{v:'red',t:'EM funding cost ↑'},{v:'red',t:'Equity multiples ↓'}],
                [{v:'warn',t:'Dollar support'},{v:'red',t:'Rand pressure'},{v:'red',t:'JSE duration ↓'}],
              ]}
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
