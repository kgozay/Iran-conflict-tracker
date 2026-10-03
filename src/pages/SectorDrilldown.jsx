import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import clsx from 'clsx';
import { Card, CardHeader } from '../widgets/Card.jsx';
import StockCard from '../widgets/StockCard.jsx';
import { SECTOR_ORDER } from '../data/stocks.js';
import { CountUp, SpotlightCard } from '../widgets/Effects.jsx';

const SECTOR_TABS = ['All', ...SECTOR_ORDER];

const SECTOR_THESES = {
  All: 'Compare resource and energy names with domestic cyclicals to see which parts of the watchlist are absorbing the macro move.',
  'Gold Miners': 'Gold prices and USD/ZAR can affect rand revenue; operating costs and company exposure can change the equity response.',
  PGMs: 'Metal prices, industrial demand and the rand can pull PGM equities in different directions.',
  Energy: 'Oil and coal prices can support revenue, while input costs and company-specific exposures can offset that benefit.',
  Banks: 'Funding conditions, credit demand and domestic growth are useful checks on an oil or rates shock.',
  Retailers: 'Imported costs and household spending are the main channels to watch; individual chains have different product and currency mixes.',
  'Consumer Staples': 'Food producers carry fuel, grain and packaging input costs; BAT earns offshore and behaves more like a rand hedge.',
  Insurers: 'Bond yields drive investment returns and embedded values, while rand weakness and slower growth weigh on new business.',
  Property: 'Listed property is the most rate-sensitive group: higher yields raise funding costs and compress valuations.',
  Industrials: 'Separate offshore earners from domestic demand exposures before reading the aggregate as one macro bet.',
  Mining: 'Commodity mix and USD revenue determine how much each diversified miner benefits from rand weakness.',
  Telecoms: 'Currency exposure, consumer demand and dividend expectations can produce different outcomes for MTN and Vodacom.',
};

const PERIOD_LABEL = { '1D': '1-day', '5D': '5-day', '20D': '20-day' };

const SORTS = {
  gain: { label: 'Biggest gain', fn: (a, b) => (b._chg ?? -Infinity) - (a._chg ?? -Infinity) },
  loss: { label: 'Biggest loss', fn: (a, b) => (a._chg ?? Infinity) - (b._chg ?? Infinity) },
  name: { label: 'Name A–Z',     fn: (a, b) => a.name.localeCompare(b.name) },
};

function changeFor(stock, timeframe) {
  if (timeframe === '5D')  return stock.changePct5D ?? null;
  if (timeframe === '20D') return stock.changePct20D ?? null;
  return stock.changePct ?? null;
}

function average(list) {
  return list.length ? list.reduce((a, s) => a + s._chg, 0) / list.length : null;
}

const signed = value => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

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

/* Spotlight tints for the KPI strip — keyed by tone class */
const SPOT = {
  'text-bull': 'var(--color-bull-spotlight)',
  'text-bear': 'var(--color-bear-spotlight)',
  'text-warn': 'var(--color-spotlight)',
  'text-tp':   'var(--color-spotlight)',
  'text-tm':   'var(--color-bg-s)',
};

export default function SectorDrilldown({
  stocks, hasData, onFetch, sparklines, timeframe = '1D',
  drillSector, setDrillSector,
}) {
  const [localActive, setLocalActive] = useState('All');
  const active = drillSector ?? localActive;
  const setActive = setDrillSector ?? setLocalActive;
  const [sortKey, setSortKey] = useState('gain');
  const [isNarrow] = useState(() => window.matchMedia('(max-width: 639px)').matches);
  const period = PERIOD_LABEL[timeframe] ?? timeframe;

  // Every figure on this page follows the Period selector in the top bar.
  const rows = useMemo(() => stocks.map(s => ({ ...s, _chg: changeFor(s, timeframe) })), [stocks, timeframe]);
  const priced = useMemo(() => rows.filter(s => s.isLive && Number.isFinite(s._chg)), [rows]);

  const tabStats = useMemo(() => Object.fromEntries(SECTOR_TABS.map(tab => {
    const names = tab === 'All' ? priced : priced.filter(s => s.sector === tab);
    const avg = average(names);
    return [tab, { count: rows.filter(s => tab === 'All' || s.sector === tab).length, avg }];
  })), [rows, priced]);

  const filtered     = useMemo(() =>
    active === 'All' ? rows : rows.filter(s => s.sector === active),
    [rows, active]
  );
  const liveFiltered = useMemo(() => filtered.filter(s => s.isLive && Number.isFinite(s._chg)), [filtered]);
  const sortedCards  = useMemo(() => [...filtered].sort(SORTS[sortKey].fn), [filtered, sortKey]);

  const stats = useMemo(() => {
    if (!liveFiltered.length) return { avg: null, bulls: 0, bears: 0 };
    const avg   = average(liveFiltered);
    const bulls = liveFiltered.filter(s => s._chg > 0).length;
    const bears = liveFiltered.filter(s => s._chg <= 0).length;
    return { avg: +avg.toFixed(2), bulls, bears };
  }, [liveFiltered]);

  const chartData = useMemo(() =>
    [...liveFiltered]
      .sort((a, b) => b._chg - a._chg)
      .map(s => ({ name: s.display, val: +s._chg.toFixed(2) })),
    [liveFiltered]
  );

  const marketAvgRaw = average(priced);
  const marketAvg = marketAvgRaw == null ? null : +marketAvgRaw.toFixed(2);
  const best = chartData[0] ?? null;
  const worst = chartData[chartData.length - 1] ?? null;
  const relative = stats.avg != null && marketAvg != null ? +(stats.avg - marketAvg).toFixed(2) : null;
  const avgColor   = stats.avg == null ? 'text-tm' : stats.avg >= 0 ? 'text-bull' : 'text-bear';

  if (!hasData) {
    return (
      <div className="p-4 sm:p-6 lg:p-[32px_36px] animate-fadeUp flex flex-col items-center justify-center py-20 text-center">
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

  const relColor = relative == null ? 'text-tm' : relative >= 0 ? 'text-bull' : 'text-bear';
  const kpiCards = [
    {
      kicker: `Avg ${period} change`,
      display: stats.avg != null
        ? <><span>{stats.avg >= 0 ? '+' : ''}</span><CountUp to={stats.avg} decimals={2} suffix="%" /></>
        : '—',
      sub:    `equal-weight · ${liveFiltered.length} priced names`,
      col:    avgColor,
    },
    active === 'All'
      ? {
          kicker: 'Spread',
          display: best && worst
            ? <CountUp to={+(best.val - worst.val).toFixed(2)} decimals={2} suffix=" pts" />
            : '—',
          sub:    best && worst ? `${best.name} best · ${worst.name} worst` : 'no priced names',
          col:    'text-tp',
        }
      : {
          kicker: 'Vs watchlist',
          display: relative != null
            ? <><span>{relative >= 0 ? '+' : ''}</span><CountUp to={relative} decimals={2} suffix=" pts" /></>
            : '—',
          sub:    relative == null ? 'no comparison available' : relative >= 0 ? 'outperforming the watchlist' : 'underperforming the watchlist',
          col:    relColor,
        },
    {
      kicker: 'Advancing',
      display: <CountUp to={stats.bulls} decimals={0} />,
      sub:    `of ${liveFiltered.length} names up`,
      col:    'text-bull',
    },
    {
      kicker: 'Declining',
      display: <CountUp to={stats.bears} decimals={0} />,
      sub:    `of ${liveFiltered.length} names down or flat`,
      col:    'text-bear',
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-[32px_36px] flex flex-col gap-5 animate-fadeUp">

      {/* Sector selector: each pill carries its own move so readers can pick where to look */}
      <div role="group" aria-label="Choose a sector" className="flex flex-wrap gap-1.5">
        {SECTOR_TABS.map(tab => {
          const t = tabStats[tab];
          const isActive = active === tab;
          return (
            <button key={tab} type="button" onClick={() => setActive(tab)}
              aria-pressed={isActive}
              className={clsx(
                'min-h-11 sm:min-h-9 inline-flex items-center gap-2 px-3.5 py-[6px] text-[12.5px] font-medium rounded-full border transition-all cursor-pointer',
                isActive ? 'border-transparent' : 'border-bd text-ts hover:text-tp hover:border-ts',
              )}
              style={isActive ? { background: 'var(--color-paper)', color: 'var(--color-ink)' } : {}}>
              <span>{tab}</span>
              {t?.avg != null && (
                <span className={clsx(
                  'font-mono text-[11px] font-semibold',
                  isActive ? 'opacity-70' : t.avg >= 0 ? 'text-bull' : 'text-bear',
                )}>
                  {signed(t.avg)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* KPI strip — each tile wrapped in SpotlightCard with tone tint */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpiCards.map(k => (
          <SpotlightCard
            key={k.kicker}
            spotlightColor={SPOT[k.col] ?? SPOT['text-tp']}
            className="glass rounded-[16px] p-4 sm:p-[20px_24px]"
          >
            <div className="font-sans text-[11px] font-medium tracking-[0.08em] uppercase text-tm mb-2">
              {k.kicker}
            </div>
            <div className={clsx('font-serif text-[32px] sm:text-[40px] leading-none', k.col)}>{k.display}</div>
            <div className="font-sans text-[12px] text-ts mt-1.5">{k.sub}</div>
          </SpotlightCard>
        ))}
      </div>

      {/* Chart + read */}
      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-4">
        {/* Chart card — spotlight off to let recharts cursor breathe */}
        <Card spotlight={false} className="flex flex-col min-h-[340px]">
          <CardHeader
            title="Constituent"
            italic="performance"
            badge={`${period} · ${liveFiltered.length} priced`}
            badgeVariant="live"
          />
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center flex-1 font-sans text-[13px] text-tm">
              No price data for this sector and period
            </div>
          ) : (
            <div className="flex-1 min-h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 6, right: 8, bottom: 4, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--color-bd)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontFamily: 'JetBrains Mono', fontSize: 10, fill: 'var(--color-ts)' }}
                    axisLine={false} tickLine={false}
                    interval={isNarrow && chartData.length > 10 ? Math.ceil(chartData.length / 8) - 1 : 0}
                    angle={chartData.length > 12 ? -45 : 0}
                    textAnchor={chartData.length > 12 ? 'end' : 'middle'}
                    height={chartData.length > 12 ? 40 : 22}
                  />
                  <YAxis
                    // Always include zero so all-negative or all-positive sectors still bar from the baseline
                    domain={[min => Math.min(0, min), max => Math.max(0, max)]}
                    tickFormatter={v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`}
                    tick={{ fontFamily: 'JetBrains Mono', fontSize: 10, fill: 'var(--color-ts)' }}
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

        {/* Sector read card — uses Card default (spotlight on) */}
        <Card>
          <CardHeader title="Sector" italic="read" />
          <div className="text-[11px] font-medium tracking-[0.08em] uppercase text-tm mb-2">Observed {period} move</div>
          {stats.avg == null ? (
            <p className="font-sans text-[13.5px] leading-[1.7] text-ts">No current constituent returns are available for this selection.</p>
          ) : (
            <div className="font-sans text-[13.5px] leading-[1.7] text-ts space-y-2">
              <p>{active === 'All' ? 'This watchlist' : active} averages <strong className={avgColor}>{signed(stats.avg)}</strong> across {liveFiltered.length} priced names. {stats.bulls} advanced, {stats.bears} declined or were flat.</p>
              {relative != null && active !== 'All' && <p>That is <strong className={relative >= 0 ? 'text-bull' : 'text-bear'}>{signed(relative)}</strong> versus the equal-weight watchlist average.</p>}
              {best && worst && best.name !== worst.name && <p>Strongest: <strong className="text-tp">{best.name} {signed(best.val)}</strong>. Weakest: <strong className="text-tp">{worst.name} {signed(worst.val)}</strong>.</p>}
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-bd">
            <div className="text-[11px] font-medium tracking-[0.08em] uppercase text-tm mb-2">Expected sensitivity</div>
            <p className="font-sans text-[12.5px] leading-[1.65] text-tm">{SECTOR_THESES[active] ?? SECTOR_THESES.All}</p>
          </div>
          {stats.avg != null && (
            <div className="mt-4 pt-4 border-t border-bd">
              <div className="font-sans text-[11px] font-medium tracking-[0.08em] uppercase text-tm mb-2">
                Data context
              </div>
              <div className="flex justify-between font-sans text-[13px] mb-1.5">
                <span className="text-ts">Constituents priced</span>
                <span className="font-mono text-tp">{liveFiltered.length} / {filtered.length}</span>
              </div>
              {marketAvg != null && active !== 'All' && (
                <div className="flex justify-between font-sans text-[13px]">
                  <span className="text-ts">Equal-weight watchlist avg</span>
                  <span className="font-mono text-tp">{signed(marketAvg)}</span>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Stock grid */}
      <section aria-labelledby="constituents-heading" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="constituents-heading" className="font-serif text-[22px] text-tp leading-[1.1] font-normal m-0">
            {active === 'All' ? 'All' : active} <span className="italic text-warn">constituents</span>
            <span className="ml-2 font-sans text-[12px] text-tm">{filtered.length} names</span>
          </h2>
          <label className="min-h-11 sm:min-h-9 inline-flex items-center gap-2 px-3 border border-bd rounded-lg text-[12px] text-tm">
            Sort
            <select
              value={sortKey}
              onChange={e => setSortKey(e.target.value)}
              className="bg-transparent text-[12.5px] font-semibold text-tp outline-none cursor-pointer"
            >
              {Object.entries(SORTS).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
        </div>
        {filtered.length === 0 ? (
          <div className="py-10 text-center font-sans text-[13px] text-tm">
            No stocks in this sector
          </div>
        ) : (
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
            {sortedCards.map(s => (
              <StockCard key={s.ticker} stock={s} change={s._chg} period={timeframe} sparkline={sparklines?.[s.ticker]} />
            ))}
          </div>
        )}
        <p className="text-[11.5px] text-tm m-0">
          Market cap and P/E are live from Yahoo Finance when available. † last live value (within 24 hours).
          * static reference figure, may be out of date. n/m: no positive earnings.
        </p>
      </section>
    </div>
  );
}
