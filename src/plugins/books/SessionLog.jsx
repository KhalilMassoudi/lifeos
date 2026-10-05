import React from 'react';
import { format, parseISO } from 'date-fns';
import { Trash2, Clock, BookOpen } from 'lucide-react';
import { useBookStore } from './bookStore';

export default function SessionLog() {
  const { sessions, books, deleteSession } = useBookStore();
  const bookById = Object.fromEntries(books.map(b => [b.id, b]));

  return (
    <div className="bg-navy-800/50 border border-white/5 rounded-2xl p-6">
      <h3 className="font-medium text-slate-200 mb-4 font-display">Reading Log</h3>

      {sessions.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6">
          No sessions yet. Press "Log" on a book you're reading.
        </p>
      ) : (
        <div className="space-y-2">
          {sessions.map(session => {
            const book = bookById[session.book_id];
            return (
              <div key={session.id} className="group flex items-start gap-3 p-3 rounded-xl bg-navy-900/50 border border-white/5">
                <BookOpen className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-200 truncate">{book?.title || 'Deleted book'}</span>
                    <span className="text-xs text-slate-500">{format(parseISO(session.date), 'EEE, MMM d')}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                    <span>{session.pages_read} pages</span>
                    {session.duration_minutes > 0 && (
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {session.duration_minutes} min</span>
                    )}
                  </div>
                  {session.notes && <p className="text-xs text-slate-500 italic mt-1">"{session.notes}"</p>}
                </div>
                <button
                  onClick={() => { if (window.confirm('Delete this session? Its pages will be removed from the book.')) deleteSession(session.id); }}
                  className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  title="Delete session"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
