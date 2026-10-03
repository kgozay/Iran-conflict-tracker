import React, { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ReferenceLine, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Card, CardHeader } from './Card.jsx';
import { CRISES, CRISIS_WEEKS } from '../data/crisisReferences.js';
import { weeklyTrajectory, combineTrajectories } from '../utils/cisSeries.js';

const SERIES_COLOR = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)'];
const fmt = v => v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(1)}`;

function StatusLine({ status, error }) {
  if (status === 'loading') return <p className="text-[12px] text-tm font-mono m-0">Rebuilding daily CIS from market history…</p>;
  if (status === 'error') return <p className="text-[12px] text-bear font-mono m-0">Couldn&apos;t load market history: {error}. This view needs the deployed API (vercel dev or Vercel).</p>;
  return null;
}

export default function CrisisComparison({ backfill }) {
  const [showTable, setShowTable] = useState(false);
  const series = backfill?.data?.series;

  const { rows, latest } = useMemo(() => {
    if (!series?.length) return { rows: [], latest: null };
    // Show at least CRISIS_WEEKS, and the whole of the current conflict (up to a year).
    const cur = CRISES.find(c => c.current);
    const curFull = cur ? weeklyTrajectory(series, cur.start, 52) : [];
    const weeks = Math.max(CRISIS_WEEKS, (curFull[curFull.length - 1]?.week ?? 0) + 1);
    const traj = Object.fromEntries(CRISES.map(c => [c.id, weeklyTrajectory(series, c.start, weeks)]));
    return { rows: combineTrajectories(traj, weeks), latest: curFull[curFull.length - 1] ?? null };
  }, [series]);

  const sameWeek = latest ? rows[latest.week] : null;

  return (
    <Card spotlight={false}>
      <CardHeader title="Crisis trajectory" italic="comparison" kicker="CONFLICT ANALOGUES" badge="CALCULATED" badgeVariant="neutral" />
      <p className="-mt-2 mb-4 text-[13px] text-ts max-w-[75ch]">
        Weekly average CIS in the weeks after each conflict began, rebuilt from daily closing prices with the same formula as the live score. Week 0 is the 7 days from the event date.
      </p>
      <StatusLine status={backfill?.status} error={backfill?.error} />

      {rows.length > 0 && (
        <>
          {latest && sameWeek && (
            <div className="glass-sub rounded-xl p-3.5 mb-4 text-[12.5px] text-ts">
              <strong className="text-tp">Week {latest.week}</strong> of the 2026 war (the latest week) averaged <strong className="text-tp font-mono">{fmt(latest.cis)}</strong>.
              {' '}At the same point: {CRISES.filter(c => !c.current).map((c, i, arr) => (
                <span key={c.id}>{c.label} <span className="font-mono text-tp">{fmt(sameWeek[c.id])}</span>{i < arr.length - 1 ? ', ' : '.'}</span>
              ))}
            </div>
          )}

          <div className="h-[300px] w-full" role="img" aria-label="Line chart of weekly average CIS after each conflict began">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-bd)" strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="week" tickFormatter={w => `W${w}`} tickLine={false} axisLine={false}
                  tick={{ fill: 'var(--color-tm)', fontSize: 10, fontFamily: 'monospace' }} />
                <YAxis domain={['auto', 'auto']} tickLine={false} axisLine={false} width={44}
                  tick={{ fill: 'var(--color-tm)', fontSize: 10, fontFamily: 'monospace' }} />
                <ReferenceLine y={0} stroke="var(--color-ts)" strokeOpacity={0.5} />
                <Tooltip
                  contentStyle={{ background: 'var(--color-bg)', border: '1px solid var(--color-bd)', borderRadius: 8, fontFamily: 'monospace', fontSize: 11, color: 'var(--color-tp)' }}
                  labelFormatter={w => `Week ${w}`}
                  formatter={(v, name) => [fmt(v), name]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} formatter={value => <span style={{ color: 'var(--color-ts)' }}>{value}</span>} />
                {CRISES.map((c, i) => (
                  <Line key={c.id} dataKey={c.id} name={c.label} type="linear" connectNulls
                    stroke={SERIES_COLOR[i]} strokeWidth={c.current ? 2.5 : 2}
                    strokeDasharray={c.current ? undefined : '5 4'}
                    dot={c.current ? { r: 3, strokeWidth: 0, fill: SERIES_COLOR[i] } : false}
                    activeDot={{ r: 4 }} isAnimationActive={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <button type="button" onClick={() => setShowTable(v => !v)} aria-expanded={showTable}
            className="mt-3 min-h-9 px-3 text-[12px] font-medium text-ts hover:text-tp border border-bd hover:border-ts rounded-full transition-colors cursor-pointer">
            {showTable ? 'Hide table' : 'Show as table'}
          </button>
          {showTable && (
            <div className="overflow-x-auto mt-3">
              <table className="w-full border-collapse font-mono text-[11px]">
                <thead>
                  <tr className="border-b border-bd text-tm">
                    <th className="text-left py-1.5 px-2">Week</th>
                    {CRISES.map(c => <th key={c.id} className="text-right py-1.5 px-2">{c.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.week} className="border-b border-bd">
                      <td className="py-1 px-2 text-ts">W{r.week}</td>
                      {CRISES.map(c => <td key={c.id} className="py-1 px-2 text-right text-tp">{fmt(r[c.id])}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <p className="font-mono text-[10px] text-tm mt-4 pt-2 border-t border-bd m-0">
        {backfill?.data?.note ?? 'Calculated from daily closes.'} Episodes differ in cause and scale; this is context, not a forecast.
      </p>
    </Card>
  );
}
