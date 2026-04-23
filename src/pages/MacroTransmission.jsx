import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import clsx from 'clsx';
import { Card, CardHeader } from '../widgets/Card.jsx';
import BrentSlider from '../widgets/BrentSlider.jsx';
import {
  BrentIcon, FxIcon, GoldIcon, BondIcon,
  AlertIcon, HomeIcon, CoalIcon, PeaceIcon,
  ChartIcon, BoltIcon, DotIcon,
} from '../components/Icons.jsx';

/* ─── Flow nodes ──────────────────────────────────────────────────── */
const NODE_CLS = {
  red:     'bg-bear/10 text-bear border border-bear/30',
  warn:    'bg-warn/10 text-warn border border-warn/30',
  green:   'bg-bull/10 text-bull border border-bull/30',
  neutral: 'bg-bg-e text-ts border border-bd',
};
function Node({ v, children }) {
  return (
    <span className={clsx('px-2 py-1 rounded font-mono text-[8px] tracking-[0.5px]', NODE_CLS[v] ?? NODE_CLS.neutral)}>
      {children}
    </span>
  );
}
function Arr() { return <span className="text-tm text-[10px]">&rsaquo;</span>; }

function ChannelCard({ Icon, title, rows, impact, impactCls, isActive }) {
  return (
    <Card>
      <div className="flex items-center gap-2 font-mono text-[9px] tracking-[2px] text-ts uppercase mb-3">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {title}
      </div>
      <div className="space-y-2">
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
      <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-bd-x">
        <div>
          <div className="font-mono text-[8px] text-tm">NET SECTOR IMPACT</div>
          <div className={clsx('font-mono text-[12px] font-semibold mt-0.5', impactCls)}>{impact}</div>
        </div>
        <span className={clsx(
          'inline-flex items-center gap-1 font-mono text-[8px] px-2 py-0.5 rounded border',
          isActive
            ? 'bg-bear/10 text-bear border-bear/30'
            : 'bg-bg-e text-tm border-bd',
        )}>
          <DotIcon className="w-1.5 h-1.5" />
          {isActive ? 'ACTIVE' : 'DORMANT'}
        </span>
      </div>
    </Card>
  );
}

/* ─── Historical analogues ────────────────────────────────────────── */
const ANALOGUES = [
  { event:'Gulf War I',     period:'Aug 1990–Feb 1991', brent:'+74%', zar:'+22%', top40:'-14%', gold:'+8%',  miners:'+11%', regime:'BEARISH' },
  { event:'Kosovo Crisis',  period:'Mar–Jun 1999',       brent:'+32%', zar:'+9%',  top40:'-7%',  gold:'+4%',  miners:'+6%',  regime:'BEARISH' },
  { event:'Iraq War',       period:'Mar–May 2003',       brent:'+41%', zar:'+14%', top40:'+6%',  gold:'+12%', miners:'+18%', regime:'MIXED'   },
  { event:'Libya Conflict', period:'Feb–Oct 2011',       brent:'+25%', zar:'+11%', top40:'-5%',  gold:'+9%',  miners:'+14%', regime:'BEARISH' },
  { event:'Russia–Ukraine', period:'Feb–Sep 2022',       brent:'+58%', zar:'+18%', top40:'-9%',  gold:'+11%', miners:'+22%', regime:'BEARISH' },
  { event:'Oct 7 Hamas',    period:'Oct–Dec 2023',       brent:'+12%', zar:'+8%',  top40:'-4%',  gold:'+7%',  miners:'+9%',  regime:'MIXED'   },
];

/* ─── R2035 + SARB chart ──────────────────────────────────────────
 * The yield line is driven by live history from /api/sarb (Stooq primary).
 * FALLBACK values here reflect the actual trajectory: ~11% in Apr 25
 * declining to ~8.35% in Apr 26 as SARB cut the repo rate 7 consecutive
 * times from 8.25% → 6.75%.
 */
const SARB_REPO_BY_MONTH = {
  // Repo rate on the last day of each month (SA Reserve Bank MPC decisions)
  'Apr 25': 7.50, 'May 25': 7.25, 'Jun 25': 7.25,
  'Jul 25': 7.00, 'Aug 25': 7.00, 'Sep 25': 7.00,
  'Oct 25': 7.00, 'Nov 25': 6.75, 'Dec 25': 6.75,
  'Jan 26': 6.75, 'Feb 26': 6.75, 'Mar 26': 6.75, 'Apr 26': 6.75,
};

const YIELD_FALLBACK = [
  { month:'Apr 25', yield:10.95 }, { month:'May 25', yield:10.70 },
  { month:'Jun 25', yield:10.45 }, { month:'Jul 25', yield:10.20 },
  { month:'Aug 25', yield:10.00 }, { month:'Sep 25', yield:9.70  },
  { month:'Oct 25', yield:9.34  }, { month:'Nov 25', yield:8.98  },
  { month:'Dec 25', yield:8.80  }, { month:'Jan 26', yield:8.60  },
  { month:'Feb 26', yield:8.50  }, { month:'Mar 26', yield:8.40  },
  { month:'Apr 26', yield:8.35  },
];

function buildYieldChartData(liveHistory) {
  const src = (liveHistory && liveHistory.length >= 3) ? liveHistory : YIELD_FALLBACK;
  return src.map(row => ({
    month: row.month,
    r2035: row.yield,
    sarb:  SARB_REPO_BY_MONTH[row.month] ?? null,
  }));
}

const TICK = { fontFamily:'IBM Plex Mono', fontSize:9, fill:'#6e80a0' };

const YTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-s border border-bd rounded px-3 py-2 font-mono text-[10px]">
      <div className="text-ts mb-1">{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value != null ? `${p.value.toFixed(2)}%` : '—'}
        </div>
      ))}
    </div>
  );
};

/* ─── Alert status panel ──────────────────────────────────────────── */
const THEMATIC_META = {
  'oil-shock':       { Icon: BrentIcon, name:'Oil Shock Alert',        detail:'Brent >+3% AND ZAR >+0.8%'                         },
  'domestic-stress': { Icon: HomeIcon,  name:'Domestic Stress Alert',  detail:'ZAR >+1% AND Banks <-1.5% AND Retail <-1.5%'       },
  'miner-support':   { Icon: GoldIcon,  name:'Miner Support Alert',    detail:'Gold >+1.5% AND ZAR >+0.5% AND Miners >market +1%' },
  'deescalation':    { Icon: PeaceIcon, name:'De-escalation Relief',   detail:'Brent <-2% AND ZAR stable AND market >+1%'         },
  'r2035-red':       { Icon: BondIcon,  name:'R2035 Bond Critical',    detail:'R2035 yield change >+0.3%'                         },
  'r2035-amber':     { Icon: BondIcon,  name:'R2035 Bond Amber',       detail:'R2035 yield change >+0.1%'                         },
  'brent-red':       { Icon: AlertIcon, name:'Brent >+4% Critical',    detail:'Hard red threshold'                                },
  'brent-amber':     { Icon: AlertIcon, name:'Brent >+2% Amber',       detail:'Amber threshold'                                   },
  'zar-red':         { Icon: AlertIcon, name:'USD/ZAR >+1.5% Critical',detail:'Hard red threshold'                                },
  'zar-amber':       { Icon: AlertIcon, name:'USD/ZAR >+0.8% Amber',   detail:'Amber threshold'                                   },
  'gold-red':        { Icon: AlertIcon, name:'Gold >+2% Red',          detail:'Red threshold'                                     },
  'gold-amber':      { Icon: AlertIcon, name:'Gold >+1% Amber',        detail:'Amber threshold'                                   },
  'top40-red':       { Icon: ChartIcon, name:'Market <-2% Red',        detail:'Hard red threshold'                                },
  'top40-amber':     { Icon: ChartIcon, name:'Market <-1% Amber',      detail:'Amber threshold'                                   },
  'energy-hot':      { Icon: BoltIcon,  name:'Energy RED-HOT',         detail:'Energy basket >+4%'                                },
  'energy-amber':    { Icon: BoltIcon,  name:'Energy Bullish',         detail:'Energy basket >+2%'                                },
};

const TAG_CLS = {
  red:   'bg-bear/10 text-bear border-bear/30 font-semibold',
  green: 'bg-bull/10 text-bull border-bull/30 font-semibold',
  amber: 'bg-warn/10 text-warn border-warn/30',
  off:   'bg-bg-e text-tm border-bd',
};

function AlertPanel({ alerts, hasData }) {
  const triggeredIds = new Set(alerts.map(a => a.id));

  return (
    <Card>
      <CardHeader
        title="Alert Signal Status"
        badge={!hasData ? 'AWAITING DATA' : alerts.length > 0 ? `${alerts.length} TRIGGERED` : '0 TRIGGERED'}
        badgeVariant={!hasData ? 'neutral' : alerts.length > 0 ? 'bear' : 'live'}
      />
      <div className="divide-y divide-bd-x max-h-[380px] overflow-y-auto">
        {Object.entries(THEMATIC_META).map(([id, sig]) => {
          const SigIcon    = sig.Icon;
          const triggered  = triggeredIds.has(id);
          const liveAlert  = alerts.find(a => a.id === id);
          const tagKey     = !hasData ? 'off' : !triggered ? 'off' : liveAlert?.lvl === 'green' ? 'green' : liveAlert?.lvl === 'amber' ? 'amber' : 'red';
          return (
            <div key={id} className="flex items-start justify-between py-2 first:pt-0 last:pb-0 gap-2">
              <div className="min-w-0 flex-1">
                <div className="inline-flex items-center gap-1.5 font-mono text-[10px] text-ts">
                  <SigIcon className="w-3 h-3 flex-shrink-0" />
                  {sig.name}
                </div>
                <div className="font-mono text-[8px] text-tm mt-0.5">{sig.detail}</div>
                {triggered && liveAlert && (
                  <div className="font-mono text-[8px] text-warn mt-0.5 truncate pr-2">{liveAlert.text}</div>
                )}
              </div>
              <span className={clsx('inline-flex items-center gap-1 font-mono text-[8px] px-1.5 py-0.5 rounded-sm whitespace-nowrap flex-shrink-0 border mt-0.5', TAG_CLS[tagKey])}>
                {triggered && hasData && <DotIcon className="w-1.5 h-1.5" />}
                {!hasData ? 'NO DATA' : triggered ? 'TRIGGERED' : 'NOT TRIGGERED'}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ─── Live macro strip ────────────────────────────────────────────── */
function MacroStrip({ assets, hasData }) {
  const items = [
    { label:'Brent',    a:assets.brent,    fmt: v => `${v>=0?'+':''}${v.toFixed(2)}%`, inv:false },
    { label:'USD/ZAR',  a:assets.usdZar,   fmt: v => `${v>=0?'+':''}${v.toFixed(2)}%`, inv:true  },
    { label:'Gold',     a:assets.gold,     fmt: v => `${v>=0?'+':''}${v.toFixed(2)}%`, inv:false },
    { label:'Platinum', a:assets.platinum, fmt: v => `${v>=0?'+':''}${v.toFixed(2)}%`, inv:false },
    { label:'R2035',    a:assets.r2035,    fmt: v => `${v>=0?'+':''}${v.toFixed(3)}%`, inv:true, src: assets.r2035?.source },
    { label:'Palladium',a:assets.palladium,fmt: v => `${v>=0?'+':''}${v.toFixed(2)}%`, inv:false },
  ];

  if (!hasData) {
    return (
      <div className="bg-bg-s border border-bd rounded px-4 py-3 mb-3.5 font-mono text-[10px] text-tm text-center">
        Fetch live data to see macro figures in the transmission channel analysis
      </div>
    );
  }

  return (
    <div className="grid grid-cols-6 gap-2 mb-3.5">
      {items.map(item => {
        const pct  = item.a?.changePct;
        const good = item.inv ? (pct != null && pct <= 0) : (pct != null && pct >= 0);
        const cls  = pct == null ? 'text-tm' : good ? 'text-bull' : 'text-bear';
        return (
          <div key={item.label} className="bg-bg-s border border-bd rounded px-3 py-2 text-center">
            <div className="font-mono text-[8px] text-tm mb-1">
              {item.label}
              {item.src && <span className="ml-1 text-ts text-[7px]">({item.src})</span>}
            </div>
            <div className={clsx('font-mono text-[13px] font-semibold', cls)}>
              {pct != null ? item.fmt(pct) : '—'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────────── */
export default function MacroTransmission({ assets, alerts, hasData, r2035History }) {
  const brentChg = assets.brent?.changePct;
  const zarChg   = assets.usdZar?.changePct;
  const goldChg  = assets.gold?.changePct;
  const r2035Chg = assets.r2035?.changePct;
  const r2035Prc = assets.r2035?.price;
  const r2035Src = assets.r2035?.source || 'fetching…';

  const fmt = (v, label) => v != null ? `${label} ${v>=0?'+':''}${v.toFixed(1)}%` : `${label} (fetch data)`;

  const yieldChartData = buildYieldChartData(r2035History);
  // Show a "live" reference line only if it's within the chart's domain
  const livePrice = assets.r2035?.isLive ? assets.r2035?.price : null;

  // Source badge label for the chart header
  const chartSourceLabel = assets.r2035?.source
    ? `SOURCE: ${String(assets.r2035.source).toUpperCase()}${assets.r2035.source !== 'STATIC' && assets.r2035.source !== 'FRED' ? ' 10Y' : ''}`
    : 'SOURCE: FETCHING';

  // Dynamic Y-axis domain: clamp around the actual data so the chart stays readable
  const allYields = yieldChartData.map(d => d.r2035).filter(v => v != null);
  const allRepos  = yieldChartData.map(d => d.sarb).filter(v => v != null);
  const yMin = Math.floor(Math.min(...allYields, ...allRepos, livePrice ?? 99) - 0.5);
  const yMax = Math.ceil(Math.max(...allYields, livePrice ?? 0) + 1);

  return (
    <div className="p-[18px] animate-fadeUp space-y-3.5">
      <MacroStrip assets={assets} hasData={hasData} />

      {/* Transmission channels */}
      <div className="grid grid-cols-2 gap-3">
        <ChannelCard Icon={BrentIcon} title="Oil Price Shock Channel"
          isActive={hasData && brentChg != null && brentChg > 2}
          impactCls="text-bear" impact="JSE BANKS / RETAILERS: DOWN"
          rows={[
            [{v:'red',t:fmt(brentChg,'Brent')},{v:'warn',t:'Fuel Levy up'},{v:'warn',t:'CPI up'},{v:'red',t:'SARB Hawkish'}],
            [{v:'red',t:'Rates Hold/up'},{v:'red',t:'Bond Sell-off'},{v:'red',t:'Banks NII down'},{v:'red',t:'JSE Banks down'}],
            [{v:'green',t:'Sasol Rev. up'},{v:'green',t:'Coal/Gas up'},{v:'green',t:'Energy Basket up'}],
          ]}
        />
        <ChannelCard Icon={FxIcon} title="Currency Pressure Channel"
          isActive={hasData && zarChg != null && zarChg > 0.8}
          impactCls="text-bear" impact="RETAILERS / INDUSTRIALS: DOWN"
          rows={[
            [{v:'red',t:fmt(zarChg,'USD/ZAR')},{v:'warn',t:'Import CPI up'},{v:'red',t:'Retail Margins down'}],
            [{v:'red',t:'Consumer Conf. down'},{v:'red',t:'SA Spending down'},{v:'red',t:'Retail Rev. down'}],
            [{v:'red',t:'USD Debt Cost up'},{v:'red',t:'Corp. Margins down'},{v:'neutral',t:'Offshore JSE flat'}],
          ]}
        />
        <ChannelCard Icon={GoldIcon} title="Safe Haven / Mining Channel"
          isActive={hasData && goldChg != null && goldChg > 1}
          impactCls="text-bull" impact="GOLD MINERS / PGMs: UP"
          rows={[
            [{v:'green',t:fmt(goldChg,'Gold')},{v:'green',t:'Mining Rev. up'},{v:'green',t:'GFI/ANG up'}],
            [{v:'green',t:'PGMs bid'},{v:'green',t:'IMP/AMS up'},{v:'green',t:'Mining Basket up'}],
            [{v:'warn',t:'ZAR Weak'},{v:'green',t:'ZAR-denom Rev. up'},{v:'green',t:'Miner Margins up'}],
          ]}
        />
        <ChannelCard Icon={BondIcon} title="R2035 Bond / SARB Channel"
          isActive={hasData && r2035Chg != null && r2035Chg > 0.1}
          impactCls={(r2035Chg ?? 0) > 0 ? 'text-bear' : 'text-bull'}
          impact={(r2035Chg ?? 0) > 0 ? 'TIGHTER CONDITIONS: BANKS DOWN' : 'EASING CONDITIONS: BANKS UP'}
          rows={[
            [{v:'red',t:fmt(r2035Chg,'R2035')},{v:'warn',t:`Yield ${r2035Prc?.toFixed(3)??'—'}%`},{v:'neutral',t:`Source: ${r2035Src}`}],
            [{v:'red',t:'NII Outlook down'},{v:'red',t:'Credit Quality Risk up'},{v:'red',t:'Bank P/B down'}],
            [{v:'warn',t:'Consumer Rates up'},{v:'red',t:'Debt Servicing up'},{v:'red',t:'Retail Spend down'}],
          ]}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Historical analogues */}
        <div className="col-span-2">
          <Card>
            <CardHeader title="Historical Conflict Analogues — SA Market Reaction" badge="REFERENCE DATA" />
            <div className="overflow-x-auto">
              <table className="w-full border-collapse font-mono text-[10px]">
                <thead>
                  <tr>
                    {['Event','Period','Brent','USD/ZAR','JSE Top 40','Gold','SA Miners','Regime'].map(h => (
                      <th key={h} className="text-[8px] tracking-[1.5px] text-tm py-1.5 px-2 border-b border-bd bg-bg-s text-left whitespace-nowrap">
                        {h.toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ANALOGUES.map(row => (
                    <tr key={row.event} className="hover:bg-bg-h transition-colors">
                      <td className="py-2 px-2 border-b border-bd-x font-semibold text-tp whitespace-nowrap">{row.event}</td>
                      <td className="py-2 px-2 border-b border-bd-x text-tm text-[9px] whitespace-nowrap">{row.period}</td>
                      <td className="py-2 px-2 border-b border-bd-x text-bull font-semibold">{row.brent}</td>
                      <td className="py-2 px-2 border-b border-bd-x text-bear font-semibold">{row.zar}</td>
                      <td className={clsx('py-2 px-2 border-b border-bd-x font-semibold', row.top40.startsWith('+') ? 'text-bull' : 'text-bear')}>{row.top40}</td>
                      <td className="py-2 px-2 border-b border-bd-x text-bull font-semibold">{row.gold}</td>
                      <td className="py-2 px-2 border-b border-bd-x text-bull font-semibold">{row.miners}</td>
                      <td className="py-2 px-2 border-b border-bd-x">
                        <span className={clsx('px-1.5 py-0.5 rounded-sm text-[8px] border font-semibold',
                          row.regime === 'BEARISH' ? 'bg-bear/15 text-bear border-bear/30' :
                          row.regime === 'MIXED'   ? 'bg-warn/15 text-warn border-warn/30' :
                                                     'bg-bull/12 text-bull border-bull/30')}>
                          {row.regime}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Live alert status */}
        <AlertPanel alerts={alerts} hasData={hasData} />
      </div>

      {/* Interactive Brent slider + R2035/SARB yield chart */}
      <div className="grid grid-cols-2 gap-3">
        <BrentSlider liveBrent={assets.brent} />

        <Card>
          <CardHeader
            title="SA 10Y Bond Yield + SARB Repo — 12M Path"
            badge={chartSourceLabel}
          />
          {assets.r2035?.isLive && (
            <div className="flex items-center gap-3 mb-3 p-2 bg-bull/6 border border-bull/20 rounded">
              <span className="inline-flex items-center gap-1 font-mono text-[8px] text-bull">
                <DotIcon className="w-1.5 h-1.5" /> LIVE
              </span>
              <span className="font-mono text-[11px] font-semibold text-tp">{assets.r2035.price?.toFixed(3)}%</span>
              <span className={clsx('font-mono text-[10px]', (assets.r2035.changePct ?? 0) > 0 ? 'text-bear' : 'text-bull')}>
                {(assets.r2035.changePct ?? 0) >= 0 ? '+' : ''}{assets.r2035.changePct?.toFixed(3)}% day
              </span>
              <span className="font-mono text-[8px] text-tm ml-auto">
                {assets.r2035.source || 'live'} · {assets.r2035.date || ''}
              </span>
            </div>
          )}
          <div style={{ height: assets.r2035?.isLive ? 200 : 230 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yieldChartData} margin={{ top:4, right:8, bottom:0, left:-8 }}>
                <CartesianGrid stroke="rgba(30,45,69,0.8)" strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={TICK} axisLine={false} tickLine={false} interval={2} />
                <YAxis
                  domain={[yMin, yMax]}
                  tickFormatter={v => `${v.toFixed(1)}%`}
                  tick={TICK} axisLine={false} tickLine={false}
                />
                <Tooltip content={<YTip />} cursor={{ stroke:'rgba(255,255,255,0.1)' }} />
                <Legend wrapperStyle={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'#6e80a0', paddingTop:4 }} />
                {/* Stress-zone watch line — draw at 10% (meaningful given current ~8.35% level) */}
                <ReferenceLine y={10.0}
                  stroke="rgba(239,68,68,0.35)" strokeDasharray="4 4"
                  label={{ value:'10% stress zone', position:'insideTopRight', fontSize:8, fill:'#ef4444', fontFamily:'IBM Plex Mono' }}
                />
                {livePrice != null && livePrice >= yMin && livePrice <= yMax && (
                  <ReferenceLine y={livePrice}
                    stroke="rgba(240,180,41,0.8)" strokeDasharray="4 2"
                    label={{ value:`Live ${livePrice.toFixed(2)}%`, position:'insideBottomLeft', fontSize:8, fill:'#f0b429', fontFamily:'IBM Plex Mono' }}
                  />
                )}
                <Line type="monotone" dataKey="r2035" name="SA 10Y Yield" stroke="#f0b429" strokeWidth={2} dot={false} activeDot={{ r:3 }} />
                <Line type="monotone" dataKey="sarb"  name="SARB Repo"    stroke="rgba(5,208,154,0.7)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} activeDot={{ r:3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
