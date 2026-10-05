import React, { useEffect, useState, useRef } from 'react';
import { useRoutineStore } from './routineStore';
import { Check, Trash2 } from 'lucide-react';

const CATEGORIES = {
  morning: 'border-amber-500 text-amber-400 bg-amber-50',
  work: 'border-sky-500 text-sky-400 bg-sky-50',
  personal: 'border-emerald-500 text-emerald-400 bg-emerald-50',
  evening: 'border-indigo-500 text-indigo-400 bg-indigo-50',
  night: 'border-purple-500 text-purple-400 bg-purple-50',
};

export default function Timeline() {
  const { blocks, getLogStatus, toggleLog, deleteBlock } = useRoutineStore();
  const [now, setNow] = useState(new Date());
  const today = new Date();
  const timelineRef = useRef(null);

  // Open the timeline scrolled to about an hour before now
  useEffect(() => {
    const el = timelineRef.current;
    if (!el) return;
    const content = el.firstElementChild;
    const hours = Math.max(new Date().getHours() - 1, 0);
    el.scrollTop = (content?.offsetHeight || 1200) * (hours / 24);
  }, [blocks.length > 0]);

  // Update current time line every minute
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Calculate position percentage based on hours (0 to 24)
  const getTimePercent = (date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return ((hours + minutes / 60) / 24) * 100;
  };

  const getBlockTop = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return ((h + m / 60) / 24) * 100;
  };

  const getBlockHeight = (durationMins) => {
    return (durationMins / 60 / 24) * 100;
  };

  if (blocks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center border border-white/5 bg-navy-900/50 rounded-2xl mx-6">
        <div className="text-center text-slate-500 max-w-sm px-4">
          <div className="text-4xl mb-4 opacity-50">🗓</div>
          <p>Your day is a blank slate. Add some routine blocks to structure your day.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 mx-6 bg-navy-900/30 border border-white/5 rounded-2xl overflow-y-auto custom-scrollbar" ref={timelineRef}>
      
      {/* 24 Hour Background Grid */}
      <div className="absolute top-0 left-0 w-full h-[1200px]">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="absolute w-full border-t border-white/5 flex items-start" style={{ top: `${(i / 24) * 100}%` }}>
            <span className="text-[10px] text-slate-600 font-medium w-12 text-right pr-2 -mt-2.5">
              {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
            </span>
          </div>
        ))}

        {/* Blocks */}
        <div className="absolute top-0 left-16 right-4 bottom-0">
          {blocks.map(block => {
            const top = getBlockTop(block.time);
            const height = getBlockHeight(block.duration_minutes);
            const isCompleted = getLogStatus(block.id, today);
            const themeClass = CATEGORIES[block.color_category] || CATEGORIES.personal;
            const [hourStr, minStr] = block.time.split(':');
            const displayTime = `${parseInt(hourStr) % 12 || 12}:${minStr} ${parseInt(hourStr) >= 12 ? 'PM' : 'AM'}`;

            return (
              <div
                key={block.id}
                className={`absolute left-0 right-0 rounded-xl border-l-4 p-3 flex items-start justify-between group transition-all ${themeClass} ${isCompleted ? 'opacity-50' : 'hover:scale-[1.01] shadow-lg'}`}
                style={{ top: `${top}%`, height: `${height}%`, minHeight: '60px' }}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="text-2xl mt-0.5">{block.emoji}</div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-slate-200 truncate pr-2">
                      {block.title}
                    </div>
                    <div className="text-xs font-medium opacity-70 mt-0.5">
                      {displayTime} • {block.duration_minutes}m {block.label && `• ${block.label}`}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 items-end">
                  <button
                    onClick={() => toggleLog(block.id, today)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isCompleted ? 'bg-current text-navy-950' : 'border border-current hover:bg-current hover:text-navy-950'}`}
                  >
                    {isCompleted && <Check className="w-4 h-4" strokeWidth={3} />}
                  </button>
                  
                  <button 
                    onClick={() => { if (window.confirm(`Delete "${block.title}" from your routine?`)) deleteBlock(block.id); }}
                    className="p-1.5 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity bg-navy-950/80 rounded shadow"
                    title="Delete Block"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Current Time Indicator */}
        <div 
          className="absolute left-12 right-0 flex items-center z-10 pointer-events-none"
          style={{ top: `${getTimePercent(now)}%` }}
        >
          <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] -ml-1.5" />
          <div className="flex-1 h-px bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
        </div>

      </div>
    </div>
  );
}
