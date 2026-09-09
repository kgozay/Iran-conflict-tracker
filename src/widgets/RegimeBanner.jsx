import React, { Suspense, lazy, useState, useMemo } from 'react';
import clsx from 'clsx';
import { CountUp, DecryptedText } from './Effects.jsx';
import { CONFLICT_EVENTS } from '../data/conflictEvents.js';

const RegimeHistoryChart = lazy(() => import('./RegimeHistoryChart.jsx'));

const TONE_TEXT = { bear: 'text-bear', warn: 'text-warn', bull: 'text-bull', neutral: 'text-ts' };
const TONE_BG   = { bear: 'bg-bear',  warn: 'bg-warn',   bull: 'bg-bull',   neutral: 'bg-ts'   };
const TONE_HEX  = { bear: '#f97070',  warn: '#e8b04a',   bull: '#34d399',   neutral: '#a39d8d' };

const INTERP = {
  bear:    'Oil, FX, rates and/or domestic equity breadth are transmitting conflict risk into SA assets.',
  warn:    'Conflict pricing is present but not decisive; rotation and confirmation signals matter more than the headline score.',
  neutral: 'Current market action is not confirming a major SA transmission channel. Monitor for a break in oil or USD/ZAR.',
  bull:    'Risk relief or commodity offsets are dominating. Check whether domestic cyclicals are also participating.',
};

const PLAYBOOK = {
  bear: {
    title: 'Defensive Playbook Active',
    points: [
      'Overweight Gold & PGM miners as safe-haven anchors.',
      'Underweight JSE Banks & Retailers due to interest-rate hikes.',
      'Hold offshore cash cushions and rand-hedge stocks (Naspers, Richemont).'
    ]
  },
  warn: {
    title: 'Defensive Pivot Recommended',
    points: [
      'De-risk high-beta domestic cyclicals into market rallies.',
      'Selectively add gold/PGM miners on minor pullbacks.',
      'Shift duration to defensive short-term income funds.'
    ]
  },
  neutral: {
    title: 'Standard Playbook Active',
    points: [
      'Focus on stock-specific fundamentals rather than macro-hedges.',
      'Maintain normal structural sector weights across JSE.',
      'Monitor Brent crude and USD/ZAR for breakout triggers.'
    ]
  },
  bull: {
    title: 'Relief Playbook Active',
    points: [
      'Re-engage domestic cyclical beta (Banks, Retailers).',
      'Underweight gold miners as safe-haven premiums dissolve.',
      'Deploy cash cushions into oversold domestic shares.'
    ]
  }
};

function componentLabel(score) {
  if (score <= -35) return 'High pressure';
  if (score <= -12) return 'Moderate pressure';
  if (score >= 35)  return 'Strong offset';
  if (score >= 12)  return 'Mild offset';
  return 'Contained';
}

function componentColor(score) {
  if (score < -15) return 'text-bear';
  if (score > 15)  return 'text-bull';
  return 'text-ts';
}

function computeTrend(data) {
  if (!data || data.length < 2) return null;
  const recent = data.slice(-5);
  const delta = +(recent[recent.length - 1].total - recent[0].total).toFixed(1);
  if (Math.abs(delta) < 1) return { dir: 'flat', delta: 0 };
  return { dir: delta > 0 ? 'up' : 'down', delta };
}

export default function RegimeBanner({ cis, hasData, cisChartData }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const rc       = cis.regimeClass ?? 'neutral';
  const toneText = TONE_TEXT[rc] ?? TONE_TEXT.neutral;
  const toneBg   = TONE_BG[rc]   ?? TONE_BG.neutral;
  const toneHex  = TONE_HEX[rc]  ?? TONE_HEX.neutral;
  const pct      = Math.max(2, Math.min(98, ((cis.total + 100) / 200) * 100));
  const trend    = computeTrend(cisChartData);
  const interp   = INTERP[rc] ?? '';

  const macro = cis.components?.macro?.score ?? 0;
  const jse   = cis.components?.jse?.score   ?? 0;
  const conf  = cis.components?.conf?.score  ?? 0;

  const playbookData = PLAYBOOK[rc] ?? PLAYBOOK.neutral;
  const topDrivers = (cis.drivers || []).slice(0, 5);

  // Determine Recharts color variable dynamically based on regime
  const toneVar = rc === 'bear' ? 'var(--color-bear)' : rc === 'warn' ? 'var(--color-warn)' : rc === 'bull' ? 'var(--color-bull)' : 'var(--color-ts)';

  // Process visible event markers
  const visibleEvents = useMemo(() => {
    if (!cisChartData || cisChartData.length === 0) return [];
    const minTs = cisChartData[0].ts;
    const maxTs = cisChartData[cisChartData.length - 1].ts;

    const mapped = CONFLICT_EVENTS.map(ev => {
      const evTs = new Date(ev.date).getTime();
      if (evTs >= minTs && evTs <= maxTs) {
        let closestPoint = cisChartData[0];
        let minDiff = Math.abs(closestPoint.ts - evTs);
        for (const p of cisChartData) {
          const diff = Math.abs(p.ts - evTs);
          if (diff < minDiff) {
            minDiff = diff;
            closestPoint = p;
          }
        }
        return { ...ev, xValue: closestPoint.time };
      }
      return null;
    }).filter(Boolean);

    // Deduplicate by time string to prevent overlapping lines
    const seen = new Set();
    return mapped.filter(ev => {
      if (seen.has(ev.xValue)) return false;
      seen.add(ev.xValue);
      return true;
    });
  }, [cisChartData]);

  if (!hasData) {
    return (
      <div className="glass rounded-[16px] p-[26px_30px]">
        <div className="text-[11px] font-medium text-tm tracking-[0.08em] uppercase">Conflict Impact Score</div>
        <div className="font-serif text-[92px] text-tx leading-[0.9] tracking-[-0.04em] mt-4">—</div>
        <div className="text-[13.5px] text-tm leading-[1.6] mt-4">
          Fetch live data to compute the Conflict Impact Score.
        </div>
      </div>
    );
  }

  const CELLS = [
    { label: 'Macro',   wt: '40%', score: macro },
    { label: 'JSE',     wt: '35%', score: jse   },
    { label: 'Signals', wt: '25%', score: conf  },
  ];

  return (
    <div className="glass rounded-[16px] p-[26px_30px]">

      {/* Kicker */}
      <div className="text-[11px] font-medium text-tm tracking-[0.08em] uppercase">
        Conflict Impact Score
      </div>

      {/* Hero score + regime label */}
      <div className="flex items-end gap-[18px] mt-[18px]">
        <div
          className={clsx('font-serif leading-[0.9] tracking-[-0.04em]', toneText)}
          style={{ fontSize: 92 }}
          key={`cis-${cis.total}`}
        >
          <CountUp to={cis.total} decimals={0} />
        </div>
        <div className="pb-2">
          {/* FX3 DecryptedText — scramble → reveal */}
          <div className={clsx('font-serif italic text-[24px] leading-none', toneText)}>
            <DecryptedText text={cis.regime.toLowerCase()} />
          </div>
          {trend && trend.dir !== 'flat' && (
            <div className="text-[12px] font-semibold text-bear mt-2 font-mono">
              {trend.dir === 'down' ? '↓' : '↑'} {Math.abs(trend.delta)}{' '}
              <span className="text-tm font-normal">5-reading trend</span>
            </div>
          )}
        </div>
      </div>

      {/* Interpretation — magazine drop-cap on first letter */}
      <div className="text-[13.5px] text-ts leading-[1.6] mt-[18px] mag-dropcap">{interp}</div>

      {/* Slider with thumb */}
      <div className="mt-[22px]">
        <div className="relative h-[5px] bg-bg-h rounded-full">
          <div className="absolute left-1/2 top-[-2px] w-px h-[9px] bg-bd" />
          <div className={clsx('absolute top-0 left-0 h-full rounded-full', toneBg)}
            style={{ width: `${pct}%`, opacity: 0.88 }} />
          <div className="absolute top-[-5px] w-[14px] h-[14px] rounded-full bg-bg-c"
            style={{ left: `calc(${pct}% - 7px)`, border: `3px solid ${toneHex}` }} />
        </div>
        <div className="flex justify-between font-mono text-[10px] text-tm mt-[7px]">
          <span>-100</span><span>0</span><span>+100</span>
        </div>
      </div>

      {/* 3-up composition cells */}
      <div className="grid grid-cols-3 gap-[14px] mt-[22px] pt-5 border-t border-bd">
        {CELLS.map(({ label, wt, score }) => (
          <div key={label}>
            <div className="flex justify-between items-baseline">
              <span className="text-[11.5px] font-medium text-ts">{label}</span>
              <span className="text-[10px] text-tm">{wt}</span>
            </div>
            <div className={clsx('font-mono text-[24px] font-semibold mt-1 tracking-[-0.01em]', componentColor(score))}>
              {score > 0 ? '+' : ''}<CountUp to={score} decimals={0} />
            </div>
            <div className="text-[11px] text-ts mt-0.5">{componentLabel(score)}</div>
          </div>
        ))}
      </div>

      {/* Expandable toggle button */}
      <div className="mt-5 pt-4 border-t border-bd flex justify-center">
        <button
          type="button"
          onClick={() => setIsExpanded(e => !e)}
          className="flex items-center gap-1.5 px-4.5 py-2 text-[12px] font-semibold text-ts border border-bd rounded-lg hover:text-tp hover:border-ts transition-colors cursor-pointer select-none"
        >
          <svg className={clsx("w-3.5 h-3.5 transition-transform duration-300", isExpanded ? "rotate-180" : "")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
          {isExpanded ? 'Hide score details' : 'Explain this score'}
        </button>
      </div>

      {/* Expanded Trajectory Chart and Playbook Tray */}
      {isExpanded && (
        <div className="mt-5 pt-5 border-t border-bd grid grid-cols-1 lg:grid-cols-[1.65fr_1fr] gap-5 animate-fadeUp">
          <div className="lg:col-span-2 bg-bg-e border border-bd rounded-xl p-4 sm:p-5">
            <div className="font-medium text-[13px] text-tp">How the score is calculated</div>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-ts max-w-[72ch]">{cis.methodology}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4">
              {Object.entries(cis.components || {}).map(([key, component]) => (
                <div key={key} className="rounded-lg border border-bd bg-bg-c px-3 py-2.5">
                  <div className="flex justify-between text-[10.5px] text-tm">
                    <span className="capitalize">{key === 'jse' ? 'JSE watchlist' : key === 'conf' ? 'Confirmations' : key}</span>
                    <span>{Math.round(component.weight * 100)}% weight</span>
                  </div>
                  <div className="mt-1 font-mono text-[13px] text-tp">
                    Score {component.score > 0 ? '+' : ''}{component.score} · contribution {component.contrib > 0 ? '+' : ''}{component.contrib}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <div className="text-[10.5px] font-medium text-tm">Largest current drivers</div>
              {topDrivers.length ? (
                <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {topDrivers.map(driver => (
                    <li key={`${driver.bucket}-${driver.label}`} className="flex items-start justify-between gap-3 text-[11.5px] border-b border-bd pb-2">
                      <span><span className="text-tp font-medium">{driver.label}</span><span className="text-tm">: {driver.reason}</span></span>
                      <span className={clsx('font-mono flex-shrink-0', driver.weightedImpact >= 0 ? 'text-bull' : 'text-bear')}>
                        {driver.weightedImpact > 0 ? '+' : ''}{driver.weightedImpact}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : <div className="mt-2 text-[11.5px] text-tm">No non-zero drivers in the current reading.</div>}
            </div>
          </div>
          
          {/* Left: Historical CIS Area Chart */}
          <div className="flex flex-col">
            <div className="text-[10px] font-semibold text-ts mb-2.5 tracking-[0.05em] uppercase">CIS History Trajectory</div>
            {(!cisChartData || cisChartData.length === 0) ? (
              <div className="h-[180px] flex items-center justify-center bg-bg-e rounded-xl border border-bd text-tm text-[11px] font-mono">
                No history points logged yet. Trigger active refreshes.
              </div>
            ) : (
              <Suspense fallback={<div className="h-[180px] rounded-xl bg-bg-e animate-pulse" />}>
                <RegimeHistoryChart data={cisChartData} events={visibleEvents} toneVar={toneVar} toneHex={toneHex} />
              </Suspense>
            )}
          </div>

          {/* Right: Portfolio Hedging Playbook */}
          <div className="flex flex-col bg-bg-e rounded-xl border border-bd p-[16px_18px] justify-between">
            <div>
              <div className="text-[10px] font-semibold text-ts mb-2 tracking-[0.05em] uppercase">Hedging Playbook</div>
              <div className={clsx("font-serif text-[16px] italic leading-tight mb-2.5", toneText)}>
                {playbookData.title}
              </div>
              <ul className="flex flex-col gap-2">
                {playbookData.points.map((pt, idx) => (
                  <li key={idx} className="flex gap-2 items-start text-[11.5px] text-ts leading-normal font-sans">
                    <span className={clsx("w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5", toneBg)} />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="font-mono text-[8px] text-tm mt-4 pt-2 border-t border-bd">
              Allocations shift with the live Conflict Impact Score regime.
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
