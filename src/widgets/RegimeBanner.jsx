import React from 'react';
import clsx from 'clsx';
import { CountUp, DecryptedText } from './Effects.jsx';

/* ── PATCH SUMMARY ─────────────────────────────────────────────────────
 * - Hero CIS score uses <CountUp> (FX1) — spring-counts to the value.
 * - Regime label uses <DecryptedText> (FX3) — scramble → reveal loop.
 *   Pass `loop={false}` if you'd rather the effect runs once on mount.
 * - Each composition cell number (Macro / JSE / Signals) also uses CountUp.
 * - Interpretation paragraph adds the `mag-dropcap` class (magazine drop-cap
 *   on the first letter — V4 cover touch, very light).
 * ──────────────────────────────────────────────────────────────────── */

const TONE_TEXT = { bear: 'text-bear', warn: 'text-warn', bull: 'text-bull', neutral: 'text-ts' };
const TONE_BG   = { bear: 'bg-bear',  warn: 'bg-warn',   bull: 'bg-bull',   neutral: 'bg-ts'   };
const TONE_HEX  = { bear: '#f97070',  warn: '#e8b04a',   bull: '#34d399',   neutral: '#a39d8d' };

const INTERP = {
  bear:    'Oil, FX, rates and/or domestic equity breadth are transmitting conflict risk into SA assets.',
  warn:    'Conflict pricing is present but not decisive; rotation and confirmation signals matter more than the headline score.',
  neutral: 'Current market action is not confirming a major SA transmission channel. Monitor for a break in oil or USD/ZAR.',
  bull:    'Risk relief or commodity offsets are dominating. Check whether domestic cyclicals are also participating.',
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
          {/* FX3 DecryptedText — scramble → reveal, then loops */}
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
    </div>
  );
}
