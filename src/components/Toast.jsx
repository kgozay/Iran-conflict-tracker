import React from 'react';
import clsx from 'clsx';

const TYPE = {
  success: { icon: '✓', cls: 'border-bull/40 bg-bull/10 text-bull'  },
  error:   { icon: '✕', cls: 'border-bear/40 bg-bear/10 text-bear'  },
  warn:    { icon: '⚠', cls: 'border-warn/40 bg-warn/10 text-warn'  },
  info:    { icon: '↻', cls: 'border-bd bg-bg-s text-ts'             },
};

export default function Toast({ toasts, onRemove }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[300] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => {
        const cfg = TYPE[t.type] ?? TYPE.info;
        return (
          <div
            key={t.id}
            onClick={() => onRemove(t.id)}
            className={clsx(
              'flex items-center gap-2.5 px-4 py-2.5 rounded border font-mono text-[10px]',
              'animate-fadeUp shadow-xl pointer-events-auto cursor-pointer',
              cfg.cls,
            )}
          >
            <span className="text-[12px]">{cfg.icon}</span>
            <span>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
