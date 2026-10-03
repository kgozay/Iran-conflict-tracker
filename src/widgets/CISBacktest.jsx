import React, { useMemo } from 'react';
import clsx from 'clsx';
import { Card, CardHeader } from './Card.jsx';
import { backtestCIS, readingsToDaily } from '../utils/cisSeries.js';

const HORIZONS = [5, 20];
const pct = v => v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(2)}%`;
const tone = v => v == null ? 'text-tm' : v > 0 ? 'text-bull' : v < 0 ? 'text-bear' : 'text-ts';

function ResultTable({ results }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse font-mono text-[11.5px]">
        <thead>
          <tr className="border-b border-bd text-tm text-[10.5px]">
            <th className="text-left py-2 px-2 font-semibold">Horizon</th>
            <th className="text-right py-2 px-2 font-semibold">Days</th>
            <th className="text-right py-2 px-2 font-semibold">Correlation</th>
            <th className="text-right py-2 px-2 font-semibold">Direction hit rate</th>
            <th className="text-right py-2 px-2 font-semibold">After bearish CIS</th>
            <th className="text-right py-2 px-2 font-semibold">After neutral CIS</th>
            <th className="text-right py-2 px-2 font-semibold">After bullish CIS</th>
            <th className="text-right py-2 px-2 font-semibold">All days</th>
          </tr>
        </thead>
        <tbody>
          {results.map(r => (
            <tr key={r.horizon} className="border-b border-bd">
              <td className="py-2 px-2 text-tp">{r.horizon} sessions</td>
              <td className="py-2 px-2 text-right text-ts">{r.n}</td>
              <td className={clsx('py-2 px-2 text-right', tone(r.correlation))}>{r.correlation == null ? '—' : r.correlation.toFixed(2)}</td>
              <td className="py-2 px-2 text-right text-tp">{r.hitRate == null ? '—' : `${r.hitRate}%`} <span className="text-tm">({r.signals})</span></td>
              <td className={clsx('py-2 px-2 text-right', tone(r.bearish.avgReturn))}>{pct(r.bearish.avgReturn)} <span className="text-tm">({r.bearish.n})</span></td>
              <td className={clsx('py-2 px-2 text-right', tone(r.neutral.avgReturn))}>{pct(r.neutral.avgReturn)} <span className="text-tm">({r.neutral.n})</span></td>
              <td className={clsx('py-2 px-2 text-right', tone(r.bullish.avgReturn))}>{pct(r.bullish.avgReturn)} <span className="text-tm">({r.bullish.n})</span></td>
              <td className={clsx('py-2 px-2 text-right', tone(r.baseline))}>{pct(r.baseline)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CISBacktest({ backfill, cisHistory }) {
  const series = backfill?.data?.series;
  const historical = useMemo(
    () => series?.length ? HORIZONS.map(h => backtestCIS(series, h)) : null,
    [series]
  );
  const recorded = useMemo(() => {
    const daily = readingsToDaily(cisHistory);
    return daily.length > 25 ? HORIZONS.map(h => backtestCIS(daily, h)) : null;
  }, [cisHistory]);

  const first = series?.[0]?.date, last = series?.[series.length - 1]?.date;

  return (
    <Card spotlight={false}>
      <CardHeader title="Does the CIS" italic="lead the JSE?" kicker="BACKTEST" badge="CALCULATED" badgeVariant="neutral" />
      <p className="-mt-2 mb-4 text-[13px] text-ts max-w-[75ch]">
        For each day, the CIS is compared with the JSE Top 40&apos;s (Satrix 40) return over the following 5 and 20 sessions.
        A useful leading signal would show a positive correlation, a hit rate well above 50%, and weaker returns after bearish readings than after bullish ones.
      </p>

      {backfill?.status === 'loading' && !historical && <p className="text-[12px] text-tm font-mono">Rebuilding daily CIS from market history…</p>}
      {backfill?.status === 'error' && !historical && <p className="text-[12px] text-bear font-mono">Couldn&apos;t load market history: {backfill.error}</p>}

      {historical && (
        <section aria-label="Backtest on rebuilt daily CIS" className="mb-5">
          <h3 className="text-[11px] font-semibold text-ts tracking-[0.05em] uppercase mb-2">Rebuilt daily CIS · {first} to {last}</h3>
          <ResultTable results={historical} />
        </section>
      )}

      <section aria-label="Backtest on recorded readings">
        <h3 className="text-[11px] font-semibold text-ts tracking-[0.05em] uppercase mb-2">Recorded live readings</h3>
        {recorded
          ? <ResultTable results={recorded} />
          : <p className="text-[12px] text-tm m-0">Needs more than 25 days of stored readings with a Top 40 price. Readings accumulate with each visit and the daily server snapshot.</p>}
      </section>

      <p className="font-mono text-[10px] text-tm mt-4 pt-2 border-t border-bd m-0 leading-relaxed">
        Hit rate counts days with |CIS| &gt; 15 where the sign matched the forward return; counts in brackets. Forward windows overlap, so
        neighbouring days are not independent and the sample is smaller than it looks. Rebuilt history uses today&apos;s watchlist (survivorship bias) and closing prices only.
        Past behaviour is not a forecast.
      </p>
    </Card>
  );
}
