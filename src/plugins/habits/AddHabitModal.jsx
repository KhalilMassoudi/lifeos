import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useHabitStore } from './habitStore';

const COLORS = [
  'bg-cyan-500 text-cyan-950',
  'bg-blue-500 text-blue-950',
  'bg-purple-500 text-purple-950',
  'bg-pink-500 text-pink-950',
  'bg-rose-500 text-rose-950',
  'bg-amber-500 text-amber-950',
  'bg-emerald-500 text-emerald-950',
];

export default function AddHabitModal({ onClose }) {
  const { addHabit } = useHabitStore();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('💧');
  const [color, setColor] = useState(COLORS[0]);
  const [goalDesc, setGoalDesc] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    addHabit({
      name: name.trim(),
      emoji: emoji.trim() || '⭐️',
      frequency_type: 'daily',
      frequency_days: [],
      color,
      goal_description: goalDesc.trim()
    });
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-md bg-navy-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-navy-800">
          <h3 className="font-display font-medium text-lg text-slate-200">Create New Habit</h3>
          <button onClick={onClose} className="p-1 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Habit Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
              placeholder="e.g. Drink 2L Water"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Emoji Icon</label>
              <input
                type="text"
                value={emoji}
                onChange={e => setEmoji(e.target.value)}
                maxLength={2}
                className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-center text-xl focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Theme Color</label>
              <div className="flex flex-wrap gap-1">
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform ${c} ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-navy-900 scale-110' : 'opacity-50 hover:opacity-100'}`}
                  >
                    {color === c && <Check className="w-3 h-3 text-current opacity-80" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Goal Motivation (Optional)</label>
            <textarea
              rows="2"
              value={goalDesc}
              onChange={e => setGoalDesc(e.target.value)}
              className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 resize-none"
              placeholder="Why are you building this habit?"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Habit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
