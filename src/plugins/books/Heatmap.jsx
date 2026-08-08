import React from 'react';
import { useBookStore } from './bookStore';
import { format, parseISO, isSameMonth, startOfMonth, getDay } from 'date-fns';

export default function Heatmap() {
  const { getHeatmapData } = useBookStore();
  const data = getHeatmapData(84); // 12 weeks * 7 days

  const getColorClass = (minutes) => {
    if (minutes === 0) return 'bg-navy-900/50 border border-white/5';
    if (minutes < 15) return 'bg-amber-900/40 border border-amber-500/20';
    if (minutes < 30) return 'bg-amber-700/60 border border-amber-500/30';
    if (minutes < 60) return 'bg-amber-600/80 border border-amber-500/40';
    return 'bg-amber-500 border border-amber-400';
  };

  // Group by weeks
  const weeks = [];
  let currentWeek = [];
  
  data.forEach((day, index) => {
    currentWeek.push(day);
    if (currentWeek.length === 7 || index === data.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  return (
    <div className="bg-navy-800/50 border border-white/5 rounded-2xl p-6">
      <h3 className="font-medium text-slate-200 mb-4 font-display">Reading Activity</h3>
      
      <div className="flex gap-1.5 overflow-x-auto pb-2 custom-scrollbar">
        {weeks.map((week, wIdx) => (
          <div key={wIdx} className="flex flex-col gap-1.5">
            {week.map((day, dIdx) => (
              <div
                key={day.key}
                className={`w-3.5 h-3.5 rounded-sm transition-colors group relative ${getColorClass(day.value)}`}
              >
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-10 w-max">
                  <div className="bg-navy-950 text-slate-200 text-xs py-1 px-2 rounded shadow-xl border border-white/10 flex flex-col items-center">
                    <span className="font-medium">{day.value} pages</span>
                    <span className="text-slate-500 text-[10px]">{format(day.date, 'MMM d, yyyy')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      
      <div className="flex items-center justify-between mt-4 text-xs font-medium text-slate-500">
        <div>12 Weeks History</div>
        <div className="flex items-center gap-1.5">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-sm bg-navy-900/50 border border-white/5" />
            <div className="w-3 h-3 rounded-sm bg-amber-900/40 border border-amber-500/20" />
            <div className="w-3 h-3 rounded-sm bg-amber-700/60 border border-amber-500/30" />
            <div className="w-3 h-3 rounded-sm bg-amber-600/80 border border-amber-500/40" />
            <div className="w-3 h-3 rounded-sm bg-amber-500 border border-amber-400" />
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
