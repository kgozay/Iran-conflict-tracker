/**
 * Compute a directional signal label from live changePct.
 * Used anywhere stock.signal is displayed.
 */
export function getSignal(changePct) {
  if (changePct == null) return null;
  if (changePct >  2.5) return 'BULLISH';
  if (changePct >  0.5) return 'MILD BULL';
  if (changePct > -0.5) return 'NEUTRAL';
  if (changePct > -2.5) return 'MILD BEAR';
  return 'BEARISH';
}

// Signal → Tailwind classes (all static so Tailwind includes them)
export const SIGNAL_CLS = {
  BULLISH:    'bg-bull/10 text-bull   border-bull/30',
  'MILD BULL':'bg-bull/6  text-bull   border-bull/20',
  NEUTRAL:    'bg-bg-e    text-ts     border-bd',
  'MILD BEAR':'bg-bear/6  text-bear   border-bear/20',
  BEARISH:    'bg-bear/10 text-bear   border-bear/30',
};
