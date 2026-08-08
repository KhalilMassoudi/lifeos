import React from 'react';
import { Droplets, Plus, Minus } from 'lucide-react';
import { useMealStore } from '../mealStore';

const GLASS_ML   = 250;
const TOTAL_GLASSES = 8;

export default function WaterTracker() {
  const { goals, getTotalWater, addWater, removeLastWater, waterLogs } = useMealStore();

  const totalMl  = getTotalWater();
  const goalMl   = goals.water_ml || 2000;
  const filled   = Math.round((totalMl / goalMl) * TOTAL_GLASSES);
  const pct      = Math.min(Math.round((totalMl / goalMl) * 100), 100);

  return (
    <div className="mx-6 mb-3 bg-navy-900/70 border border-sky-500/20 rounded-2xl px-4 py-3">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <Droplets className="w-4 h-4 text-sky-400" />
          <span className="text-sm font-medium text-white">Water</span>
          <span className="text-xs text-slate-400">
            {totalMl} <span className="text-slate-600">/</span> {goalMl} ml
          </span>
          <span className={`text-xs font-medium ${pct >= 100 ? 'text-sky-400' : 'text-slate-500'}`}>
            {pct}%
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={removeLastWater}
            disabled={waterLogs.length === 0}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
          >
            <Minus className="w-3 h-3" />
          </button>
          <button
            onClick={() => addWater(GLASS_ML)}
            className="flex items-center gap-1 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-xs px-2.5 py-1.5 rounded-lg transition-all active:scale-95"
          >
            <Plus className="w-3 h-3" />
            {GLASS_ML} ml
          </button>
        </div>
      </div>

      {/* Glass indicators */}
      <div className="flex items-center gap-1">
        {Array.from({ length: TOTAL_GLASSES }).map((_, i) => (
          <button
            key={i}
            onClick={() => i < filled ? removeLastWater() : addWater(GLASS_ML)}
            className={`flex-1 h-4 rounded-full transition-all duration-300 ${
              i < filled ? 'bg-sky-400' : 'bg-white/8 hover:bg-white/15'
            }`}
            title={`${(i + 1) * GLASS_ML} ml`}
          />
        ))}
      </div>

      {totalMl >= goalMl && (
        <p className="text-[10px] text-sky-400 mt-1.5">✓ Daily water goal reached!</p>
      )}
    </div>
  );
}
