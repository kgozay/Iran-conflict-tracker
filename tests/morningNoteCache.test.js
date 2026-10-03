import test from 'node:test';
import assert from 'node:assert/strict';
import { morningNoteSignature, loadMorningNote, saveMorningNote } from '../src/utils/morningNoteCache.js';

function snapshot(brentChange = 2, fetchedAt = '2026-10-03T07:00:00.000Z') {
  return {
    assets: { brent: { price: 80, changePct: brentChange, source: 'Yahoo' } },
    sectors: { Energy: { chg: 1 } },
    cis: { total: -20, regime: 'MILD BEARISH', components: {
      macro: { score: -30 }, jse: { score: -10 }, conf: { score: -20 },
    } },
    stocks: [{ ticker: 'SOL.JO', display: 'SOL', sector: 'Energy', isLive: true, changePct: 1 }],
    alerts: [],
    dataHealth: {
      lastFetch: fetchedAt, quoteCoverage: 100, liveStocks: 1, totalStocks: 1,
      market: { label: 'Within JSE hours' }, minutesOld: 0,
    },
  };
}

test('a changed market input invalidates a note even when CIS is unchanged', () => {
  assert.notEqual(morningNoteSignature(snapshot(2)), morningNoteSignature(snapshot(3)));
  assert.notEqual(
    morningNoteSignature(snapshot(2)),
    morningNoteSignature(snapshot(2, '2026-10-03T07:05:00.000Z')),
  );
});

test('display-only age changes do not invalidate the note', () => {
  const first = snapshot();
  const older = snapshot();
  older.dataHealth.minutesOld = 5;
  assert.equal(morningNoteSignature(first), morningNoteSignature(older));
});

test('cache restores only the matching market snapshot', () => {
  const data = new Map();
  const storage = {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
  const signature = morningNoteSignature(snapshot());
  const entry = { signature, note: 'Brief for this snapshot', meta: { snapshotAt: snapshot().dataHealth.lastFetch } };
  saveMorningNote(storage, entry);
  assert.deepEqual(loadMorningNote(storage, signature), entry);
  assert.equal(loadMorningNote(storage, morningNoteSignature(snapshot(3))), null);
});
