function clamp(v, min=-100, max=100) { return Math.max(min, Math.min(max, v)); }
function valid(v) { return typeof v === 'number' && Number.isFinite(v); }

function contribution(label, raw, impact, reason) {
  return { label, raw: valid(raw) ? +raw.toFixed(4) : null, impact: Math.round(impact), reason };
}

export function computeMacroScore({ brentChg, usdZarChg, goldChg, r2035Chg, includeBond = true }) {
  const parts = [];
  const brentImpact = valid(brentChg) ? clamp(-brentChg * 8, -40, 40) : 0;
  const zarImpact   = valid(usdZarChg) ? clamp(-usdZarChg * 15, -30, 30) : 0;
  const goldImpact  = valid(goldChg) ? clamp(goldChg * 5, -20, 20) : 0;
  const bondImpact  = includeBond && valid(r2035Chg) ? clamp(-r2035Chg * 60, -15, 15) : 0;

  parts.push(contribution('Brent', brentChg, brentImpact, 'Higher oil is usually negative for SA inflation, the rand and domestic cyclicals.'));
  parts.push(contribution('USD/ZAR', usdZarChg, zarImpact, 'Rand weakness is treated as a risk-off / imported-inflation signal.'));
  parts.push(contribution('Gold', goldChg, goldImpact, 'Gold strength can cushion the JSE through miners during geopolitical stress.'));
  if (includeBond) parts.push(contribution('SA 10Y yield proxy', r2035Chg, bondImpact, 'Rising yields tighten financial conditions; falling yields are supportive.'));

  return { score: clamp(Math.round(parts.reduce((a, p) => a + p.impact, 0))), parts };
}

export function computeJSEScore({ top40Chg, minersChg, energyChg, banksChg, retailersChg, industrialsChg }) {
  const weighted =
    ((valid(top40Chg) ? top40Chg : 0) * 25) +
    ((valid(minersChg) ? minersChg : 0) * 20) +
    ((valid(energyChg) ? energyChg : 0) * 10) +
    ((valid(banksChg) ? banksChg : 0) * 20) +
    ((valid(retailersChg) ? retailersChg : 0) * 15) +
    ((valid(industrialsChg) ? industrialsChg : 0) * 10);
  const score = clamp(Math.round(weighted / 10));
  const parts = [
    contribution('JSE market avg', top40Chg, (valid(top40Chg) ? top40Chg : 0) * 2.5, 'Broad equal-weight market direction.'),
    contribution('Gold miners', minersChg, (valid(minersChg) ? minersChg : 0) * 2.0, 'Haven/commodity beta channel.'),
    contribution('Energy', energyChg, (valid(energyChg) ? energyChg : 0) * 1.0, 'Oil/coal earnings channel.'),
    contribution('Banks', banksChg, (valid(banksChg) ? banksChg : 0) * 2.0, 'Domestic credit and rates channel.'),
    contribution('Retailers', retailersChg, (valid(retailersChg) ? retailersChg : 0) * 1.5, 'Consumer/rand-sensitive domestic channel.'),
    contribution('Industrials', industrialsChg, (valid(industrialsChg) ? industrialsChg : 0) * 1.0, 'Large-cap offshore and general cyclicals channel.'),
  ];
  return { score, parts };
}

export function computeConfirmationScore({ brentChg, usdZarChg, goldChg, r2035Chg, minersChg, banksChg, retailersChg, top40Chg, includeBond = true }) {
  const bearTests = [
    { on: valid(brentChg) && brentChg > 2, label: 'Brent shock', raw: brentChg, reason: 'Brent above +2% confirms oil-shock pressure.' },
    { on: valid(usdZarChg) && usdZarChg > 0.8, label: 'Rand weakness', raw: usdZarChg, reason: 'USD/ZAR above +0.8% confirms EM risk-off.' },
    { on: valid(banksChg) && banksChg < -1, label: 'Banks sell-off', raw: banksChg, reason: 'Banks below -1% confirms domestic stress.' },
    { on: valid(retailersChg) && retailersChg < -1, label: 'Retailers sell-off', raw: retailersChg, reason: 'Retailers below -1% confirms consumer/rand stress.' },
    { on: valid(top40Chg) && top40Chg < -0.5, label: 'Market drawdown', raw: top40Chg, reason: 'Market average below -0.5% confirms broad de-risking.' },
    { on: includeBond && valid(r2035Chg) && r2035Chg > 0.2, label: 'Yield pressure', raw: r2035Chg, reason: 'SA 10Y proxy up more than 0.2% confirms tighter conditions.' },
  ];
  const bullTests = [
    { on: valid(goldChg) && goldChg > 1, label: 'Gold bid', raw: goldChg, reason: 'Gold above +1% supports haven/miner hedge.' },
    { on: valid(minersChg) && minersChg > 1, label: 'Miners bid', raw: minersChg, reason: 'Gold miners above +1% confirms equity hedge channel.' },
    { on: valid(brentChg) && brentChg < -2, label: 'Oil relief', raw: brentChg, reason: 'Brent below -2% lowers inflation/rand pressure.' },
    { on: valid(usdZarChg) && usdZarChg < -0.5, label: 'Rand strength', raw: usdZarChg, reason: 'USD/ZAR below -0.5% confirms risk appetite/carry support.' },
    { on: includeBond && valid(r2035Chg) && r2035Chg < -0.1, label: 'Yield relief', raw: r2035Chg, reason: 'Falling SA 10Y proxy supports equity duration and banks.' },
  ];
  const bears = bearTests.filter(t => t.on);
  const bulls = bullTests.filter(t => t.on);
  const score = clamp(Math.round((bulls.length - bears.length) * 16));
  const parts = [
    ...bulls.map(t => contribution(t.label, t.raw, +16, t.reason)),
    ...bears.map(t => contribution(t.label, t.raw, -16, t.reason)),
  ];
  return { score, parts };
}

export function computeCIS(data) {
  const macro = computeMacroScore(data);
  const jse   = computeJSEScore(data);
  const conf  = computeConfirmationScore(data);
  const total = clamp(Math.round(macro.score*0.40 + jse.score*0.35 + conf.score*0.25));

  let regime, regimeClass;
  if      (total <= -40) { regime='BEARISH SHOCK';  regimeClass='bear'; }
  else if (total <= -15) { regime='MILD BEARISH';   regimeClass='warn'; }
  else if (total <=  15) { regime='NEUTRAL';        regimeClass='neutral'; }
  else if (total <=  40) { regime='MILD BULLISH';   regimeClass='bull'; }
  else                   { regime='BULLISH RELIEF'; regimeClass='bull'; }

  const components = {
    macro: { score:macro.score, weight:0.40, contrib:+(macro.score*0.40).toFixed(1), parts: macro.parts },
    jse:   { score:jse.score,   weight:0.35, contrib:+(jse.score*0.35).toFixed(1), parts: jse.parts },
    conf:  { score:conf.score,  weight:0.25, contrib:+(conf.score*0.25).toFixed(1), parts: conf.parts },
  };

  const drivers = Object.entries(components)
    .flatMap(([bucket, comp]) => (comp.parts || []).map(p => ({ ...p, bucket, weightedImpact:+(p.impact * comp.weight).toFixed(1) })))
    .filter(p => p.impact !== 0)
    .sort((a, b) => Math.abs(b.weightedImpact) - Math.abs(a.weightedImpact));

  return { total, regime, regimeClass, components, drivers, methodology: 'Heuristic score: Macro 40%, JSE equal-weight basket reaction 35%, confirmation signals 25%.' };
}
