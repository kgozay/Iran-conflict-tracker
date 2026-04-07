import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import clsx from 'clsx';
import { Card, CardHeader } from '../widgets/Card.jsx';
import StockCard from '../widgets/StockCard.jsx';

const SECTOR_TABS = ['All','Gold Miners','PGMs','Energy','Banks','Retailers','Industrials','Mining','Telecoms'];

/* Sector reads — analytical commentary, no specific live numbers */
const SECTOR_READS = {
  All:           '**Full JSE** | In an Iran conflict escalation scenario, the JSE splits sharply. Miners and energy names benefit from commodity tailwinds while domestic banks, retailers and industrials face ZAR weakness and consumer spending pressure. Offshore dual-listed names (Naspers, Richemont) act as a partial anchor.',
  'Gold Miners': '**Gold miners** are the standout conflict beneficiaries. Rising gold prices combined with ZAR weakness create a double tailwind — USD gold prices up and ZAR-translated revenues elevated simultaneously. Anglo Gold Ashanti and Gold Fields are the most sensitive to this dynamic.',
  PGMs:          '**PGM miners** benefit moderately. Platinum and palladium get a safe-haven bid but autocatalyst demand concerns from potential global slowdown partially offset the move. Impala Platinum and Anglo American Platinum lead; Sibanye-Stillwater typically lags on balance-sheet concerns.',
  Energy:        '**Energy-linked stocks** are primary conflict beneficiaries. Sasol is the key name — oil price elevation directly feeds into Secunda synfuels margins. Exxaro and Thungela benefit from coal price spillover. Risk is a sharp reversal on any de-escalation signal.',
  Banks:         '**Banks face pressure** in oil-shock conflict scenarios. ZAR weakness tightens financial conditions, rising yields compress net interest income outlook, and credit quality concerns build on consumer-facing books. Watch the SA 10Y yield — 11.0% is the key de-rating level.',
  Retailers:     '**Retailers are the most exposed** domestic sector. The transmission is direct: ZAR weakness → import cost inflation → margin squeeze → lower consumer spending. Lower-income retailers (Pepkor, Shoprite) are most vulnerable. TFG and Mr Price have some offshore revenue offset.',
  Industrials:   '**Industrials split** between offshore and domestic. Naspers and Richemont have international earnings that buffer against ZAR weakness. Domestic industrials like Barloworld and Bidvest are more exposed to local demand conditions and input cost pressures.',
  Mining:        '**Diversified miners** benefit from commodity price elevation broadly. Anglo American and BHP have gold, copper and iron ore exposure that generally responds positively to geopolitical risk. Dollar-denominated revenues insulate them from ZAR weakness.',
  Telecoms:      '**Telecoms are defensive** but not immune. MTN faces FX headwinds on its pan-African USD-reporting business. Vodacom\'s domestic SA exposure creates consumer spend sensitivity. Neither a winner nor a major loser — expect relative performance close to the market.',
};

const BAR_COLORS = {
  pos: 'before:bg-bull',
  neg: 'before:bg-bear',
  ts:  'before:bg-ts',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div className="bg-bg-s border border-bd rounded px-3 py-2 font-mono">
      <div className="text-[10px] text-ts mb-1">{label}</div>
      <div className={clsx('text-[13px] font-semibold', v >= 0 ? 'text-bull' : 'text-bear')}>
        {v >= 0 ? '+' : ''}{v?.toFixed(2)}%
      </div>
    </div>
  );
};

export default function SectorDrilldown({ stocks, sectors, hasData, onFetch }) {
  const [active, setActive] = useState('All');

  const liveStocks = stocks.filter(s => s.isLive);
  const filtered   = useMemo(() =>
    active === 'All' ? stocks : stocks.filter(s => s.sector === active),
    [stocks, active]
  );
  const liveFiltered = filtered.filter(s => s.isLive);

  const stats = useMemo(() => {
    const withData = liveFiltered;
    if (!withData.length) return { avg: null, bulls: 0, bears: 0, live: 0 };
    const avg   = withData.reduce((a,s) => a + s.changePct, 0) / withData.length;
    const bulls = withData.filter(s => s.changePct > 0).length;
    const bears = withData.filter(s => s.changePct <= 0).length;
    return { avg: +avg.toFixed(2), bulls, bears, live: withData.length };
  }, [liveFiltered]);

  const chartData = useMemo(() =>
    [...liveFiltered]
      .sort((a,b) => b.changePct - a.changePct)
      .map(s => ({ name: s.display, val: +s.changePct.toFixed(2) })),
    [liveFiltered]
  );

  const sectorInfo = sectors[active] ?? null;
  const readText   = SECTOR_READS[active] ?? SECTOR_READS.All;

  const avgBarKey  = stats.avg == null ? 'ts' : stats.avg >= 0 ? 'pos' : 'neg';
  const avgTextCls = stats.avg == null ? 'text-tm' : stats.avg >= 0 ? 'text-bull' : 'text-bear';

  if (!hasData) {
    return (
      <div className="p-[18px] animate-fadeUp flex flex-col items-center justify-center py-20 text-center">
        <div className="text-5xl mb-4">📊</div>
        <div className="font-display text-[24px] tracking-[3px] text-ts mb-2">NO LIVE DATA YET</div>
        <div className="font-mono text-[10px] text-tm mb-6 max-w-sm leading-relaxed">
          Fetch live data to see individual stock prices, sector performance charts, and constituent analysis.
        </div>
        <button onClick={onFetch}
          className="px-8 py-3 bg-warn text-bg font-mono text-[12px] font-semibold rounded hover:bg-warn/80 transition-colors cursor-pointer">
          ⚡ FETCH LIVE DATA
        </button>
      </div>
    );
  }

  return (
    <div className="p-[18px] animate-fadeUp">
      {/* Sector tabs */}
      <div className="flex flex-wrap gap-1.5 mb-3.5">
        {SECTOR_TABS.map(s => (
          <button key={s} onClick={() => setActive(s)}
            className={clsx(
              'px-3 py-1.5 font-mono text-[9px] tracking-[1px] rounded border transition-all cursor-pointer',
              active === s
                ? 'text-warn border-warn bg-warn/10'
                : 'text-ts border-bd bg-bg-c hover:text-tp hover:border-ts',
            )}>
            {s.toUpperCase()}
          </button>
        ))}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-2.5 mb-3.5">
        {[
          {
            label: 'AVG CHANGE',
            value: stats.avg != null ? `${stats.avg >= 0 ? '+' : ''}${stats.avg.toFixed(2)}%` : '—',
            sub:   `${liveFiltered.length} live names`,
            textCls: avgTextCls,
            barKey:  avgBarKey,
          },
          { label:'NAMES TOTAL',   value: filtered.length,      sub:`${liveFiltered.length} with live data`, textCls:'text-tp', barKey:'ts'  },
          { label:'ADVANCING',     value: stats.bulls,           sub:'live names up today',                   textCls:'text-bull',barKey:'pos' },
          { label:'DECLINING',     value: stats.bears,           sub:'live names down today',                 textCls:'text-bear',barKey:'neg' },
        ].map(k => (
          <div key={k.label} className={clsx(
            'bg-bg-c border border-bd rounded p-[11px] relative overflow-hidden',
            'before:content-[""] before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px]',
            BAR_COLORS[k.barKey],
          )}>
            <div className="font-mono text-[8px] tracking-[2px] text-ts mb-1.5">{k.label}</div>
            <div className={clsx('font-display text-[32px] leading-none', k.textCls)}>{k.value}</div>
            <div className="font-mono text-[8px] text-tm mt-1">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Chart + read */}
      <div className="grid grid-cols-3 gap-3 mb-3.5">
        <div className="col-span-2">
          <Card>
            <CardHeader
              title={`${active.toUpperCase()} — Constituent Performance`}
              badge={`${liveFiltered.length} LIVE`}
              badgeVariant="live"
            />
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-[220px] font-mono text-[10px] text-tm">
                No live price data for this sector yet
              </div>
            ) : (
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top:4, right:8, bottom:0, left:-8 }}>
                    <CartesianGrid vertical={false} stroke="rgba(30,45,69,0.8)" />
                    <XAxis dataKey="name"
                      tick={{ fontFamily:'IBM Plex Mono', fontSize:8, fill:'#6e80a0' }}
                      axisLine={false} tickLine={false} interval={0}
                      angle={chartData.length > 12 ? -45 : 0}
                      textAnchor={chartData.length > 12 ? 'end' : 'middle'}
                      height={chartData.length > 12 ? 36 : 20}
                    />
                    <YAxis tickFormatter={v=>`${v>=0?'+':''}${v.toFixed(1)}%`}
                      tick={{ fontFamily:'IBM Plex Mono', fontSize:9, fill:'#6e80a0' }}
                      axisLine={false} tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill:'rgba(255,255,255,0.04)' }} />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
                    <Bar dataKey="val" radius={[3,3,0,0]} maxBarSize={28}>
                      {chartData.map((e,i) => (
                        <Cell key={i}
                          fill={e.val>=0?'rgba(5,208,154,0.7)':'rgba(239,68,68,0.7)'}
                          stroke={e.val>=0?'#05d09a':'#ef4444'}
                          strokeWidth={1} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>

        <Card>
          <CardHeader title="Conflict Impact — Sector Read" />
          <div className="font-mono text-[10px] leading-[1.8] text-ts">
            {readText.split(/(\*\*[^*]+\*\*)/).map((part,i) =>
              part.startsWith('**') && part.endsWith('**')
                ? <span key={i} className="text-warn font-semibold">{part.slice(2,-2)}</span>
                : <span key={i}>{part}</span>
            )}
          </div>
          {sectorInfo && sectorInfo.chg != null && (
            <div className="mt-3 pt-3 border-t border-bd-x">
              <div className="font-mono text-[8px] text-tm mb-1.5">LIVE SECTOR AGGREGATE</div>
              <div className="flex justify-between font-mono text-[10px]">
                <span className="text-ts">Avg 1D Change</span>
                <span className={sectorInfo.chg >= 0 ? 'text-bull font-semibold' : 'text-bear font-semibold'}>
                  {sectorInfo.chg >= 0 ? '+' : ''}{sectorInfo.chg.toFixed(2)}%
                </span>
              </div>
              {sectorInfo.rel != null && (
                <div className="flex justify-between font-mono text-[10px] mt-1">
                  <span className="text-ts">vs Market Avg</span>
                  <span className={sectorInfo.rel >= 0 ? 'text-bull' : 'text-bear'}>
                    {sectorInfo.rel >= 0 ? '+' : ''}{sectorInfo.rel.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Stock grid */}
      {filtered.length === 0 ? (
        <div className="py-8 text-center font-mono text-[10px] text-tm">No stocks in this sector</div>
      ) : (
        <div className="grid grid-cols-4 gap-2.5">
          {filtered.map(s => <StockCard key={s.ticker} stock={s} />)}
        </div>
      )}
    </div>
  );
}
