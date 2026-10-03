export function averageDatedReturns(series, minCoverage = 0) {
  const byDate = new Map();
  for (const points of series) {
    for (const { date, value } of points) {
      if (!date || !Number.isFinite(value)) continue;
      const values = byDate.get(date) ?? [];
      values.push(value);
      byDate.set(date, values);
    }
  }
  const required = Math.max(1, Math.ceil(series.length * minCoverage));
  return new Map([...byDate]
    .filter(([, values]) => values.length >= required)
    .map(([date, values]) => [
      date, values.reduce((sum, value) => sum + value, 0) / values.length,
    ]));
}

export function alignedCorrelation(first, second, minSessions = 10) {
  const dates = [...first.keys()].filter(date => second.has(date)).sort();
  const count = dates.length;
  if (count < minSessions) return { value: null, count };
  const a = dates.map(date => first.get(date));
  const b = dates.map(date => second.get(date));
  const meanA = a.reduce((sum, value) => sum + value, 0) / count;
  const meanB = b.reduce((sum, value) => sum + value, 0) / count;
  const covariance = a.reduce((sum, value, i) => sum + (value - meanA) * (b[i] - meanB), 0);
  const varianceA = a.reduce((sum, value) => sum + (value - meanA) ** 2, 0);
  const varianceB = b.reduce((sum, value) => sum + (value - meanB) ** 2, 0);
  const denominator = Math.sqrt(varianceA * varianceB);
  return { value: denominator === 0 ? null : covariance / denominator, count };
}
