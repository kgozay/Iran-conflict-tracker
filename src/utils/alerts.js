export function computeAlerts({ assets, sectors, stocks }) {
  const alerts = [];
  const now = new Date().toLocaleTimeString('en-ZA', {
    timeZone: 'Africa/Johannesburg', hour:'2-digit', minute:'2-digit',
  });

  const brent  = assets.brent?.changePct   ?? 0;
  const usdZar = assets.usdZar?.changePct  ?? 0;
  const gold   = assets.gold?.changePct    ?? 0;
  const r2035  = assets.r2035?.changePct   ?? 0;
  const top40  = sectors.top40?.chg        ?? 0;
  const banks  = sectors.Banks?.chg        ?? 0;
  const retail = sectors.Retailers?.chg    ?? 0;
  const miners = sectors['Gold Miners']?.chg ?? 0;
  const energy = sectors.Energy?.chg       ?? 0;

  // Thematic composites
  if (brent > 3 && usdZar > 0.8)
    alerts.push({ id:'oil-shock', lvl:'red', tag:'os', label:'OIL SHOCK ALERT',
      text:`COMPOSITE: Brent +${brent.toFixed(1)}% AND ZAR +${usdZar.toFixed(1)}% simultaneously. Double CPI transmission engaged.`, time:now });

  if (usdZar > 1 && banks < -1.5 && retail < -1.5)
    alerts.push({ id:'domestic-stress', lvl:'red', tag:'ds', label:'DOMESTIC STRESS',
      text:`COMPOSITE: ZAR +${usdZar.toFixed(1)}% + Banks ${banks.toFixed(1)}% + Retailers ${retail.toFixed(1)}%. SA consumer stress regime.`, time:now });

  if (gold > 1.5 && usdZar > 0.5 && miners > top40 + 1)
    alerts.push({ id:'miner-support', lvl:'green', tag:'ms', label:'MINER SUPPORT',
      text:`COMPOSITE: Gold +${gold.toFixed(1)}% + ZAR hedge. Miners +${miners.toFixed(1)}% outperforming market by ${(miners-top40).toFixed(1)}%.`, time:now });

  if (brent < -2 && usdZar < 0.3 && top40 > 1)
    alerts.push({ id:'deescalation', lvl:'green', tag:'ms', label:'DE-ESCALATION RELIEF',
      text:`COMPOSITE: Brent ${brent.toFixed(1)}%, ZAR stable, market +${top40.toFixed(1)}%. Conflict relief rally.`, time:now });

  // R2035 bond alerts (replaces sa10y)
  if (r2035 > 0.3)
    alerts.push({ id:'r2035-amber', lvl:'amber', tag:'in', label:'R2035 RISING',
      text:`R2035 bond yield +${r2035.toFixed(2)}% — tighter conditions weighing on bank valuations and retail credit.`, time:now });
  if (r2035 > 0.6)
    alerts.push({ id:'r2035-red', lvl:'red', tag:'ds', label:'R2035 CRITICAL',
      text:`R2035 bond yield surge +${r2035.toFixed(2)}% — approaching 11.0% resistance. SARB intervention risk elevated.`, time:now });

  // Individual thresholds
  if (brent > 4)
    alerts.push({ id:'brent-red', lvl:'red', tag:'in', label:'BRENT CRITICAL',
      text:`Brent +${brent.toFixed(1)}% — red threshold (>+4%) breached. Fuel levy pass-through imminent.`, time:now });
  else if (brent > 2)
    alerts.push({ id:'brent-amber', lvl:'amber', tag:'in', label:'BRENT AMBER',
      text:`Brent +${brent.toFixed(1)}% — amber threshold (>+2%) triggered.`, time:now });

  if (usdZar > 1.5)
    alerts.push({ id:'zar-red', lvl:'red', tag:'ds', label:'ZAR CRITICAL',
      text:`USD/ZAR +${usdZar.toFixed(1)}% — critical (>+1.5%) breached. SARB intervention risk.`, time:now });
  else if (usdZar > 0.8)
    alerts.push({ id:'zar-amber', lvl:'amber', tag:'ds', label:'ZAR AMBER',
      text:`USD/ZAR +${usdZar.toFixed(1)}% — amber (>+0.8%) triggered.`, time:now });

  if (gold > 2)
    alerts.push({ id:'gold-red', lvl:'amber', tag:'ms', label:'GOLD SURGE',
      text:`Gold +${gold.toFixed(1)}% — red threshold exceeded. Strong safe-haven demand.`, time:now });
  else if (gold > 1)
    alerts.push({ id:'gold-amber', lvl:'amber', tag:'ms', label:'GOLD AMBER',
      text:`Gold +${gold.toFixed(1)}% — amber threshold triggered. Risk-off demand building.`, time:now });

  if (top40 < -2)
    alerts.push({ id:'top40-red', lvl:'red', tag:'in', label:'MARKET SELLOFF',
      text:`JSE market avg ${top40.toFixed(1)}% — red threshold (<-2%) breached.`, time:now });
  else if (top40 < -1)
    alerts.push({ id:'top40-amber', lvl:'amber', tag:'in', label:'MARKET AMBER',
      text:`JSE market avg ${top40.toFixed(1)}% — amber threshold (<-1%) triggered.`, time:now });

  if (energy > 4)
    alerts.push({ id:'energy-hot', lvl:'green', tag:'ms', label:'ENERGY RED-HOT',
      text:`Energy basket +${energy.toFixed(1)}% — RED-HOT threshold (>+4%) exceeded.`, time:now });
  else if (energy > 2)
    alerts.push({ id:'energy-amber', lvl:'green', tag:'ms', label:'ENERGY BULLISH',
      text:`Energy basket +${energy.toFixed(1)}% — oil price tailwind active.`, time:now });

  return alerts.slice(0, 9);
}

export function getAssetAlertLevel(key, changePct) {
  const T = {
    brent:     { amber:2,   red:4,   bearish:true  },
    usdZar:    { amber:0.8, red:1.5, bearish:true  },
    gold:      { amber:1,   red:2,   bearish:false  },
    platinum:  { amber:1.5, red:3,   bearish:false  },
    palladium: { amber:1.5, red:3,   bearish:false  },
    coal:      { amber:2,   red:4,   bearish:false  },
    r2035:     { amber:0.1, red:0.3, bearish:true   },  // rising yield = bad for JSE
  };
  const t = T[key];
  if (!t) return null;
  const v = t.bearish ? changePct : Math.abs(changePct);
  if (v > t.red)   return 'red';
  if (v > t.amber) return 'amber';
  return null;
}
