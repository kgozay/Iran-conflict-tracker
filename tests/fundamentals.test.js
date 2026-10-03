import test from 'node:test';
import assert from 'node:assert/strict';
import { formatMarketCap, mergeFundamentals, FUNDAMENTALS_MAX_AGE } from '../src/utils/fundamentals.js';
import api from '../api/fundamentals.js';

const { normaliseFundamentals } = api;

test('formatMarketCap matches the static figure style', () => {
  assert.equal(formatMarketCap(1.42e12), 'R1.42T');
  assert.equal(formatMarketCap(312e9), 'R312B');
  assert.equal(formatMarketCap(9.8e9), 'R9.8B');
  assert.equal(formatMarketCap(850e6), 'R850M');
  assert.equal(formatMarketCap(null), null);
  assert.equal(formatMarketCap(0), null);
});

test('normaliser converts JSE cents to rand and drops non-positive P/E', () => {
  assert.deepEqual(
    normaliseFundamentals({ trailingPE: 9.437, marketCap: 37_200_000_000_000, currency: 'ZAc' }),
    { pe: 9.4, marketCapZar: 372_000_000_000, currency: 'ZAc' },
  );
  assert.equal(normaliseFundamentals({ trailingPE: -4.2, marketCap: 1e12, currency: 'ZAc' }).pe, null);
  assert.equal(normaliseFundamentals({ marketCap: 5e9, currency: 'USD' }).marketCapZar, 5e9);
});

test('normaliser reads quoteSummary { raw, fmt } values', () => {
  const out = normaliseFundamentals({ trailingPE: { raw: 28.41, fmt: '28.41' }, marketCap: { raw: 1.42e14 }, currency: 'ZAc' });
  assert.equal(out.pe, 28.4);
  assert.equal(out.marketCapZar, 1.42e12);
});

const NOW = 1_800_000_000_000;
const STOCKS = [
  { ticker: 'SBK.JO', pe: 9.4, mktcap: 'R372B' },
  { ticker: 'GRT.JO', pe: null, mktcap: null },
  { ticker: 'NPN.JO', pe: 28.4, mktcap: 'R1.42T' },
];

test('live values win, then recent cached values, then static figures', () => {
  const live   = { ts: NOW, data: { 'SBK.JO': { pe: 10.1, marketCapZar: 400e9 } } };
  const cached = { ts: NOW - 60_000, data: { 'SBK.JO': { pe: 1, marketCapZar: 1 }, 'GRT.JO': { pe: 7.5, marketCapZar: 45e9 } } };
  const [sbk, grt, npn] = mergeFundamentals(STOCKS, live, cached, NOW);

  assert.deepEqual([sbk.pe, sbk.mktcap, sbk.fundamentalsSource], [10.1, 'R400B', 'live']);
  assert.deepEqual([grt.pe, grt.mktcap, grt.fundamentalsSource], [7.5, 'R45.0B', 'cached']);
  assert.equal(grt.fundamentalsAsOf, cached.ts);
  assert.deepEqual([npn.pe, npn.mktcap, npn.fundamentalsSource], [28.4, 'R1.42T', 'static']);
});

test('cached values older than 24 hours are ignored', () => {
  const stale = { ts: NOW - FUNDAMENTALS_MAX_AGE - 1, data: { 'SBK.JO': { pe: 11, marketCapZar: 400e9 } } };
  const [sbk] = mergeFundamentals(STOCKS, null, stale, NOW);
  assert.equal(sbk.fundamentalsSource, 'static');
  assert.equal(sbk.pe, 9.4);
});

test('a live loss-maker keeps a null P/E instead of reviving the static one', () => {
  const live = { ts: NOW, data: { 'SBK.JO': { pe: null, marketCapZar: 300e9 } } };
  const [sbk] = mergeFundamentals(STOCKS, live, null, NOW);
  assert.equal(sbk.pe, null);
  assert.equal(sbk.fundamentalsSource, 'live');
});
