import React, { Suspense, lazy, useState, useMemo } from 'react';
import clsx from 'clsx';
import { CountUp } from './Effects.jsx';
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

function componentBg(score) {
  if (score < -15) return 'bg-bear';
  if (score > 15)  return 'bg-bull';
  return 'bg-ts';
}

function computeTrend(data) {
  if (!data || data.length < 2) return null;
  const recent = data.slice(-5);
  const delta = +(recent[recent.length - 1].total - recent[0].total).toFixed(1);
  if (Math.abs(delta) < 1) return { dir: 'flat', delta: 0 };
  return { dir: delta > 0 ? 'up' : 'down', delta };
}

export default function RegimeBanner({ cis, hasData, cisChartData, dataHealth }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const rc       = cis.regimeClass ?? 'neutral';
  const toneText = TONE_TEXT[rc] ?? TONE_TEXT.neutral;
  const toneBg   = TONE_BG[rc]   ?? TONE_BG.neutral;
  const toneHex  = TONE_HEX[rc]  ?? TONE_HEX.neutral;
  const pct          = Math.max(3, Math.min(97, ((cis.total + 100) / 200) * 100));
  const clampedTotal = Math.max(-100, Math.min(100, cis.total ?? 0));
  const fillLeft     = clampedTotal < 0 ? 50 + (clampedTotal / 2) : 50;
  const fillWidth    = Math.abs(clampedTotal) / 2;
  const trend        = computeTrend(cisChartData);
  const interp       = INTERP[rc] ?? '';

  const macro = cis.components?.macro?.score ?? 0;
  const jse   = cis.components?.jse?.score   ?? 0;
  const conf  = cis.components?.conf?.score  ?? 0;

  const playbookData = PLAYBOOK[rc] ?? PLAYBOOK.neutral;
  const topDrivers = (cis.drivers || []).slice(0, 5);
  const visibleDrivers = topDrivers.slice(0, 3);
  const coverage = dataHealth?.quoteCoverage ?? 0;
  const confidence = coverage >= 90 ? 'High' : coverage >= 70 ? 'Moderate' : 'Low';
  const changeSummary = trend
    ? trend.dir === 'flat'
      ? 'Broadly unchanged across latest readings'
      : `${Math.abs(trend.delta)} pts ${trend.dir === 'down' ? 'deeper shock' : 'relief recovery'} in recent readings`
    : 'Initial reading in current window';

  const toneVar = rc === 'bear' ? 'var(--color-bear)' : rc === 'warn' ? 'var(--color-warn)' : rc === 'bull' ? 'var(--color-bull)' : 'var(--color-ts)';

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

    const seen = new Set();
    return mapped.filter(ev => {
      if (seen.has(ev.xValue)) return false;
      seen.add(ev.xValue);
      return true;
    });
  }, [cisChartData]);

  if (!hasData) {
    return (
      <div className="glass rounded-[16px] p-6 sm:p-8 relative overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-ts" />
          <div className="text-[11px] font-medium font-mono text-tm tracking-[0.1em] uppercase">Conflict Impact Score</div>
        </div>
        <div className="font-serif text-[72px] sm:text-[92px] text-tx leading-[0.9] tracking-[-0.04em] mt-3">—</div>
        <div className="text-[13.5px] text-tm leading-relaxed mt-3 max-w-md">
          Fetch live market telemetry to compute the Conflict Impact Score and quantify cross-asset transmission channels.
        </div>
      </div>
    );
  }

  const COMPONENT_DETAILS = [
    { key: 'macro', label: 'Macro Channel', wt: '40%', score: macro, contrib: cis.components?.macro?.contrib ?? 0 },
    { key: 'jse',   label: 'JSE Watchlist', wt: '35%', score: jse,   contrib: cis.components?.jse?.contrib ?? 0 },
    { key: 'conf',  label: 'Signals & FX',  wt: '25%', score: conf,  contrib: cis.components?.conf?.contrib ?? 0 },
  ];

  return (
    <div className="glass rounded-[18px] p-5 sm:p-7 relative overflow-hidden">

      {/* Top accent line with soft glowing aura */}
      <div
        className="absolute top-0 inset-x-0 h-[2px] transition-all duration-700 pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${toneHex} 30%, ${toneHex} 70%, transparent 100%)`,
          opacity: 0.8
        }}
      />

      {/* Subtle ambient radial background glow */}
      <div
        className="absolute -top-20 -left-20 w-80 h-80 rounded-full pointer-events-none opacity-[0.12] transition-all duration-700 blur-3xl"
        style={{
          background: `radial-gradient(circle, ${toneHex} 0%, transparent 70%)`
        }}
      />

      {/* Header Bar: Telemetry Beacon + Status */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div className="flex items-center gap-2.5">
          {/* Live pulsing radar dot */}
          <span className="relative flex h-2.5 w-2.5">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ backgroundColor: toneHex }}
            />
            <span
              className="relative inline-flex rounded-full h-2.5 w-2.5"
              style={{ backgroundColor: toneHex }}
            />
          </span>
          <div className="text-[11px] font-mono font-semibold tracking-[0.12em] text-tm uppercase">
            Conflict Impact Score
          </div>
          <span className="hidden sm:inline-block font-mono text-[9.5px] text-tx tracking-wider uppercase">
            · Live Telemetry
          </span>
        </div>

        {/* Confidence & Coverage Badge (Subtle pill, no harsh white stroke) */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.07] text-[11px] text-ts self-start sm:self-auto font-mono">
          <span className={clsx('w-1.5 h-1.5 rounded-full', coverage >= 90 ? 'bg-bull' : coverage >= 70 ? 'bg-warn' : 'bg-bear')} />
          <span className="text-tp font-medium">{confidence} confidence</span>
          {coverage ? <span className="text-tm">· {coverage}% coverage</span> : null}
        </div>
      </div>

      {/* Hero Score + Regime Status */}
      <div className="relative z-10 flex flex-wrap items-end gap-x-6 gap-y-3 mt-3">
        <div
          className={clsx('font-serif leading-[0.88] tracking-[-0.04em] select-none', toneText)}
          style={{ fontSize: 'clamp(64px, 8vw, 96px)' }}
          key={`cis-${cis.total}`}
        >
          <CountUp to={cis.total} decimals={0} />
        </div>

        <div className="flex flex-col justify-end pb-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-tm">Regime Assessment</span>
            <span className={clsx('w-1 h-1 rounded-full', toneBg)} />
          </div>
          <div className={clsx('font-serif italic text-[26px] sm:text-[32px] leading-none tracking-[-0.01em]', toneText)}>
            {cis.regime.toLowerCase()}
          </div>
          {trend && (
            <div className="mt-2.5 flex items-center gap-2">
              <div className={clsx(
                'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-mono text-[11px] font-semibold',
                trend.dir === 'down' ? 'bg-bear/10 text-bear border border-bear/20' :
                trend.dir === 'up' ? 'bg-bull/10 text-bull border border-bull/20' :
                'bg-white/[0.03] text-tm border border-white/[0.06]'
              )}>
                <span>{trend.dir === 'down' ? '↓' : trend.dir === 'up' ? '↑' : '→'}</span>
                <span>{Math.abs(trend.delta)} pts</span>
              </div>
              <span className="text-tm text-[11px] font-mono">5-reading shift</span>
            </div>
          )}
        </div>
      </div>

      {/* Executive Briefing: Editorial left-accent without harsh 4-sided wireframe box */}
      <div
        className="relative z-10 mt-4 pl-3.5 border-l-2 transition-colors py-0.5"
        style={{ borderLeftColor: toneHex }}
      >
        <p className="text-[13px] sm:text-[13.5px] text-tp/90 leading-relaxed font-sans">
          {interp}
        </p>
      </div>

      {/* Telemetry Briefing: Soft surface cards with whisper-level borders */}
      <div className="relative z-10 mt-5 grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-3">
        {/* What changed */}
        <div className="rounded-xl bg-white/[0.025] border border-white/[0.06] p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10.5px] font-mono font-semibold uppercase tracking-[0.08em] text-tm">What Changed</span>
            <span className="text-[9.5px] font-mono text-tx">momentum</span>
          </div>
          <div className="text-[12.5px] sm:text-[13px] text-tp leading-relaxed">
            {changeSummary}
          </div>
        </div>

        {/* Top drivers */}
        <div className="rounded-xl bg-white/[0.025] border border-white/[0.06] p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10.5px] font-mono font-semibold uppercase tracking-[0.08em] text-tm">Top Transmission Drivers</span>
            <span className="text-[9.5px] font-mono text-tx">{visibleDrivers.length} assets</span>
          </div>
          {visibleDrivers.length ? (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {visibleDrivers.map((driver, idx) => (
                <span
                  key={`${driver.bucket}-${driver.label}`}
                  className="inline-flex items-center gap-1.5 sm:gap-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] px-2.5 py-1 text-[11.5px] sm:text-[12px] text-ts transition-colors"
                >
                  <span className="text-tm font-mono text-[9.5px]">#{idx + 1}</span>
                  <span className="text-tp font-medium">{driver.label}</span>
                  <span className={clsx(
                    'font-mono text-[11px] font-bold',
                    driver.weightedImpact >= 0 ? 'text-bull' : 'text-bear'
                  )}>
                    {driver.weightedImpact > 0 ? '+' : ''}{driver.weightedImpact}
                  </span>
                </span>
              ))}
            </div>
          ) : (
            <div className="text-[12.5px] text-tm mt-1 font-mono">No material drivers in this reading.</div>
          )}
        </div>
      </div>

      {/* Bipolar Spectrum Meter: Panoramic dial sitting directly on surface, NO heavy bounding box */}
      <div className="relative z-10 mt-6 pt-4 border-t border-white/[0.06]">
        <div className="flex justify-between items-center text-[10.5px] font-mono text-tm uppercase tracking-[0.08em] mb-2">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: toneHex }} />
            Bipolar Risk Gauge
          </span>
          <span className="text-tp font-medium font-mono">
            Index: <span className={toneText}>{cis.total > 0 ? `+${cis.total}` : cis.total}</span> / ±100
          </span>
        </div>

        {/* Gauge Track */}
        <div className="relative pt-6 pb-1">
          <div
            className="relative h-[8px] rounded-full overflow-visible border border-white/[0.08] shadow-inner"
            style={{
              background: 'linear-gradient(90deg, rgba(249,112,112,0.22) 0%, rgba(249,112,112,0.06) 38%, rgba(255,255,255,0.04) 50%, rgba(52,211,153,0.06) 62%, rgba(52,211,153,0.22) 100%)'
            }}
          >
            {/* Center Neutral Anchor (0) */}
            <div className="absolute left-1/2 top-[-4px] -translate-x-1/2 w-[2px] h-[16px] bg-white/40 z-10 rounded-full" />

            {/* Active Deflection Beam from Center */}
            <div
              className={clsx('absolute top-0 h-full rounded-full transition-all duration-300', toneBg)}
              style={{
                left: `${fillLeft}%`,
                width: `${fillWidth}%`,
                opacity: 0.85,
                boxShadow: `0 0 8px ${toneHex}80`
              }}
            />

            {/* Score Thumb Needle with Floating Badge */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 transition-all duration-300 pointer-events-none"
              style={{ left: `${pct}%` }}
            >
              {/* Floating pill badge */}
              <div
                className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold border shadow-md whitespace-nowrap bg-[#09090b]/90 backdrop-blur-md"
                style={{
                  borderColor: `${toneHex}60`,
                  color: toneHex,
                  boxShadow: `0 0 8px ${toneHex}25`
                }}
              >
                {cis.total > 0 ? `+${cis.total}` : cis.total}
              </div>

              {/* Glowing circular thumb bead */}
              <div
                className="w-[16px] h-[16px] rounded-full bg-[#09090b] flex items-center justify-center transition-transform hover:scale-110"
                style={{
                  border: `3px solid ${toneHex}`,
                  boxShadow: `0 0 10px ${toneHex}`
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: toneHex }} />
              </div>
            </div>
          </div>

          {/* Scale Markers and Zone Legend */}
          <div className="flex justify-between font-mono text-[10px] text-tm mt-2.5">
            <span className="text-bear/90 font-medium">-100 (Shock)</span>
            <span className="text-tm hidden sm:inline">-50</span>
            <span className="text-ts font-semibold">0 (Neutral)</span>
            <span className="text-tm hidden sm:inline">+50</span>
            <span className="text-bull/90 font-medium">+100 (Relief)</span>
          </div>
        </div>
      </div>

      {/* Expandable Toggle Button */}
      <div className="relative z-10 mt-5 pt-3 border-t border-white/[0.06] flex justify-center">
        <button
          type="button"
          onClick={() => setIsExpanded(e => !e)}
          className="flex items-center gap-2 min-h-9 px-4 py-1.5 text-[12px] font-medium text-ts hover:text-tp bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/[0.15] rounded-full transition-all cursor-pointer select-none"
        >
          <svg className={clsx("w-3.5 h-3.5 transition-transform duration-300", isExpanded ? "rotate-180" : "")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
          {isExpanded ? 'Hide analytical breakdown' : 'Explain this score & view playbook'}
        </button>
      </div>

      {/* Expanded Trajectory Chart, Component Math, and Playbook Tray */}
      {isExpanded && (
        <div className="relative z-10 mt-5 pt-5 border-t border-white/[0.06] grid grid-cols-1 lg:grid-cols-[1.65fr_1fr] gap-5 animate-fadeUp">
          <div className="lg:col-span-2 bg-white/[0.025] border border-white/[0.06] rounded-xl p-4 sm:p-5">
            <div className="font-semibold text-[13px] text-tp flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-warn" />
              How the Conflict Impact Score is calculated
            </div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ts max-w-[76ch]">{cis.methodology}</p>
            
            {/* Component Math Pillar Cards inside the Drawer */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              {COMPONENT_DETAILS.map(({ key, label, wt, score, contrib }) => {
                const sClamped = Math.max(-100, Math.min(100, score ?? 0));
                const sLeft = sClamped < 0 ? 50 + (sClamped / 2) : 50;
                const sWidth = Math.abs(sClamped) / 2;
                const sColor = componentColor(score);
                const sBg = componentBg(score);

                return (
                  <div key={key} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center text-[11.5px] font-mono text-tm mb-1">
                        <span className="capitalize font-medium text-tp">{label}</span>
                        <span className="bg-white/[0.04] px-1.5 py-0.5 rounded text-[10px]">{wt} weight</span>
                      </div>
                      <div className="flex items-baseline justify-between mt-1.5">
                        <div className={clsx('font-mono text-[22px] font-bold', sColor)}>
                          {score > 0 ? '+' : ''}{score}
                        </div>
                        <div className="text-[11px] font-mono text-ts">
                          contrib <span className={clsx('font-semibold', contrib >= 0 ? 'text-bull' : 'text-bear')}>{contrib > 0 ? '+' : ''}{contrib}</span>
                        </div>
                      </div>
                      <div className="text-[11px] text-ts mt-0.5 flex items-center gap-1.5">
                        <span className={clsx('w-1.5 h-1.5 rounded-full', sBg)} />
                        <span>{componentLabel(score)}</span>
                      </div>
                    </div>

                    {/* Mini Bipolar Deflection Bar */}
                    <div className="mt-3 pt-2 border-t border-white/[0.06]">
                      <div className="relative h-[4px] bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="absolute left-1/2 top-0 w-px h-full bg-white/20 z-10" />
                        <div
                          className={clsx('absolute top-0 h-full rounded-full transition-all duration-300', sBg)}
                          style={{ left: `${sLeft}%`, width: `${sWidth}%`, opacity: 0.9 }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] font-mono text-tx mt-1">
                        <span>-100</span>
                        <span>0</span>
                        <span>+100</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-white/[0.06]">
              <div className="text-[11.5px] font-mono uppercase tracking-wider text-tm">All Current Transmission Drivers</div>
              {topDrivers.length ? (
                <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {topDrivers.map(driver => (
                    <li key={`${driver.bucket}-${driver.label}`} className="flex items-start justify-between gap-3 text-[12px] border-b border-white/[0.04] pb-2">
                      <span><span className="text-tp font-medium">{driver.label}</span><span className="text-tm">: {driver.reason}</span></span>
                      <span className={clsx('font-mono flex-shrink-0 font-semibold', driver.weightedImpact >= 0 ? 'text-bull' : 'text-bear')}>
                        {driver.weightedImpact > 0 ? '+' : ''}{driver.weightedImpact}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : <div className="mt-2 text-[12px] text-tm font-mono">No non-zero drivers in the current reading.</div>}
            </div>
          </div>
          
          {/* Left: Historical CIS Area Chart */}
          <div className="flex flex-col">
            <div className="text-[11.5px] font-mono font-semibold text-ts mb-2.5 tracking-[0.08em] uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-ts" />
              CIS Historical Trajectory
            </div>
            {(!cisChartData || cisChartData.length === 0) ? (
              <div className="h-[180px] flex items-center justify-center bg-white/[0.02] rounded-xl border border-white/[0.06] text-tm text-[12px] font-mono">
                No history points logged yet. Trigger active refreshes.
              </div>
            ) : (
              <Suspense fallback={<div className="h-[180px] rounded-xl bg-white/[0.02] animate-pulse" />}>
                <RegimeHistoryChart data={cisChartData} events={visibleEvents} toneVar={toneVar} toneHex={toneHex} />
              </Suspense>
            )}
          </div>

          {/* Right: Portfolio Hedging Playbook */}
          <div className="flex flex-col bg-white/[0.025] rounded-xl border border-white/[0.06] p-4 sm:p-5 justify-between">
            <div>
              <div className="text-[11.5px] font-mono font-semibold text-ts mb-2 tracking-[0.08em] uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: toneHex }} />
                Tactical Playbook
              </div>
              <div className={clsx("font-serif text-[17px] italic leading-tight mb-3", toneText)}>
                {playbookData.title}
              </div>
              <ul className="flex flex-col gap-2.5">
                {playbookData.points.map((pt, idx) => (
                  <li key={idx} className="flex gap-2.5 items-start text-[12px] text-ts leading-normal font-sans">
                    <span className={clsx("w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5", toneBg)} />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="font-mono text-[10.5px] text-tm mt-4 pt-2.5 border-t border-white/[0.06]">
              Allocations dynamically calibrate with live CIS shifts.
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
