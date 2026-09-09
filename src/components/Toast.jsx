import React from 'react';
import clsx from 'clsx';
import { CheckIcon, ErrorIcon, AlertIcon, RefreshIcon } from './Icons.jsx';

const TYPE = {
  success: { Icon: CheckIcon,   cls: 'border-bull/40 bg-bull/10 text-bull' },
  error:   { Icon: ErrorIcon,   cls: 'border-bear/40 bg-bear/10 text-bear' },
  warn:    { Icon: AlertIcon,   cls: 'border-warn/40 bg-warn/10 text-warn' },
  info:    { Icon: RefreshIcon, cls: 'border-bd bg-bg-s text-ts'            },
};

export default function Toast({ toasts, onRemove }) {
  if (!toasts.length) return null;
  return (
    <div aria-live="polite" aria-relevant="additions removals" className="fixed bottom-5 right-5 z-[300] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => {
        const cfg  = TYPE[t.type] ?? TYPE.info;
        const Icon = cfg.Icon;
        return (
          <button
            type="button"
            key={t.id}
            onClick={() => onRemove(t.id)}
            aria-label={`${t.message}. Dismiss notification`}
            className={clsx(
              'min-h-11 flex items-center gap-2.5 px-4 py-2.5 rounded border font-mono text-[11px] text-left',
              'animate-fadeUp shadow-xl pointer-events-auto cursor-pointer',
              cfg.cls,
            )}
          >
            <Icon className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{t.message}</span>
          </button>
        );
      })}
    </div>
  );
}
