import test from 'node:test';
import assert from 'node:assert/strict';
import { averageDatedReturns, alignedCorrelation } from '../src/utils/correlation.js';
import { getChannelEvidence } from '../src/utils/transmission.js';

test('correlation pairs shared dates instead of array positions', () => {
  const first = new Map(Array.from({ length: 11 }, (_, i) => [
    `2026-09-${String(i + 1).padStart(2, '0')}`, i % 2 === 0 ? 0.01 : -0.01,
  ]));
  const second = new Map([...first].filter(([date]) => date !== '2026-09-03')
    .map(([date, value]) => [date, value * 2]));
  const result = alignedCorrelation(first, second);
  assert.equal(result.count, 10);
  assert.ok(Math.abs(result.value - 1) < 1e-12);
});

test('correlation requires enough shared sessions and variation', () => {
  const short = new Map([['2026-09-01', 0.01]]);
  assert.deepEqual(alignedCorrelation(short, short), { value: null, count: 1 });
  const flat = new Map(Array.from({ length: 10 }, (_, i) => [`2026-09-${String(i + 1).padStart(2, '0')}`, 0]));
  assert.deepEqual(alignedCorrelation(flat, flat), { value: null, count: 10 });
});

test('sector basket averages only observations on each date', () => {
  const averaged = averageDatedReturns([
    [{ date: '2026-09-01', value: 0.02 }, { date: '2026-09-02', value: 0.04 }],
    [{ date: '2026-09-01', value: 0.04 }],
  ]);
  assert.equal(averaged.get('2026-09-01'), 0.03);
  assert.equal(averaged.get('2026-09-02'), 0.04);
  const covered = averageDatedReturns([
    [{ date: '2026-09-01', value: 0.02 }, { date: '2026-09-02', value: 0.04 }],
    [{ date: '2026-09-01', value: 0.04 }],
  ], 0.7);
  assert.equal(covered.has('2026-09-02'), false);
});

test('macro trigger distinguishes consistent, divergent and missing sector moves', () => {
  const expected = [
    { sector: 'Energy', direction: 1 },
    { sector: 'Banks', direction: -1 },
    { sector: 'Retailers', direction: -1 },
  ];
  assert.equal(getChannelEvidence(3, 2, {
    Energy: { chg: 1 }, Banks: { chg: -1 }, Retailers: { chg: -0.5 },
  }, expected).state, 'consistent');
  assert.equal(getChannelEvidence(3, 2, {
    Energy: { chg: -1 }, Banks: { chg: 1 }, Retailers: { chg: 0.5 },
  }, expected).state, 'divergent');
  assert.equal(getChannelEvidence(3, 2, {}, expected).state, 'insufficient');
});
