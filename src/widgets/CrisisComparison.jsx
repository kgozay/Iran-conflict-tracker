import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardHeader } from './Card.jsx';
import { UKRAINE_2022, ISRAEL_GAZA_2023 } from '../data/crisisReferences.js';

export default function CrisisComparison({ cisChartData }) {
  const data = useMemo(() => {
    // bin current history by week (7 days)
    // week 0 = earliest timestamp
    const weeks = {};
    if (cisChartData && cisChartData.length > 0) {
      const minTs = cisChartData[0].ts;
      const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
      cisChartData.forEach(h => {
        const w = Math.floor((h.ts - minTs) / MS_PER_WEEK);
        if (!weeks[w]) weeks[w] = [];
        weeks[w].push(h.total);
      });
    }

    const merged = [];
    for (let i = 0; i < 8; i++) {
      const currentAvg = weeks[i] ? weeks[i].reduce((s, v) => s + v, 0) / weeks[i].length : null;
      merged.push({
        week: `Week ${i}`,
        ukraine: UKRAINE_2022[i]?.cis,
        israelGaza: ISRAEL_GAZA_2023[i]?.cis,
        current: currentAvg,
      });
    }
    return merged;
  }, [cisChartData]);

  return (
    <Card>
      <CardHeader title="Crisis Trajectory Comparison" badge="ANALOGUES" />
      <div style={{ height: 230 }} className="mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
            <CartesianGrid stroke="rgba(30,45,69,0.8)" strokeDasharray="3 3" />
            <XAxis dataKey="week" tick={{ fontFamily:'IBM Plex Mono', fontSize:9, fill:'#6e80a0' }} axisLine={false} tickLine={false} />
            <YAxis domain={[-60, 20]} tick={{ fontFamily:'IBM Plex Mono', fontSize:9, fill:'#6e80a0' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e2d45', fontSize: '10px', fontFamily: 'IBM Plex Mono' }} />
            <Legend wrapperStyle={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'#6e80a0', paddingTop:4 }} />
            <Line type="monotone" dataKey="ukraine" name="Ukraine 2022" stroke="#64748b" strokeWidth={2} strokeDasharray="4 4" dot={false} />
            <Line type="monotone" dataKey="israelGaza" name="Israel-Gaza 2023" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" dot={false} />
            <Line type="monotone" dataKey="current" name="Current Trajectory" stroke="#05d09a" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
