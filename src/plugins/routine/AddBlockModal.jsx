import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useRoutineStore } from './routineStore';

const CATEGORIES = [
  { id: 'morning', label: 'Morning', color: 'text-amber-400', bg: 'bg-amber-400/20' },
  { id: 'work', label: 'Work Focus', color: 'text-cyan-400', bg: 'bg-cyan-400/20' },
  { id: 'personal', label: 'Personal', color: 'text-emerald-400', bg: 'bg-emerald-400/20' },
  { id: 'evening', label: 'Evening', color: 'text-indigo-400', bg: 'bg-indigo-400/20' },
  { id: 'night', label: 'Night', color: 'text-purple-400', bg: 'bg-purple-400/20' },
];

export default function AddBlockModal({ onClose }) {
  const { addBlock } = useRoutineStore();
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('08:00');
  const [duration, setDuration] = useState('60');
  const [label, setLabel] = useState('');
  const [emoji, setEmoji] = useState('☕️');
  const [category, setCategory] = useState('morning');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !time) return;

    addBlock({
      time: time + ':00',
      title: title.trim(),
      duration_minutes: parseInt(duration, 10) || 60,
      label: label.trim(),
      emoji: emoji.trim() || '⭐️',
      color_category: category
    });
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-[3px] animate-fade-in">
      <div 
        className="w-full max-w-md bg-navy-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-navy-800">
          <h3 className="font-display font-medium text-lg text-slate-200">Add Routine Block</h3>
          <button onClick={onClose} className="p-1 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Block Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
              placeholder="e.g. Deep Work Session"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Start Time</label>
              <input
                type="time"
                required
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Duration (mins)</label>
              <input
                type="number"
                min="5"
                required
                value={duration}
                onChange={e => setDuration(e.target.value)}
                className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Emoji</label>
              <input
                type="text"
                value={emoji}
                onChange={e => setEmoji(e.target.value)}
                maxLength={2}
                className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-center text-xl focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Short Label (Optional)</label>
              <input
                type="text"
                value={label}
                onChange={e => setLabel(e.target.value)}
                className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
                placeholder="e.g. Work"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Category Theme</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${category === c.id ? `${c.bg} ${c.color} border-current shadow-[0_0_10px_rgba(0,0,0,0.1)]` : 'border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!title.trim() || !time}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Block
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
