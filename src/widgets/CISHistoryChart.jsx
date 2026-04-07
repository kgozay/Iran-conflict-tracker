import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import clsx from 'clsx';
import { Card, CardHeader } from './Card.jsx';

const REGIME_COLOR = {
  bear:    '#ef4444',
  warn:    '#f0b429',
  neutral: '#6e80a0',
  bull:    '#05d09a',
};

const Tip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const color = REGIME_COLOR[d.regimeClass] ?? '#6e80a0';
  return (
    <div className="bg-bg-s border border-bd rounded px-3 py-2 font-mono text-[10px]">
      <div className="text-ts mb-1">{d.date} · {d.time}</div>
      <div className="font-semibold" style={{ color }}>{d.regime}</div>
      <div className="text-tp text-[13px] font-semibold mt-0.5">{d.total > 0 ? '+' : ''}{d.total}</div>
    </div>
  );
};

export default function CISHistoryChart({ chartData, onClear }) {
  if (chartData.length < 2) {
    return (
      <Card>
        <CardHeader title="Conflict Impact Score — Session History" badge="BUILDING" badgeVariant="warn" />
        <div className="flex items-center justify-center h-28 font-mono text-[10px] text-tm text-center">
          History builds automatically after each data fetch.<br />
          Stored locally in your browser — persists across page reloads.
        </div>
      </Card>
    );
  }

  const latest = chartData[chartData.length - 1];
  const first  = chartData[0];
  const trend  = latest.total - first.total;
  const trendColor = trend > 0 ? 'text-bull' : trend < 0 ? 'text-bear' : 'text-ts';

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[9px] font-semibold tracking-[2px] text-ts uppercase">
          Conflict Impact Score — Session History
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[8px] text-ts border border-bd bg-bg-e px-1.5 py-0.5 rounded-sm">
            {chartData.length} READINGS
          </span>
          <span className={clsx('font-mono text-[9px] font-semibold', trendColor)}>
            {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {trend > 0 ? '+' : ''}{trend} pts session
          </span>
          <button onClick={onClear}
            className="font-mono text-[8px] text-tm hover:text-bear px-1.5 py-0.5 border border-bd rounded cursor-pointer transition-colors">
            CLEAR
          </button>
        </div>
      </div>

      <div style={{ height: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top:4, right:8, bottom:0, left:-20 }}>
            <CartesianGrid stroke="rgba(30,45,69,0.6)" strokeDasharray="3 3" />
            <XAxis dataKey="time"
              tick={{ fontFamily:'IBM Plex Mono', fontSize:8, fill:'#3d4f68' }}
              axisLine={false} tickLine={false}
              interval={Math.max(1, Math.floor(chartData.length / 6))}
            />
            <YAxis
              domain={[-100, 100]}
              tickFormatter={v => v}
              tick={{ fontFamily:'IBM Plex Mono', fontSize:8, fill:'#3d4f68' }}
              axisLine={false} tickLine={false}
            />
            <Tooltip content={<Tip />} cursor={{ stroke:'rgba(255,255,255,0.08)' }} />
            <ReferenceLine y={0}  stroke="rgba(255,255,255,0.15)" />
            <ReferenceLine y={-40} stroke="rgba(239,68,68,0.2)"  strokeDasharray="3 3" />
            <ReferenceLine y={40}  stroke="rgba(5,208,154,0.2)"  strokeDasharray="3 3" />
            <Line
              type="monotone" dataKey="total"
              stroke={REGIME_COLOR[latest.regimeClass] ?? '#6e80a0'}
              strokeWidth={2} dot={false} activeDot={{ r:3, fill:'#f0b429' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
