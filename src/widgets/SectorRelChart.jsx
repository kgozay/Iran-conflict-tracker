import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardHeader } from './Card.jsx';

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div className="bg-bg-s border border-bd rounded px-3 py-2">
      <div className="font-mono text-[10px] text-ts mb-1">{label}</div>
      <div className={`font-mono text-[13px] font-semibold ${v >= 0 ? 'text-bull' : 'text-bear'}`}>
        {v >= 0 ? '+' : ''}{v?.toFixed(2)}% vs Top 40
      </div>
    </div>
  );
};

export default function SectorRelChart({ sectors, hasData }) {
  const data = Object.values(sectors)
    .filter(s => s.name !== 'JSE Top 40' && s.rel != null)
    .sort((a, b) => b.rel - a.rel)
    .map(s => ({ name: s.name, rel: s.rel }));

  return (
    <Card className="h-full">
      <CardHeader title="Sector Relative Performance vs JSE Top 40" badge="LIVE" badgeVariant="live" />
      {!hasData || data.length === 0 ? (
        <div className="flex items-center justify-center h-[215px] font-mono text-[10px] text-tm">
          Fetch live data to see sector performance
        </div>
      ) : (
        <div style={{ height: 215 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 4 }}>
              <CartesianGrid horizontal={false} stroke="rgba(30,45,69,0.8)" />
              <XAxis type="number" tickFormatter={v => `${v > 0 ? '+' : ''}${v}%`}
                tick={{ fontFamily: 'IBM Plex Mono', fontSize: 9, fill: '#6e80a0' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={90}
                tick={{ fontFamily: 'IBM Plex Mono', fontSize: 9, fill: '#6e80a0' }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <ReferenceLine x={0} stroke="rgba(255,255,255,0.15)" />
              <Bar dataKey="rel" radius={[0, 3, 3, 0]} maxBarSize={20}>
                {data.map((e, i) => (
                  <Cell key={i}
                    fill={e.rel >= 0 ? 'rgba(5,208,154,0.7)' : 'rgba(239,68,68,0.7)'}
                    stroke={e.rel >= 0 ? '#05d09a' : '#ef4444'}
                    strokeWidth={1} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
