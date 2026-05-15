import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import clsx from 'clsx';
import { Card } from '../widgets/Card.jsx';
import BrentSlider from '../widgets/BrentSlider.jsx';
import {
  BrentIcon, FxIcon, GoldIcon, BondIcon,
  AlertIcon, HomeIcon, CoalIcon, PeaceIcon,
} from '../components/Icons.jsx';
import CorrelationHeatmap from '../widgets/CorrelationHeatmap.jsx';

/* ── Flow node styles ───────────────────────────────────────────────── */
const NODE_CLS = {
  red:     'bg-bear/12 text-bear border border-bear/40',
  warn:    'bg-warn/12 text-warn border border-warn/40',
  green:   'bg-bull/12 text-bull border border-bull/40',
  neutral: 'bg-bg-h text-ts border border-bd',
};
function Node({ v, children }) {
  return (
    <span className={clsx('px-[10px] py-[5px] rounded-md text-[11px] font-medium whitespace-nowrap', NODE_CLS[v] ?? NODE_CLS.neutral)}>
      {children}
    </span>
  );
}
function Arr() { return <span className="text-tm text-[14px] select-none">›</span>; }

/* ── Transmission channel card ──────────────────────────────────────── */
function ChannelCard({ title, italic, rows, impact, impactCls, isActive }) {
  return (
    <div className="bg-bg-c border border-bd rounded-[14px] p-[22px_26px] flex flex-col gap-[14px]">
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
                ? <Node key={ni} v={n.v}>{n.t}</Node>
                : <React.Fragment key={ni}><Arr /><Node v={n.v}>{n.t}</Node></React.Fragment>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="pt-[14px] border-t border-bd mt-0.5">
        <div className="text-[10.5px] font-medium text-tm tracking-[0.06em] uppercase">Net sector impact</div>
        <div className={clsx('text-[13.5px] font-semibold mt-[3px]', impactCls)}>{impact}</div>
      </div>
    </div>
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
  'r2035-red':       { name:'SA 10Y Critical',          detail:'SA 10Y proxy change >+0.3%' },
  'r2035-amber':     { name:'SA 10Y Amber',             detail:'SA 10Y proxy change >+0.1%' },
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

/* ── SA 10Y data ────────────────────────────────────────────────────── */
const SARB_REPO_BY_MONTH = {
  'Apr 25':7.50,'May 25':7.25,'Jun 25':7.25,'Jul 25':7.00,'Aug 25':7.00,
  'Sep 25':7.00,'Oct 25':7.00,'Nov 25':6.75,'Dec 25':6.75,
  'Jan 26':6.75,'Feb 26':6.75,'Mar 26':6.75,'Apr 26':6.75,
};
const YIELD_FALLBACK = [
  {month:'Apr 25',yield:10.95},{month:'May 25',yield:10.70},{month:'Jun 25',yield:10.45},
  {month:'Jul 25',yield:10.20},{month:'Aug 25',yield:10.00},{month:'Sep 25',yield:9.70},
  {month:'Oct 25',yield:9.34},{month:'Nov 25',yield:8.98},{month:'Dec 25',yield:8.80},
  {month:'Jan 26',yield:8.60},{month:'Feb 26',yield:8.50},{month:'Mar 26',yield:8.40},
  {month:'Apr 26',yield:8.35},{month:'May 26',yield:8.35},
];

function buildYieldChartData(liveHistory) {
  const src = liveHistory?.length >= 3 ? liveHistory : YIELD_FALLBACK;
  return src.map(row => ({
    month: row.month,
    r2035: row.yield,
    sarb:  SARB_REPO_BY_MONTH[row.month] ?? null,
  }));
}

const MONO_TICK = { fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fill: '#a39d8d' };

const YTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-s border border-bd rounded-lg px-3 py-2 font-mono text-[11px]">
      <div className="text-ts mb-1">{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value != null ? `${p.value.toFixed(2)}%` : '—'}
        </div>
      ))}
    </div>
  );
};

/* ── MacroStrip ─────────────────────────────────────────────────────── */
function MacroStrip({ assets, hasData }) {
  const items = [
    { label:'Brent',    key:'brent',    inv:false },
    { label:'USD/ZAR',  key:'usdZar',   inv:true  },
    { label:'Gold',     key:'gold',     inv:false },
    { label:'Platinum', key:'platinum', inv:false },
    { label:'SA 10Y',   key:'r2035',    inv:true  },
    { label:'Palladium',key:'palladium',inv:false },
  ];

  if (!hasData) {
    return (
      <div className="bg-bg-c border border-bd rounded-xl px-4 py-3 text-[13px] text-tm text-center">
        Fetch live data to see macro figures in the transmission analysis
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
      {items.map(({ label, key, inv }) => {
        const asset = assets[key];
        const pct   = asset?.changePct;
        const good  = pct == null ? null : inv ? pct <= 0 : pct >= 0;
        const col   = pct == null ? 'text-tm' : good ? 'text-bull' : 'text-bear';
        const src   = asset?.source;
        return (
          <div key={key} className="bg-bg-c border border-bd rounded-xl py-[14px] px-[18px] text-center">
            <div className="text-[11px] font-medium text-tm">
              {label}
              {src && <span className="text-tx ml-1">({src})</span>}
            </div>
            <div className={clsx('font-serif text-[28px] leading-none tracking-[-0.02em] mt-1', col)}>
              {pct != null ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%` : '—'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────── */
export default function MacroTransmission({ assets, alerts, hasData, r2035History, history, stocks, sectors }) {
  const brentChg = assets.brent?.changePct;
  const zarChg   = assets.usdZar?.changePct;
  const goldChg  = assets.gold?.changePct;
  const r2035Chg = assets.r2035?.changePct;
  const r2035Prc = assets.r2035?.price;
  const r2035Src = assets.r2035?.source || 'fetching…';

  const fmt = (v, label) => v != null ? `${label} ${v>=0?'+':''}${v.toFixed(1)}%` : `${label} (fetch data)`;

  const yieldChartData = buildYieldChartData(r2035History);
  const livePrice      = assets.r2035?.isLive ? assets.r2035?.price : null;
  const allYields      = yieldChartData.map(d => d.r2035).filter(v => v != null);
  const allRepos       = yieldChartData.map(d => d.sarb).filter(v => v != null);
  const yMin           = Math.floor(Math.min(...allYields, ...allRepos, livePrice ?? 99) - 0.5);
  const yMax           = Math.ceil(Math.max(...allYields, livePrice ?? 0) + 1);

  const triggeredIds = new Set(alerts.map(a => a.id));
  const triggeredCount = Object.keys(THEMATIC_META).filter(id => triggeredIds.has(id)).length;

  const chartSourceLabel = assets.r2035?.source
    ? `${String(assets.r2035.source).toUpperCase()} · SA 10Y`
    : 'SA 10Y';

  return (
    <div className="p-[32px_36px] flex flex-col gap-6 animate-fadeUp">

      {/* 6-up macro strip */}
      <MacroStrip assets={assets} hasData={hasData} />

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
        <ChannelCard title="SA 10Y /" italic="SARB"
          isActive={hasData && r2035Chg != null && r2035Chg > 0.1}
          impactCls={(r2035Chg ?? 0) > 0 ? 'text-bear' : 'text-bull'}
          impact={(r2035Chg ?? 0) > 0 ? 'Tighter conditions — Banks DOWN' : 'Easing conditions — Banks UP'}
          rows={[
            [{v:'red',t:fmt(r2035Chg,'SA 10Y')},{v:'warn',t:`Yield ${r2035Prc?.toFixed(3)??'—'}%`},{v:'neutral',t:`Source: ${r2035Src}`}],
            [{v:'red',t:'NII outlook ↓'},{v:'red',t:'Credit quality ↑'},{v:'red',t:'Bank P/B ↓'}],
            [{v:'warn',t:'Consumer rates ↑'},{v:'red',t:'Debt servicing ↑'},{v:'red',t:'Retail spend ↓'}],
          ]}
        />
      </div>

      {/* Analogues + Alert status */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.55fr_1fr] gap-[18px] items-start">

        {/* Historical analogues */}
        <Card>
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
                  {['Event','Period','Brent','USD/ZAR','JSE Top 40','Gold','SA Miners','Regime'].map(h => (
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

        {/* Alert status */}
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

      {/* Correlation heatmap (step 9 fixes the labels) */}
      <CorrelationHeatmap history={history} stocks={stocks} />

      {/* Brent slider + SA 10Y yield chart */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-[18px]">
        <BrentSlider liveBrent={assets.brent} />

        <Card>
          <div className="flex items-baseline justify-between mb-[18px]">
            <div className="font-serif text-[22px] text-tp leading-[1.1]">
              SA 10Y & <span className="italic text-warn">SARB repo — 12M path</span>
            </div>
            <span className="font-mono text-[10px] text-tm">{chartSourceLabel}</span>
          </div>

          {assets.r2035?.isLive && (
            <div className="inline-flex items-center gap-3 px-[14px] py-[10px] rounded-lg mb-4"
              style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)' }}>
              <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] text-bull font-semibold">
                <span className="w-[6px] h-[6px] rounded-full bg-bull" style={{ boxShadow: '0 0 6px rgba(52,211,153,0.6)' }} />
                LIVE
              </span>
              <span className="font-mono text-[14px] font-semibold text-tp">{assets.r2035.price?.toFixed(3)}%</span>
              <span className={clsx('font-mono text-[12px] font-semibold', (assets.r2035.changePct ?? 0) > 0 ? 'text-bear' : 'text-bull')}>
                {(assets.r2035.changePct ?? 0) >= 0 ? '+' : ''}{assets.r2035.changePct?.toFixed(3)}% day
              </span>
              <span className="font-mono text-[10px] text-tm ml-auto">
                {assets.r2035.source || 'live'} · {assets.r2035.date || ''}
              </span>
            </div>
          )}

          <div style={{ height: assets.r2035?.isLive ? 200 : 230 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yieldChartData} margin={{ top:4, right:8, bottom:0, left:-8 }}>
                <CartesianGrid stroke="#2d2922" strokeDasharray="3 4" />
                <XAxis dataKey="month" tick={MONO_TICK} axisLine={false} tickLine={false} interval={2} />
                <YAxis domain={[yMin, yMax]} tickFormatter={v => `${v.toFixed(1)}%`}
                  tick={MONO_TICK} axisLine={false} tickLine={false} />
                <Tooltip content={<YTip />} cursor={{ stroke:'rgba(255,255,255,0.08)' }} />
                <ReferenceLine y={10.0} stroke="rgba(249,112,112,0.4)" strokeDasharray="4 4"
                  label={{ value:'10% stress zone', position:'insideTopRight', fontSize:8, fill:'#f97070', fontFamily:'JetBrains Mono, monospace' }} />
                {livePrice != null && livePrice >= yMin && livePrice <= yMax && (
                  <ReferenceLine y={livePrice} stroke="rgba(232,176,74,0.8)" strokeDasharray="4 2"
                    label={{ value:`Live ${livePrice.toFixed(2)}%`, position:'insideBottomLeft', fontSize:8, fill:'#e8b04a', fontFamily:'JetBrains Mono, monospace' }} />
                )}
                <Line type="monotone" dataKey="r2035" name="SA 10Y yield"
                  stroke="#e8b04a" strokeWidth={2.2} dot={false} activeDot={{ r:3 }} />
                <Line type="monotone" dataKey="sarb" name="SARB repo"
                  stroke="rgba(52,211,153,0.7)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} activeDot={{ r:3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex gap-[18px] mt-3.5 font-mono text-[11px] text-ts">
            <span className="inline-flex items-center gap-[7px]">
              <span className="w-[22px] h-[2px] bg-warn inline-block" />SA 10Y yield (proxy)
            </span>
            <span className="inline-flex items-center gap-[7px]" style={{ opacity: 0.7 }}>
              <span className="w-[22px] h-[2px] bg-bull inline-block" style={{ borderTop: '1px dashed rgba(52,211,153,0.7)' }} />SARB repo
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}
