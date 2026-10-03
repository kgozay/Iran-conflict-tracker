import test from 'node:test';
import assert from 'node:assert/strict';
import market from '../api/_lib/market.js';
import backfill from '../api/cis-backfill.js';
import digest from '../api/daily-digest.js';

const q = (price, changePct) => ({ price, changePct });

test('server snapshot scores quotes with the dashboard CIS', async () => {
  const snap = await market.buildSnapshot({
    'BZ=F': q(90, 4), 'USDZAR=X': q(19, 1.5), 'GC=F': q(4000, 1), 'STX40.JO': q(95, -1.2),
    'FSR.JO': q(80, -2), 'SHP.JO': q(300, -1.5),
  });
  assert.ok(snap.cis.total < 0);
  assert.equal(snap.assets.jseTop40.isLive, true);
  assert.equal(snap.sectors.Banks.chg, -2);
  assert.ok(snap.coverage > 0 && snap.coverage < 100);

  const reading = market.toReading(snap, 'test', 123);
  assert.deepEqual(
    { ts: reading.ts, total: reading.total, top40: reading.top40, brent: reading.brent, source: reading.source },
    { ts: 123, total: snap.cis.total, top40: 95, brent: 4, source: 'test' },
  );

  const figures = digest.buildFigures(snap);
  assert.match(figures, /Brent \$90\.00 \(\+4\.00%\)/);
  assert.match(digest.buildPrompt(figures, 'today'), /use only these numbers/);
});

test('daily bars use exchange-local dates and adjusted closes', () => {
  const bars = backfill.parseDailyBars({
    meta: { gmtoffset: 7200 },
    timestamp: [1772431200, 1772517600, 1772604000],  // 2026-03-02/03/04 07:00 UTC
    indicators: { quote: [{ close: [1, 2, 3] }], adjclose: [{ adjclose: [10, null, 30] }] },
  });
  assert.deepEqual(bars, [{ date: '2026-03-02', close: 10 }, { date: '2026-03-04', close: 30 }]);
});
