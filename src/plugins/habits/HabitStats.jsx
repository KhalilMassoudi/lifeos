import React from 'react';
import { Target, Flame, Activity, CheckCircle2 } from 'lucide-react';
import { useHabitStore } from './habitStore';

export default function HabitStats() {
  const { getStats } = useHabitStore();
  const stats = getStats();

  return (
    <div className="flex flex-wrap gap-4 px-6 mb-4">
      <div className="flex-1 bg-navy-800/50 border border-white/5 rounded-2xl p-4 flex items-center gap-4 hover:border-cyan-500/20 transition-colors">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
          <Target className="w-5 h-5" />
        </div>
        <div>
          <div className="text-sm text-slate-500 font-medium">Active Habits</div>
          <div className="text-xl font-bold text-slate-200">{stats.totalActive}</div>
        </div>
      </div>

      <div className="flex-1 bg-navy-800/50 border border-white/5 rounded-2xl p-4 flex items-center gap-4 hover:border-orange-500/20 transition-colors">
        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400">
          <Flame className="w-5 h-5" />
        </div>
        <div>
          <div className="text-sm text-slate-500 font-medium">Best Streak</div>
          <div className="text-xl font-bold text-slate-200 flex items-baseline gap-1">
            {stats.bestStreak} <span className="text-sm text-slate-500 font-medium">days</span>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-navy-800/50 border border-white/5 rounded-2xl p-4 flex items-center gap-4 hover:border-emerald-500/20 transition-colors">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <div className="text-sm text-slate-500 font-medium">Completion Rate</div>
          <div className="text-xl font-bold text-slate-200 flex items-baseline gap-1">
            {stats.completionRate}<span className="text-sm text-slate-500 font-medium">%</span>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-navy-800/50 border border-white/5 rounded-2xl p-4 flex items-center gap-4 hover:border-purple-500/20 transition-colors">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <div className="text-sm text-slate-500 font-medium">Most Consistent</div>
          <div className="text-lg font-bold text-slate-200 truncate max-w-[120px]">{stats.mostConsistentHabit}</div>
        </div>
      </div>
    </div>
  );
}
