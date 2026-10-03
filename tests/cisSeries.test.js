import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeDailyCISSeries, weeklyTrajectory, combineTrajectories, backtestCIS,
  readingsToDaily, mergeReadings, downsample,
} from '../src/utils/cisSeries.js';
import { computeCIS } from '../src/utils/scoring.js';
import { CONFLICT_EVENTS } from '../src/data/conflictEvents.js';
import { CRISES } from '../src/data/crisisReferences.js';

const bars = (closes, dates) => closes.map((close, i) => ({ date: dates[i], close }));
const DATES = ['2026-03-02', '2026-03-03', '2026-03-04'];

test('daily CIS uses session-to-session moves and the Top 40 close', () => {
  const series = computeDailyCISSeries({
    'STX40.JO': bars([100, 98, 99], DATES),
    'BZ=F': bars([80, 84, 84], DATES),        // +5% then flat
    'USDZAR=X': bars([18, 18.36, 18.36], DATES), // +2% then flat
  });
  assert.equal(series.length, 2);
  assert.equal(series[0].date, '2026-03-03');
  assert.equal(series[0].close, 98);
  const expected = computeCIS({ brentChg: 5, usdZarChg: 2, top40Chg: -2, goldChg: 0, us10yChg: 0 });
  assert.equal(series[0].cis, expected.total);
  assert.ok(series[0].cis < 0, 'oil + rand shock with a falling market scores bearish');
});

test('daily CIS drops implausible ticks and stale closes', () => {
  const series = computeDailyCISSeries({
    'STX40.JO': bars([100, 100, 100], DATES),
    'BZ=F': bars([80, 400], DATES.slice(0, 2)), // +400% is a bad tick → ignored
  });
  assert.equal(series[0].cis, 0);
});

test('weekly trajectory averages by 7-day bins from the start date', () => {
  const pts = [
    { date: '2026-02-28', cis: -10 }, { date: '2026-03-02', cis: -30 },
    { date: '2026-03-07', cis: 10 }, { date: '2026-02-20', cis: 99 },
  ];
  assert.deepEqual(weeklyTrajectory(pts, '2026-02-28', 4), [
    { week: 0, cis: -20, n: 2 }, { week: 1, cis: 10, n: 1 },
  ]);
  const rows = combineTrajectories({ a: [{ week: 1, cis: 5 }] }, 3);
  assert.deepEqual(rows, [{ week: 0 }, { week: 1, a: 5 }, { week: 2 }]);
});

test('backtest measures forward Top 40 returns by CIS bucket', () => {
  const series = [
    { cis: -50, close: 100 }, { cis: 50, close: 90 }, { cis: 0, close: 99 }, { cis: 0, close: 99 },
  ];
  const r = backtestCIS(series, 1);
  assert.equal(r.n, 3);
  assert.equal(r.bearish.n, 1);
  assert.equal(r.bearish.avgReturn, -10);
  assert.equal(r.bullish.avgReturn, 10);
  assert.equal(r.hitRate, 100);
  assert.equal(backtestCIS([{ cis: 1, close: 1 }], 5).n, 0);
});

test('stored readings merge, dedupe and reduce to one per SAST day', () => {
  const day = Date.parse('2026-09-01T08:00:00Z');
  const merged = mergeReadings(
    [{ ts: day, total: -5 }, { ts: day + 3_600_000, total: -7, top40: 90 }],
    [{ ts: day + 10_000, total: -6 }, { ts: NaN, total: 1 }],
  );
  assert.equal(merged.length, 2);
  assert.deepEqual(readingsToDaily(merged), [{ date: '2026-09-01', cis: -7, close: 90 }]);
  assert.deepEqual(downsample([1, 2, 3, 4, 5], 3), [1, 3, 5]);
});

test('event and crisis dates are valid ISO dates', () => {
  for (const e of CONFLICT_EVENTS) {
    assert.match(e.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(['escalation', 'de-escalation', 'neutral'].includes(e.type));
  }
  for (const c of CRISES) assert.ok(Number.isFinite(Date.parse(c.start)));
});
