import React from 'react';
import clsx from 'clsx';
import { AlertIcon, BoltIcon, ChartIcon, DotIcon } from '../components/Icons.jsx';

const CFG = {
  bear:    { border: 'border-bear', textBig: 'text-bear', bg: 'bg-bear-d', chip: 'bg-bear/10 border-bear/30 text-bear', Icon: AlertIcon },
  warn:    { border: 'border-warn', textBig: 'text-warn', bg: 'bg-warn-d', chip: 'bg-warn/10 border-warn/30 text-warn', Icon: BoltIcon  },
  neutral: { border: 'border-ts',   textBig: 'text-ts',   bg: 'bg-bg-e',   chip: 'bg-bg-e border-bd text-ts',       Icon: ChartIcon },
  bull:    { border: 'border-bull', textBig: 'text-bull', bg: 'bg-bull-d', chip: 'bg-bull/10 border-bull/30 text-bull', Icon: DotIcon   },
};

function componentTone(score) {
  if (score <= -35) return { label: 'High pressure', cls: 'bg-bear/10 border-bear/30 text-bear' };
  if (score <= -12) return { label: 'Moderate pressure', cls: 'bg-warn/10 border-warn/30 text-warn' };
  if (score >= 35) return { label: 'Strong offset', cls: 'bg-bull/10 border-bull/30 text-bull' };
  if (score >= 12) return { label: 'Mild offset', cls: 'bg-bull/8 border-bull/25 text-bull' };
  return { label: 'Contained', cls: 'bg-bg-e border-bd text-ts' };
}

function Pill({ label, value, tone }) {
  return (
    <div className={clsx('rounded border px-2.5 py-1', tone.cls)}>
      <div className="font-mono text-[7px] tracking-[1.5px] opacity-70 uppercase">{label}</div>
      <div className="font-mono text-[9px] font-semibold mt-0.5 whitespace-nowrap">{value}</div>
    </div>
  );
}

function computeTrend(data) {
  if (!data || data.length < 2) return null;
  const recent = data.slice(-5);
  const last = recent[recent.length - 1].total;
  const first = recent[0].total;
  const delta = +(last - first).toFixed(1);
  if (Math.abs(delta) < 1) return { dir: 'flat', delta: 0 };
  return { dir: delta > 0 ? 'up' : 'down', delta };
}

export default function RegimeBanner({ cis, hasData, dataHealth, cisChartData }) {
  const c = CFG[cis.regimeClass] ?? CFG.neutral;
  const Icon = c.Icon;
  const trend = computeTrend(cisChartData);

  if (!hasData) {
    return (
      <div className="flex items-center gap-4 border border-bd rounded p-4 mb-3.5 bg-bg-s">
        <div className="w-11 h-11 rounded border border-bd flex items-center justify-center text-ts">
          <ChartIcon className="w-5 h-5" />
        </div>
        <div>
          <div className="font-display text-[22px] tracking-[3px] text-ts">AWAITING LIVE DATA</div>
          <div className="font-mono text-[10px] text-tm mt-1">Click FETCH LIVE in the top bar to load real-time market data.</div>
        </div>
        <div className="ml-auto text-center px-5 border-l border-bd">
          <div className="font-mono text-[8px] tracking-[2px] text-tm mb-1">CONFLICT IMPACT SCORE</div>
          <div className="font-display text-[48px] leading-none text-tm">—</div>
          <div className="font-mono text-[9px] text-tm">/ ±100 scale</div>
        </div>
      </div>
    );
  }

  const macro = componentTone(cis.components?.macro?.score ?? 0);
  const jse = componentTone(cis.components?.jse?.score ?? 0);
  const conf = componentTone(cis.components?.conf?.score ?? 0);
  const confidence = dataHealth?.quoteCoverage >= 95 && !dataHealth?.bondIsStatic ? 'High' : dataHealth?.quoteCoverage >= 85 ? 'Moderate' : 'Low';

  const interp = {
    bear:    'Oil, FX, rates and/or domestic equity breadth are transmitting conflict risk into SA assets.',
    warn:    'Conflict pricing is present but not decisive; rotation and confirmation signals matter more than the headline score.',
    neutral: 'Current market action is not confirming a major SA transmission channel. Monitor for a break in oil or USD/ZAR.',
    bull:    'Risk relief or commodity offsets are dominating. Check whether domestic cyclicals are also participating.',
  }[cis.regimeClass] ?? '';

  return (
    <div className={clsx('relative border rounded p-4 mb-3.5 overflow-hidden', c.border, c.bg)}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-warn to-transparent animate-scan" />

      {/* Score panel — shown first on mobile */}
      <div className="flex items-center justify-between lg:hidden mb-3">
        <div>
          <div className="font-mono text-[8px] tracking-[2px] text-ts">CONFLICT IMPACT SCORE</div>
          <div className={clsx('font-display text-[52px] leading-none tracking-[2px]', c.textBig)}>{cis.total}</div>
          <div className={clsx('font-mono text-[8px] px-1.5 py-0.5 rounded border inline-block mt-1', c.chip)}>{cis.regime}</div>
          {trend && (
            <div className="mt-1 flex items-center gap-1 font-mono text-[9px]">
              <span className={trend.dir === 'up' ? 'text-bull' : trend.dir === 'down' ? 'text-bear' : 'text-ts'}>
                {trend.dir === 'up' ? '↑' : trend.dir === 'down' ? '↓' : '→'}{trend.dir !== 'flat' && ` ${trend.delta > 0 ? '+' : ''}${trend.delta}`}
              </span>
              <span className="text-tm text-[8px]">trend</span>
            </div>
          )}
        </div>
        <div className={clsx('w-12 h-12 rounded border flex items-center justify-center flex-shrink-0 bg-black/20', c.border, c.textBig)}>
          <Icon className="w-6 h-6" />
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden lg:grid lg:grid-cols-[auto_1fr_auto] gap-5 items-center">
        <div className={clsx('w-14 h-14 rounded border flex items-center justify-center flex-shrink-0 bg-black/20', c.border, c.textBig)}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <div className="font-mono text-[8px] tracking-[2px] text-ts uppercase mb-1">Conflict regime</div>
          <div className={clsx('font-display text-[38px] tracking-[3px] leading-none', c.textBig)}>{cis.regime}</div>
          <div className="font-mono text-[10px] text-ts mt-2 max-w-3xl leading-relaxed">{interp}</div>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Pill label="Macro pressure" value={macro.label} tone={macro} />
            <Pill label="JSE breadth" value={jse.label} tone={jse} />
            <Pill label="Signal confirmation" value={conf.label} tone={conf} />
            <Pill label="Data confidence" value={confidence} tone={{ cls: confidence === 'High' ? 'bg-bull/8 border-bull/25 text-bull' : confidence === 'Moderate' ? 'bg-warn/8 border-warn/25 text-warn' : 'bg-bear/8 border-bear/25 text-bear' }} />
          </div>
        </div>
        <div className="text-center min-w-[150px] px-5 border-l border-bd">
          <div className="font-mono text-[8px] tracking-[2px] text-ts mb-1">CONFLICT IMPACT SCORE</div>
          <div className={clsx('font-display text-[68px] leading-none tracking-[2px]', c.textBig)}>{cis.total}</div>
          <div className="font-mono text-[9px] text-tm">/ ±100 heuristic scale</div>
          <div className={clsx('font-mono text-[8px] mt-2 px-1.5 py-0.5 rounded border inline-block', c.chip)}>{cis.regime}</div>
          {trend && (
            <div className="mt-1.5 flex items-center justify-center gap-1 font-mono text-[9px]">
              <span className={trend.dir === 'up' ? 'text-bull' : trend.dir === 'down' ? 'text-bear' : 'text-ts'}>
                {trend.dir === 'up' ? '↑' : trend.dir === 'down' ? '↓' : '→'}{trend.dir !== 'flat' && ` ${trend.delta > 0 ? '+' : ''}${trend.delta}`}
              </span>
              <span className="text-tm text-[8px]">5-reading trend</span>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: regime text + pills */}
      <div className="lg:hidden">
        <div className="font-mono text-[8px] tracking-[2px] text-ts uppercase mb-0.5">Conflict regime</div>
        <div className={clsx('font-display text-[28px] tracking-[2px] leading-none', c.textBig)}>{cis.regime}</div>
        <div className="font-mono text-[9px] text-ts mt-2 leading-relaxed">{interp}</div>
        <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
          <Pill label="Macro" value={macro.label} tone={macro} />
          <Pill label="JSE" value={jse.label} tone={jse} />
          <Pill label="Signal" value={conf.label} tone={conf} />
          <Pill label="Data" value={confidence} tone={{ cls: confidence === 'High' ? 'bg-bull/8 border-bull/25 text-bull' : confidence === 'Moderate' ? 'bg-warn/8 border-warn/25 text-warn' : 'bg-bear/8 border-bear/25 text-bear' }} />
        </div>
      </div>
    </div>
  );
}
