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
