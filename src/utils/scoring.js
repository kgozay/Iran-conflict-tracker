function clamp(v, min=-100, max=100) { return Math.max(min, Math.min(max, v)); }

export function computeMacroScore({ brentChg, usdZarChg, goldChg, r2035Chg }) {
  const brentImpact  = clamp(-brentChg  * 8,  -40, 40);
  const zarImpact    = clamp(-usdZarChg * 15, -30, 30);
  const goldImpact   = clamp(goldChg    * 5,  -20, 20);
  const bondImpact   = clamp(-r2035Chg  * 60, -15, 15); // R2035 rising = tighter = bearish
  return clamp(Math.round(brentImpact + zarImpact + goldImpact + bondImpact));
}

export function computeJSEScore({ top40Chg, minersChg, energyChg, banksChg, retailersChg, industrialsChg }) {
  const weighted =
    (top40Chg       * 25) +
    (minersChg      * 20) +
    (energyChg      * 10) +
    (banksChg       * 20) +
    (retailersChg   * 15) +
    (industrialsChg * 10);
  return clamp(Math.round(weighted / 10));
}

export function computeConfirmationScore({ brentChg, usdZarChg, goldChg, r2035Chg, minersChg, banksChg, retailersChg, top40Chg }) {
  const bearSignals = [
    brentChg   > 2,
    usdZarChg  > 0.8,
    banksChg   < -1,
    retailersChg < -1,
    top40Chg   < -0.5,
    r2035Chg   > 0.2,   // rising R2035 = bearish signal
  ].filter(Boolean).length;
  const bullSignals = [
    goldChg    > 1,
    minersChg  > 1,
    brentChg   < -2,
    usdZarChg  < -0.5,
    r2035Chg   < -0.1,  // falling R2035 = bullish signal
  ].filter(Boolean).length;
  return clamp(Math.round((bullSignals - bearSignals) * 16));
}

export function computeCIS(data) {
  const macroScore = computeMacroScore(data);
  const jseScore   = computeJSEScore(data);
  const confScore  = computeConfirmationScore(data);
  const total = clamp(Math.round(macroScore*0.40 + jseScore*0.35 + confScore*0.25));

  let regime, regimeClass;
  if      (total <= -40) { regime='BEARISH SHOCK';  regimeClass='bear'; }
  else if (total <= -15) { regime='MILD BEARISH';   regimeClass='warn'; }
  else if (total <=  15) { regime='NEUTRAL';        regimeClass='neutral'; }
  else if (total <=  40) { regime='MILD BULLISH';   regimeClass='bull'; }
  else                   { regime='BULLISH RELIEF'; regimeClass='bull'; }

  return {
    total, regime, regimeClass,
    components: {
      macro: { score:macroScore, weight:0.40, contrib:+(macroScore*0.40).toFixed(1) },
      jse:   { score:jseScore,   weight:0.35, contrib:+(jseScore*0.35).toFixed(1)   },
      conf:  { score:confScore,  weight:0.25, contrib:+(confScore*0.25).toFixed(1)  },
    },
  };
}
