import React from 'react';
import clsx from 'clsx';
import { AlertIcon, BoltIcon, ChartIcon, DotIcon } from '../components/Icons.jsx';

// All class names written as complete static strings so Tailwind includes them
const CFG = {
  bear:    { border: 'border-bear', textBig: 'text-bear', bg: 'bg-bear-d', Icon: AlertIcon },
  warn:    { border: 'border-warn', textBig: 'text-warn', bg: 'bg-warn-d', Icon: BoltIcon  },
  neutral: { border: 'border-ts',   textBig: 'text-ts',   bg: 'bg-bg-e',   Icon: ChartIcon },
  bull:    { border: 'border-bull', textBig: 'text-bull', bg: 'bg-bull-d', Icon: DotIcon   },
};

export default function RegimeBanner({ cis, hasData }) {
  const c = CFG[cis.regimeClass] ?? CFG.neutral;
  const Icon = c.Icon;

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

  const interp = {
    bear:    'Elevated macro shock. Oil & FX transmission channels active. Domestic stress signals triggered.',
    warn:    'Moderate conflict pricing. Selective sector rotation underway. Watch USD/ZAR and Brent.',
    neutral: 'Conflict impact contained. Markets pricing limited SA transmission.',
    bull:    'De-escalation relief evident. Risk-on rotation favoring JSE broadly.',
  }[cis.regimeClass] ?? '';

  return (
    <div className={clsx('relative flex items-center gap-5 border rounded p-4 mb-3.5 overflow-hidden', c.border, c.bg)}>
      {/* Animated scan line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-warn to-transparent animate-scan" />

      <div className={clsx('w-11 h-11 rounded border flex items-center justify-center flex-shrink-0 bg-black/20', c.border, c.textBig)}>
        <Icon className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className={clsx('font-display text-[28px] tracking-[3px] leading-none', c.textBig)}>{cis.regime}</div>
        <div className="font-mono text-[10px] text-ts mt-1">
          Iran–Israel escalation · IRGC activity near Hormuz · OPEC+ monitoring
        </div>
      </div>

      <div className="text-center px-5 border-x border-bd flex-shrink-0">
        <div className="font-mono text-[8px] tracking-[2px] text-ts mb-1">CONFLICT IMPACT SCORE</div>
        <div className={clsx('font-display text-[52px] leading-none tracking-[2px]', c.textBig)}>{cis.total}</div>
        <div className="font-mono text-[9px] text-tm">/ ±100 scale</div>
      </div>

      <div className="font-mono text-[10px] text-ts leading-relaxed max-w-[210px]">{interp}</div>
    </div>
  );
}
