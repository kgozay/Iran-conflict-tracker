import React from 'react';
import clsx from 'clsx';
import { SpotlightCard } from './Effects.jsx';

/* ── PATCH SUMMARY ─────────────────────────────────────────────────────
 * - `<Card>` now wraps its body in <SpotlightCard> (FX5) so every panel on
 *   Macro Transmission and Sector Drilldown that uses Card (Historical
 *   analogues, Alert status, Constituent performance, Sector read, etc.)
 *   picks up the cursor halo with one change.
 * - Opt out per call site by passing `spotlight={false}` if a particular
 *   card shouldn't react (e.g. cards containing tables).
 * - `CardHeader` and `Divider` are unchanged.
 * ──────────────────────────────────────────────────────────────────── */

export function Card({ children, className, style, spotlight = true, spotlightColor }) {
  const cls = clsx('glass rounded-[16px] p-[24px_28px]', className);
  if (!spotlight) {
    return <div className={cls} style={style}>{children}</div>;
  }
  return (
    <SpotlightCard
      className={cls}
      style={style}
      spotlightColor={spotlightColor /* falls back to gold inside SpotlightCard */}
    >
      {children}
    </SpotlightCard>
  );
}

export function CardHeader({ title, italic, kicker, right, badge, badgeVariant = 'neutral' }) {
  const badgeCls = {
    live:    'bg-bull/8 text-bull border-bull/30',
    warn:    'bg-warn/8 text-warn border-warn/30',
    bear:    'bg-bear/8 text-bear border-bear/30',
    neutral: 'bg-bg-e text-ts border-bd',
  };
  return (
    <div className="flex items-baseline justify-between mb-[18px]">
      <div>
        {kicker && (
          <div className="text-[11px] font-medium text-tm tracking-[0.08em] uppercase mb-1.5">{kicker}</div>
        )}
        {title && (
          <div className="font-serif text-[22px] text-tp leading-[1.1]">
            {title}
            {italic && <> <span className="italic text-warn">{italic}</span></>}
          </div>
        )}
      </div>
      {right ?? (badge && (
        <span className={clsx('font-mono text-[9px] px-[7px] py-[2px] rounded border tracking-[0.04em]', badgeCls[badgeVariant])}>
          {badge}
        </span>
      ))}
    </div>
  );
}

export function Divider() {
  return <div className="h-px bg-bd my-4" />;
}
