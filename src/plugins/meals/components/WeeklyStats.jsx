import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { format, subDays, parseISO } from 'date-fns';
import { useMealStore } from '../mealStore';

const MACROS = [
  { key: 'calories', label: 'Calories', unit: 'kcal', color: '#f59e0b', goalKey: 'calories'  },
  { key: 'protein',  label: 'Protein',  unit: 'g',    color: '#3b82f6', goalKey: 'protein_g' },
  { key: 'carbs',    label: 'Carbs',    unit: 'g',    color: '#22c55e', goalKey: 'carbs_g'   },
  { key: 'fat',      label: 'Fat',      unit: 'g',    color: '#a855f7', goalKey: 'fat_g'     },
];

const CustomTooltip = ({ active, payload, label, unit }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-navy-800 border border-white/10 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-[10px] text-slate-400 mb-1">{label}</p>
      <p className="text-sm font-bold text-white">{payload[0].value} <span className="text-xs text-slate-400">{unit}</span></p>
    </div>
  );
};

export default function WeeklyStats() {
  const { weekStats, goals } = useMealStore();

  // Build a full 7-day array, filling zeros for days with no data
  const last7 = Array.from({ length: 7 }, (_, i) =>
    format(subDays(new Date(), 6 - i), 'yyyy-MM-dd')
  );

  const chartData = last7.map(date => {
    const found = weekStats.find(d => d.date === date);
    return {
      day:      format(parseISO(date), 'EEE'),
      date,
      calories: parseFloat(found?.calories) || 0,
      protein:  parseFloat(found?.protein)  || 0,
      carbs:    parseFloat(found?.carbs)    || 0,
      fat:      parseFloat(found?.fat)      || 0,
    };
  });

  const isEmpty = chartData.every(d => d.calories === 0);

  if (isEmpty) {
    return (
      <div className="mx-6 mt-4 py-12 text-center">
        <p className="text-4xl mb-3">📊</p>
        <p className="text-slate-400 text-sm">No data yet</p>
        <p className="text-slate-600 text-xs mt-1">Start logging meals to see your weekly trends</p>
      </div>
    );
  }

  return (
    <div className="mx-6 mt-2 space-y-4 pb-6">
      <h3 className="text-sm font-medium text-slate-300 px-1">Last 7 Days</h3>

      {MACROS.map(({ key, label, unit, color, goalKey }) => {
        const goal = parseFloat(goals[goalKey]) || 0;
        const avg  = Math.round(chartData.reduce((s, d) => s + d[key], 0) / 7 * 10) / 10;

        return (
          <div key={key} className="bg-navy-900/70 border border-white/5 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-200">{label}</span>
              <div className="flex items-center gap-3 text-[10px] text-slate-400">
                <span>avg <span className="text-white font-medium">{avg}{unit}</span></span>
                <span>goal <span style={{ color }} className="font-medium">{goal}{unit}</span></span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={90}>
              <BarChart data={chartData} barCategoryGap="30%" margin={{ top: 4, bottom: 0, left: 0, right: 0 }}>
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false} tickLine={false}
                />
                <YAxis hide domain={[0, d => Math.max(d * 1.2, goal * 1.1, 1)]} />
                <Tooltip content={<CustomTooltip unit={unit} />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                {goal > 0 && (
                  <ReferenceLine y={goal} stroke={color} strokeDasharray="4 4" strokeOpacity={0.5} />
                )}
                <Bar dataKey={key} radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={goal > 0 && entry[key] >= goal ? color : `${color}60`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
}
