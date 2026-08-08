import React, { useState } from 'react';
import { useRoutineStore } from './routineStore';
import { Check, Trash2, Calendar, Flag } from 'lucide-react';
import { isSameDay, format, isPast, isToday } from 'date-fns';

const PRIORITIES = {
  high: 'text-red-400 border-red-400/30 bg-red-400/10',
  medium: 'text-amber-400 border-amber-400/30 bg-amber-400/10',
  low: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10'
};

export default function TasksList() {
  const { tasks, updateTask, deleteTask, addTask } = useRoutineStore();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');

  const handleAdd = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    addTask({
      title: title.trim(),
      priority,
      date: new Date().toISOString().split('T')[0],
      due_time: null
    });
    
    setTitle('');
    setPriority('medium');
  };

  return (
    <div className="w-80 border-l border-white/5 bg-navy-900/30 flex flex-col h-full flex-shrink-0">
      <div className="p-4 border-b border-white/5">
        <h3 className="font-display font-medium text-slate-200 flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-emerald-400" /> Today's One-Off Tasks
        </h3>

        <form onSubmit={handleAdd} className="flex flex-col gap-3">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Add a task for today..."
            className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
          />
          <div className="flex gap-2">
            {Object.keys(PRIORITIES).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`flex-1 py-1 rounded-lg text-[10px] font-medium uppercase tracking-wider border transition-all ${priority === p ? PRIORITIES[p] : 'border-white/5 text-slate-500 hover:bg-white/5'}`}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={!title.trim()}
            className="hidden"
          />
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
        {tasks.filter(t => isSameDay(new Date(t.date), new Date())).length === 0 ? (
          <div className="text-center text-slate-500 text-xs mt-4">
            No tasks scheduled for today.
          </div>
        ) : (
          tasks.filter(t => isSameDay(new Date(t.date), new Date())).map(task => {
            const pClass = PRIORITIES[task.priority] || PRIORITIES.medium;
            
            return (
              <div key={task.id} className={`group flex items-start gap-3 p-3 rounded-xl border transition-all ${task.completed ? 'border-white/5 bg-navy-900/30 opacity-50' : 'border-white/10 bg-navy-800/80 hover:border-emerald-500/30'}`}>
                <button
                  onClick={() => updateTask(task.id, { completed: !task.completed })}
                  className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 flex items-center justify-center transition-colors ${task.completed ? 'bg-emerald-500 text-navy-950' : 'border border-slate-600 hover:border-emerald-500'}`}
                >
                  {task.completed && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                </button>
                
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                    {task.title}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${pClass}`}>
                      <Flag className="w-2.5 h-2.5" /> {task.priority}
                    </span>
                    {task.due_time && (
                      <span className="text-[10px] text-slate-500 font-medium">
                        {task.due_time.substring(0, 5)}
                      </span>
                    )}
                  </div>
                </div>

                <button 
                  onClick={() => deleteTask(task.id)}
                  className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
