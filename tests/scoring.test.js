import test from 'node:test';
import assert from 'node:assert/strict';
import { computeCIS } from '../src/utils/scoring.js';

const INPUT_KEYS = [
  'brentChg', 'usdZarChg', 'goldChg', 'us10yChg', 'top40Chg',
  'minersChg', 'energyChg', 'banksChg', 'retailersChg', 'industrialsChg',
];

function expectedRegime(total) {
  if (total <= -40) return 'BEARISH SHOCK';
  if (total <= -15) return 'MILD BEARISH';
  if (total <= 15)  return 'NEUTRAL';
  if (total <= 40)  return 'MILD BULLISH';
  return 'BULLISH RELIEF';
}

test('flat markets score zero and read neutral', () => {
  const input = Object.fromEntries(INPUT_KEYS.map(k => [k, 0]));
  const cis = computeCIS(input);
  assert.equal(cis.total, 0);
  assert.equal(cis.regime, 'NEUTRAL');
  assert.equal(cis.drivers.length, 0);
});

test('missing inputs are treated as no signal rather than throwing', () => {
  const cis = computeCIS({});
  assert.equal(cis.total, 0);
  assert.equal(cis.regime, 'NEUTRAL');
});

test('a Brent rise counts against SA, a gold rise in favour', () => {
  const brent = computeCIS({ brentChg: 3 }).components.macro.parts.find(p => p.label === 'Brent');
  const gold  = computeCIS({ goldChg: 2 }).components.macro.parts.find(p => p.label === 'Gold');
  assert.ok(brent.impact < 0);
  assert.ok(gold.impact > 0);
});

test('a broad conflict shock lands in BEARISH SHOCK and relief in BULLISH RELIEF', () => {
  const shock = computeCIS({
    brentChg: 6, usdZarChg: 2.5, goldChg: -1, us10yChg: 4, top40Chg: -3,
    minersChg: -2, energyChg: -1, banksChg: -4, retailersChg: -4, industrialsChg: -3,
  });
  assert.equal(shock.regime, 'BEARISH SHOCK');

  const relief = computeCIS({
    brentChg: -6, usdZarChg: -2.5, goldChg: 3, us10yChg: -4, top40Chg: 3,
    minersChg: 4, energyChg: 1, banksChg: 4, retailersChg: 4, industrialsChg: 3,
  });
  assert.equal(relief.regime, 'BULLISH RELIEF');
});

test('regime always matches the total across random inputs (boundaries inclusive)', () => {
  let seed = 42;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const seen = new Set();
  for (let i = 0; i < 2000; i++) {
    const input = Object.fromEntries(INPUT_KEYS.map(k => [k, (rnd() - 0.5) * 10]));
    const cis = computeCIS(input);
    assert.ok(cis.total >= -100 && cis.total <= 100, `total out of range: ${cis.total}`);
    assert.equal(cis.regime, expectedRegime(cis.total), `total ${cis.total}`);
    seen.add(cis.regime);
  }
  assert.equal(seen.size, 5, 'random inputs should exercise every regime');
});

test('drivers are sorted by absolute weighted impact', () => {
  const { drivers } = computeCIS({ brentChg: 4, goldChg: 0.5, banksChg: -2 });
  for (let i = 1; i < drivers.length; i++) {
    assert.ok(Math.abs(drivers[i - 1].weightedImpact) >= Math.abs(drivers[i].weightedImpact));
  }
});
