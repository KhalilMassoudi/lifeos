import React from 'react';

const R = 28;
const C = 2 * Math.PI * R; // ≈ 175.9

function Ring({ label, value, goal, unit, color, dimColor }) {
  const pct    = Math.min(parseFloat(value) / Math.max(parseFloat(goal), 1), 1);
  const offset = C * (1 - pct);
  const isOver = parseFloat(value) > parseFloat(goal);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: 64, height: 64 }}>
        <svg width={64} height={64} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={32} cy={32} r={R} fill="none" stroke={dimColor} strokeWidth={5} />
          <circle
            cx={32} cy={32} r={R}
            fill="none"
            stroke={isOver ? '#ef4444' : color}
            strokeWidth={5}
            strokeDasharray={C}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[11px] font-bold text-white leading-none">{value}</span>
          <span className="text-[8px] text-slate-400 leading-none mt-0.5">{unit}</span>
        </div>
      </div>
      <div className="text-center leading-tight">
        <p className="text-[10px] font-medium text-slate-300">{label}</p>
        <p className="text-[9px] text-slate-600">/ {goal}{unit}</p>
      </div>
    </div>
  );
}

export default function MacroRings({ totals, goals }) {
  const rings = [
    { label: 'Calories', value: totals.calories,  goal: goals.calories,   unit: 'kcal', color: '#f59e0b', dimColor: '#f59e0b1a' },
    { label: 'Protein',  value: totals.protein_g, goal: goals.protein_g,  unit: 'g',    color: '#3b82f6', dimColor: '#3b82f61a' },
    { label: 'Carbs',    value: totals.carbs_g,   goal: goals.carbs_g,    unit: 'g',    color: '#22c55e', dimColor: '#22c55e1a' },
    { label: 'Fat',      value: totals.fat_g,     goal: goals.fat_g,      unit: 'g',    color: '#a855f7', dimColor: '#a855f71a' },
    { label: 'Fiber',    value: totals.fiber_g,   goal: goals.fiber_g,    unit: 'g',    color: '#06b6d4', dimColor: '#06b6d41a' },
  ];

  return (
    <div className="mx-6 mb-3 px-4 py-4 bg-navy-900/70 border border-white/5 rounded-2xl flex items-center justify-around">
      {rings.map(r => <Ring key={r.label} {...r} />)}
    </div>
  );
}
