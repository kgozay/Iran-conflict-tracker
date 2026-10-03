/**
 * Conflict episodes compared on the Crisis comparison chart. Each trajectory is
 * the CIS rebuilt from daily market closes (see /api/cis-backfill), so the
 * reference lines are calculated, not hand-drawn. `start` is the event date;
 * week 0 is the 7 days from it.
 */
export const CRISES = [
  { id: 'iran2026',   label: 'Iran war 2026',        start: '2026-02-28', current: true },
  { id: 'twelveDay',  label: '12-day war 2025',      start: '2025-06-13' },
  { id: 'gaza2023',   label: 'Israel–Gaza 2023',     start: '2023-10-07' },
  { id: 'ukraine2022', label: 'Russia–Ukraine 2022', start: '2022-02-24' },
];

export const CRISIS_WEEKS = 16;

/** First date the backfill needs (a little before the earliest crisis). */
export const BACKFILL_START = '2022-01-03';
