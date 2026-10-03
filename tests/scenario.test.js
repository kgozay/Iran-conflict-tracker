import test from 'node:test';
import assert from 'node:assert/strict';
import { scenarioCISInput, computeScenarioCIS } from '../src/utils/scenario.js';
import { buildCISInput } from '../src/utils/cisInput.js';
import { computeCIS } from '../src/utils/scoring.js';

const LIVE = buildCISInput(
  { brent: { changePct: 1 }, usdZar: { changePct: 0.2 }, gold: { changePct: 0.5 }, us10y: { changePct: 0 }, jseTop40: { isLive: true, changePct: -0.3 } },
  { 'Gold Miners': { chg: 1 }, Banks: { chg: -0.5 }, Retailers: { chg: -0.4 }, Energy: { chg: 0.2 }, Industrials: { chg: 0.1 }, top40: { chg: 0 } },
);

test('buildCISInput prefers the live Top 40 and defaults missing values to 0', () => {
  assert.equal(LIVE.top40Chg, -0.3);
  assert.equal(buildCISInput({}, { top40: { chg: 0.4 } }).top40Chg, 0.4);
  assert.equal(buildCISInput().brentChg, 0);
});

test('no shock reproduces the live CIS', () => {
  const scen = computeScenarioCIS(LIVE, { brent: 80, livePrice: 80, zar: 0, gold: 0 });
  assert.equal(scen.total, computeCIS(LIVE).total);
});

test('an oil and rand shock pushes the scenario CIS down', () => {
  const input = scenarioCISInput(LIVE, { brent: 100, livePrice: 80, zar: 5, gold: 0 });
  assert.equal(input.brentChg, 26);
  assert.equal(input.usdZarChg, 5.2);
  assert.ok(input.banksChg < LIVE.banksChg);
  assert.ok(computeCIS(input).total < computeCIS(LIVE).total);
});
