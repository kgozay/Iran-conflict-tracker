/** Compare a macro trigger with observed 1D sector moves, without implying causation. */
export function getChannelEvidence(changePct, threshold, sectors, expectations) {
  const observations = expectations.map(({ sector, direction }) => ({
    sector,
    direction,
    changePct: sectors?.[sector]?.chg ?? null,
  }));
  const triggered = Number.isFinite(changePct) && changePct > threshold;
  const available = observations.filter(item => Number.isFinite(item.changePct));
  const consistent = available.filter(item => item.changePct * item.direction >= 0.2).length;

  let state = Number.isFinite(changePct) ? 'idle' : 'missing';
  if (triggered && available.length < 2) state = 'insufficient';
  else if (triggered && consistent >= Math.ceil(available.length * 2 / 3)) state = 'consistent';
  else if (triggered && consistent === 0) state = 'divergent';
  else if (triggered) state = 'mixed';

  return { triggered, state, observations, available: available.length, consistent };
}

/* Live move for a stage-3 chip: tickers are read from the chip's parentheses,
 * e.g. "Banks (SBK, FSR, NED, ABG) · NII Stress", and averaged over tracked names. */
export function chipMove(label, stocks) {
  const tickers = [...label.matchAll(/\(([^)]+)\)/g)]
    .flatMap(m => m[1].split(/[\s,/]+/))
    .filter(Boolean);
  const matched = (stocks ?? []).filter(st =>
    tickers.includes(st.display) && st.isLive && Number.isFinite(st.changePct)
  );
  if (!matched.length) return null;
  const avg = matched.reduce((a, st) => a + st.changePct, 0) / matched.length;
  return {
    avg,
    detail: matched.map(st => `${st.display} ${st.changePct >= 0 ? '+' : ''}${st.changePct.toFixed(2)}%`).join(' · '),
  };
}
