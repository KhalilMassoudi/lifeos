import React from 'react';
import { BookMarked, Layers, Flame, BookOpen } from 'lucide-react';
import { useBookStore } from './bookStore';

export default function StatsBar() {
  const { getStats } = useBookStore();
  const stats = getStats();

  return (
    <div className="flex flex-wrap gap-4 px-6 mb-4">
      <div className="flex-1 bg-navy-800/50 border border-white/5 rounded-2xl p-4 flex items-center gap-4 hover:border-amber-500/20 transition-colors">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
          <BookMarked className="w-5 h-5" />
        </div>
        <div>
          <div className="text-sm text-slate-500 font-medium">Finished This Year</div>
          <div className="text-xl font-bold text-slate-200">{stats.finishedThisYear}</div>
        </div>
      </div>

      <div className="flex-1 bg-navy-800/50 border border-white/5 rounded-2xl p-4 flex items-center gap-4 hover:border-amber-500/20 transition-colors">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <div className="text-sm text-slate-500 font-medium">Total Pages Read</div>
          <div className="text-xl font-bold text-slate-200">{stats.totalPagesRead}</div>
        </div>
      </div>

      <div className="flex-1 bg-navy-800/50 border border-white/5 rounded-2xl p-4 flex items-center gap-4 hover:border-amber-500/20 transition-colors">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <div className="text-sm text-slate-500 font-medium">Avg Pages / Day</div>
          <div className="text-xl font-bold text-slate-200">{stats.avgPagesPerDay}</div>
        </div>
      </div>

      <div className="flex-1 bg-navy-800/50 border border-white/5 rounded-2xl p-4 flex items-center gap-4 hover:border-amber-500/20 transition-colors">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
          <Flame className="w-5 h-5" />
        </div>
        <div>
          <div className="text-sm text-slate-500 font-medium">Reading Streak</div>
          <div className="text-xl font-bold text-slate-200 flex items-baseline gap-1">
            {stats.streak} <span className="text-sm text-slate-500 font-medium">days</span>
          </div>
        </div>
      </div>
    </div>
  );
}
