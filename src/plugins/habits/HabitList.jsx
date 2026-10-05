import React, { useState } from 'react';
import { useHabitStore } from './habitStore';
import { format, subDays, isSameDay } from 'date-fns';
import { Trash2, Flame, Check } from 'lucide-react';

export default function HabitList() {
  const { habits, getLogStatus, toggleLog, deleteHabit, getHabitStreak } = useHabitStore();
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Generate last 7 days
  const days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i));

  if (habits.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-slate-500 max-w-sm px-4">
          <div className="text-4xl mb-4 opacity-50">⏱</div>
          <p>No habits yet. Click the + button above to start building better routines.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
      
      {/* 7-Day Grid Header */}
      <div className="flex mb-4">
        <div className="w-48 flex-shrink-0" />
        <div className="flex-1 flex justify-between">
          {days.map(day => {
            const isToday = isSameDay(day, new Date());
            const isSelected = isSameDay(day, selectedDate);
            return (
              <button 
                key={day.getTime()}
                onClick={() => setSelectedDate(day)}
                className={`flex-1 flex flex-col items-center p-1 rounded-lg transition-all
                  ${isSelected ? 'bg-white/10 text-slate-200' : 'hover:bg-white/5 text-slate-500'}`}
              >
                <span className="text-[10px] font-medium uppercase tracking-widest">{format(day, 'EEE')}</span>
                <span className={`text-sm font-bold ${isToday ? 'text-cyan-400' : ''}`}>{format(day, 'd')}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Habit Rows */}
      <div className="space-y-3">
        {habits.map(habit => {
          const streak = getHabitStreak(habit.id);
          const themeColor = habit.color || 'bg-cyan-500 text-cyan-950';
          
          return (
            <div key={habit.id} className="group flex items-center bg-navy-800/50 border border-white/5 rounded-xl hover:border-white/10 transition-colors p-2">
              
              {/* Habit Info */}
              <div className="w-48 flex-shrink-0 flex items-center gap-3 pr-4 border-r border-white/5 relative">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${themeColor} shadow-md`}>
                  {habit.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-slate-200 truncate">{habit.name}</div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <Flame className={`w-3 h-3 ${streak > 0 ? 'text-orange-500' : ''}`} />
                    <span>{streak} streak</span>
                  </div>
                </div>

                <button 
                  onClick={() => { if (window.confirm(`Delete "${habit.name}" and all its check-ins?`)) deleteHabit(habit.id); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity bg-navy-900 rounded-lg shadow"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 7-Day Grid Checks */}
              <div className="flex-1 flex justify-between pl-4 pr-1">
                {days.map(day => {
                  const completed = getLogStatus(habit.id, day);
                  const isFuture = day > new Date();
                  
                  return (
                    <div key={day.getTime()} className="flex-1 flex justify-center">
                      <button
                        disabled={isFuture}
                        onClick={() => toggleLog(habit.id, day)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300
                          ${isFuture ? 'opacity-20 cursor-not-allowed' : 'hover:scale-110 active:scale-95'}
                          ${completed 
                            ? `${themeColor.split(' ')[0]} shadow-[0_0_10px_rgba(0,0,0,0.2)]` 
                            : 'bg-navy-900/50 border border-white/10'}`}
                      >
                        {completed && <Check className={`w-4 h-4 ${themeColor.split(' ')[1]}`} strokeWidth={3} />}
                      </button>
                    </div>
                  );
                })}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
