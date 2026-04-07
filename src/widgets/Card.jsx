import React from 'react';
import clsx from 'clsx';

export function Card({ children, className, style }) {
  return (
    <div className={clsx('bg-bg-c border border-bd rounded p-3.5', className)} style={style}>
      {children}
    </div>
  );
}

export function CardHeader({ title, badge, badgeVariant = 'neutral' }) {
  const variantCls = {
    live:    'bg-bull-faint text-bull border border-bull-faint',
    warn:    'bg-warn-faint text-warn border border-warn-faint',
    bear:    'bg-bear-faint text-bear border border-bear-faint',
    neutral: 'bg-bg-e text-ts border border-bd',
  };
  return (
    <div className="flex items-center justify-between mb-3">
      <span className="font-mono text-[9px] font-semibold tracking-[2px] text-ts uppercase">{title}</span>
      {badge && (
        <span className={clsx('font-mono text-[8px] px-1.5 py-0.5 rounded-sm tracking-[1px]', variantCls[badgeVariant])}>
          {badge}
        </span>
      )}
    </div>
  );
}

export function Divider() {
  return <div className="h-px bg-bd-x my-3" />;
}
