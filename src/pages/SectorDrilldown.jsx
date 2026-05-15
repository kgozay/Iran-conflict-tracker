import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import clsx from 'clsx';
import { Card, CardHeader } from '../widgets/Card.jsx';
import StockCard from '../widgets/StockCard.jsx';

const SECTOR_TABS = ['All','Gold Miners','PGMs','Energy','Banks','Retailers','Industrials','Mining','Telecoms'];

const SECTOR_READS = {
  All:           '**Full JSE** | In an Iran conflict escalation scenario, the JSE splits sharply. Miners and energy names benefit from commodity tailwinds while domestic banks, retailers and industrials face ZAR weakness and consumer spending pressure. Offshore dual-listed names act as a partial anchor.',
  'Gold Miners': '**Gold miners** are the standout conflict beneficiaries. Rising gold prices combined with ZAR weakness create a double tailwind — USD gold prices up and ZAR-translated revenues elevated simultaneously. Anglo Gold Ashanti and Gold Fields are the most sensitive to this dynamic.',
  PGMs:          '**PGM miners** benefit moderately. Platinum and palladium get a safe-haven bid but autocatalyst demand concerns from potential global slowdown partially offset the move. Impala Platinum and Anglo American Platinum lead; Sibanye-Stillwater typically lags on balance-sheet concerns.',
  Energy:        '**Energy-linked stocks** are primary conflict beneficiaries. Sasol is the key name — oil price elevation directly feeds into Secunda synfuels margins. Exxaro and Thungela benefit from coal price spillover. Risk is a sharp reversal on any de-escalation signal.',
  Banks:         '**Banks face pressure** in oil-shock conflict scenarios. ZAR weakness tightens financial conditions, rising yields compress net interest income outlook, and credit quality concerns build on consumer-facing books. Watch the SA 10Y yield — 10.0% is the key de-rating stress level.',
  Retailers:     '**Retailers are the most exposed** domestic sector. The transmission is direct: ZAR weakness → import cost inflation → margin squeeze → lower consumer spending. Lower-income retailers (Pepkor, Shoprite) are most vulnerable. TFG and Mr Price have some offshore revenue offset.',
  Industrials:   '**Industrials split** between offshore and domestic. Naspers and Richemont have international earnings that buffer against ZAR weakness. Domestic industrials like Barloworld and Bidvest are more exposed to local demand conditions and input cost pressures.',
  Mining:        '**Diversified miners** benefit from commodity price elevation broadly. Anglo American and BHP have gold, copper and iron ore exposure that generally responds positively to geopolitical risk. Dollar-denominated revenues insulate them from ZAR weakness.',
  Telecoms:      '**Telecoms are defensive** but not immune. MTN faces FX headwinds on its pan-African USD-reporting business. Vodacom\'s domestic SA exposure creates consumer spend sensitivity. Neither a winner nor a major loser — expect relative performance close to the market.',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div className="bg-bg-s border border-bd rounded-[10px] px-3 py-2">
      <div className="font-sans text-[11px] text-ts mb-1">{label}</div>
      <div className={clsx('font-mono text-[13px] font-semibold', v >= 0 ? 'text-bull' : 'text-bear')}>
        {v >= 0 ? '+' : ''}{v?.toFixed(2)}%
      </div>
    </div>
  );
};

export default function SectorDrilldown({ stocks, sectors, hasData, onFetch }) {
  const [active, setActive] = useState('All');

  const filtered     = useMemo(() =>
    active === 'All' ? stocks : stocks.filter(s => s.sector === active),
    [stocks, active]
  );
  const liveFiltered = filtered.filter(s => s.isLive);

  const stats = useMemo(() => {
    if (!liveFiltered.length) return { avg: null, bulls: 0, bears: 0 };
    const avg   = liveFiltered.reduce((a, s) => a + s.changePct, 0) / liveFiltered.length;
    const bulls = liveFiltered.filter(s => s.changePct > 0).length;
    const bears = liveFiltered.filter(s => s.changePct <= 0).length;
    return { avg: +avg.toFixed(2), bulls, bears };
  }, [liveFiltered]);

  const chartData = useMemo(() =>
    [...liveFiltered]
      .sort((a, b) => b.changePct - a.changePct)
      .map(s => ({ name: s.display, val: +s.changePct.toFixed(2) })),
    [liveFiltered]
  );

  const sectorInfo = sectors[active] ?? null;
  const readText   = SECTOR_READS[active] ?? SECTOR_READS.All;
  const avgColor   = stats.avg == null ? 'text-tm' : stats.avg >= 0 ? 'text-bull' : 'text-bear';

  if (!hasData) {
    return (
      <div className="p-[32px_36px] animate-fadeUp flex flex-col items-center justify-center py-20 text-center">
        <div className="font-serif text-[32px] text-ts mb-3">No live data yet</div>
        <div className="text-[14px] text-tm mb-6 max-w-sm leading-relaxed">
          Fetch live data to see individual stock prices, sector performance charts, and constituent analysis.
        </div>
        <button onClick={() => onFetch()}
          className="px-10 py-3 bg-paper font-medium text-[13px] rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
          style={{ color: 'var(--color-ink)' }}>
          Fetch live data
        </button>
      </div>
    );
  }

  return (
    <div className="p-[32px_36px] flex flex-col gap-5 animate-fadeUp">

      {/* Sector tab pills */}
      <div className="flex flex-wrap gap-1.5">
        {SECTOR_TABS.map(s => (
          <button key={s} onClick={() => setActive(s)}
            className={clsx(
              'px-4 py-[6px] text-[12px] font-medium rounded-full border transition-all cursor-pointer',
              active === s
                ? 'border-transparent'
                : 'border-bd text-ts hover:text-tp hover:border-ts',
            )}
            style={active === s ? { background: 'var(--color-paper)', color: 'var(--color-ink)', border: 'none' } : {}}>
            {s}
          </button>
        ))}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            kicker: 'Avg change',
            value:  stats.avg != null ? `${stats.avg >= 0 ? '+' : ''}${stats.avg.toFixed(2)}%` : '—',
            sub:    `${liveFiltered.length} live names`,
            col:    avgColor,
          },
          { kicker: 'Names total',  value: filtered.length,  sub: `${liveFiltered.length} with live data`, col: 'text-tp'   },
          { kicker: 'Advancing',    value: stats.bulls,      sub: 'live names up today',                   col: 'text-bull' },
          { kicker: 'Declining',    value: stats.bears,      sub: 'live names down today',                 col: 'text-bear' },
        ].map(k => (
          <div key={k.kicker} className="bg-bg-c border border-bd rounded-[14px] p-[20px_24px]">
            <div className="font-sans text-[10px] font-medium tracking-[0.08em] uppercase text-tm mb-2">
              {k.kicker}
            </div>
            <div className={clsx('font-serif text-[40px] leading-none', k.col)}>{k.value}</div>
            <div className="font-sans text-[12px] text-ts mt-1.5">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Chart + read */}
      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-4">
        <Card className="flex flex-col min-h-[340px]">
          <CardHeader
            title="Constituent"
            italic="performance"
            badge={`${liveFiltered.length} live`}
            badgeVariant="live"
          />
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center flex-1 font-sans text-[13px] text-tm">
              No live price data for this sector
            </div>
          ) : (
            <div className="flex-1 min-h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 6, right: 8, bottom: 4, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--color-bd)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontFamily: 'JetBrains Mono', fontSize: 9, fill: 'var(--color-ts)' }}
                    axisLine={false} tickLine={false} interval={0}
                    angle={chartData.length > 12 ? -45 : 0}
                    textAnchor={chartData.length > 12 ? 'end' : 'middle'}
                    height={chartData.length > 12 ? 36 : 20}
                  />
                  <YAxis
                    tickFormatter={v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`}
                    tick={{ fontFamily: 'JetBrains Mono', fontSize: 9, fill: 'var(--color-ts)' }}
                    axisLine={false} tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <ReferenceLine y={0} stroke="var(--color-bd-x)" />
                  <Bar dataKey="val" radius={[4, 4, 0, 0]} maxBarSize={36}>
                    {chartData.map((e, i) => (
                      <Cell key={i}
                        fill={e.val >= 0 ? 'rgba(52,211,153,0.75)' : 'rgba(249,112,112,0.75)'}
                        stroke={e.val >= 0 ? '#34d399' : '#f97070'}
                        strokeWidth={1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Sector" italic="read" />
          <div className="font-sans text-[13.5px] leading-[1.7] text-ts">
            {readText.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
              part.startsWith('**') && part.endsWith('**')
                ? <span key={i} className="text-warn font-semibold">{part.slice(2, -2)}</span>
                : <span key={i}>{part}</span>
            )}
          </div>
          {sectorInfo?.chg != null && (
            <div className="mt-4 pt-4 border-t border-bd">
              <div className="font-sans text-[10px] font-medium tracking-[0.08em] uppercase text-tm mb-2">
                Live aggregate
              </div>
              <div className="flex justify-between font-sans text-[13px] mb-1.5">
                <span className="text-ts">Avg 1D change</span>
                <span className={clsx('font-mono font-semibold', sectorInfo.chg >= 0 ? 'text-bull' : 'text-bear')}>
                  {sectorInfo.chg >= 0 ? '+' : ''}{sectorInfo.chg.toFixed(2)}%
                </span>
              </div>
              {sectorInfo.rel != null && (
                <div className="flex justify-between font-sans text-[13px]">
                  <span className="text-ts">vs market avg</span>
                  <span className={clsx('font-mono', sectorInfo.rel >= 0 ? 'text-bull' : 'text-bear')}>
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
        <div className="py-10 text-center font-sans text-[13px] text-tm">
          No stocks in this sector
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {filtered.map(s => <StockCard key={s.ticker} stock={s} />)}
        </div>
      )}
    </div>
  );
}
