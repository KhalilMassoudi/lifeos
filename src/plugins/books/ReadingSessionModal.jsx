import React, { useState } from 'react';
import { useBookStore } from './bookStore';
import { X, BookOpen, Clock } from 'lucide-react';

export default function ReadingSessionModal({ book, onClose }) {
  const { logSession } = useBookStore();
  const [pagesRead, setPagesRead] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const p = parseInt(pagesRead, 10);
    const d = parseInt(durationMinutes, 10) || 0;
    
    if (isNaN(p) || p <= 0) return;

    logSession(book.id, p, d, notes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-md bg-navy-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-navy-800">
          <h3 className="font-display font-medium text-lg text-slate-200">Log Reading Session</h3>
          <button onClick={onClose} className="p-1 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex gap-3 items-center mb-6">
            {book.cover_url ? (
              <img src={book.cover_url} alt="Cover" className="w-12 h-16 object-cover rounded shadow border border-white/5" />
            ) : (
              <div className="w-12 h-16 rounded bg-navy-800 flex items-center justify-center border border-white/5">
                <BookOpen className="w-5 h-5 text-slate-600" />
              </div>
            )}
            <div>
              <div className="text-sm font-medium text-slate-200 truncate pr-2" title={book.title}>{book.title}</div>
              <div className="text-xs text-slate-500">{book.author}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                Pages Read Today
              </label>
              <input
                type="number"
                min="1"
                required
                value={pagesRead}
                onChange={e => setPagesRead(e.target.value)}
                className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                placeholder="e.g. 25"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sage-400" />
                Time Spent (mins)
              </label>
              <input
                type="number"
                min="0"
                value={durationMinutes}
                onChange={e => setDurationMinutes(e.target.value)}
                className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                placeholder="Optional"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Session Notes (Optional)</label>
            <textarea
              rows="3"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50 resize-none"
              placeholder="What happened in this session?"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!pagesRead || parseInt(pagesRead, 10) <= 0}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
