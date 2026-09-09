import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, ReferenceArea, ReferenceLine, Label, Tooltip, ResponsiveContainer,
} from 'recharts';

export default function RegimeHistoryChart({ data, events, toneVar, toneHex }) {
  return (
    <div className="h-[180px] w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 8, left: -25, bottom: 0 }}>
          <defs>
            <linearGradient id="cisGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={toneVar.includes('var') ? toneHex : toneVar} stopOpacity={0.25} />
              <stop offset="95%" stopColor={toneVar.includes('var') ? toneHex : toneVar} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fill: 'var(--color-tm)', fontSize: 9, fontFamily: 'monospace' }} />
          <YAxis domain={[-100, 100]} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-tm)', fontSize: 9, fontFamily: 'monospace' }} />
          <ReferenceArea y1={-100} y2={-40} fill="rgba(249, 112, 112, 0.08)" ifOverflow="hidden" />
          <ReferenceArea y1={-40} y2={-15} fill="rgba(232, 176, 74, 0.08)" ifOverflow="hidden" />
          <ReferenceArea y1={-15} y2={15} fill="rgba(113, 113, 122, 0.05)" ifOverflow="hidden" />
          <ReferenceArea y1={15} y2={40} fill="rgba(52, 211, 153, 0.06)" ifOverflow="hidden" />
          <ReferenceArea y1={40} y2={100} fill="rgba(52, 211, 153, 0.12)" ifOverflow="hidden" />
          {events.map((event, index) => (
            <ReferenceLine key={`${event.xValue}-${index}`} x={event.xValue} stroke={event.type === 'escalation' ? 'var(--color-bear)' : 'var(--color-bull)'} strokeDasharray="3 3" strokeWidth={1}>
              <Label value={event.label} position="top" fill="var(--color-ts)" fontSize={8} fontFamily="monospace" offset={4} />
            </ReferenceLine>
          ))}
          <Tooltip contentStyle={{ background: 'var(--color-bg-c)', border: '1px solid var(--color-bd)', borderRadius: 8, fontFamily: 'monospace', fontSize: 11, color: 'var(--color-tp)' }} labelFormatter={label => `Time: ${label}`} />
          <Area type="monotone" dataKey="total" stroke={toneVar} strokeWidth={1.5} fillOpacity={1} fill="url(#cisGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
