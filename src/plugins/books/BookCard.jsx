import React, { useState } from 'react';
import { Star, BookOpen, Trash2, Edit2, CheckCircle2 } from 'lucide-react';
import { useBookStore, BOOK_STATUS } from './bookStore';
import ReadingSessionModal from './ReadingSessionModal';

export default function BookCard({ book }) {
  const { updateItem, deleteBook, updateBook } = useBookStore();
  const [showLogModal, setShowLogModal] = useState(false);

  const handleStarClick = (rating) => updateBook(book.id, { rating });

  const progressPercent = book.total_pages > 0 
    ? Math.min(Math.round(((book.pages_read || 0) / book.total_pages) * 100), 100) 
    : 0;

  return (
    <>
      <div className="bg-navy-800/80 border border-white/5 rounded-2xl p-4 shadow-lg hover:border-amber-500/30 transition-all group flex flex-col h-full">
        <div className="flex gap-4">
          {/* Cover */}
          {book.cover_url ? (
            <img 
              src={book.cover_url} 
              alt={book.title} 
              className="w-20 h-28 object-cover rounded-lg shadow-md border border-white/5"
            />
          ) : (
            <div className="w-20 h-28 rounded-lg bg-navy-900 flex items-center justify-center text-slate-600 shadow-md border border-white/5">
              <BookOpen className="w-8 h-8" />
            </div>
          )}

          {/* Details */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-base font-medium text-slate-200 leading-tight truncate" title={book.title}>
                {book.title}
              </h4>
              <button 
                onClick={() => deleteBook(book.id)}
                className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="text-sm text-slate-400 mt-1 truncate">{book.author}</div>
            
            {book.genres && book.genres.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {book.genres.slice(0, 2).map((g, i) => (
                  <span key={i} className="text-[10px] font-medium bg-navy-900 px-1.5 py-0.5 rounded text-slate-500 border border-white/5 truncate max-w-[100px]">
                    {g}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-auto pt-3">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => handleStarClick(star)}
                    className={`w-4 h-4 flex items-center justify-center transition-colors
                      ${book.rating >= star ? 'text-amber-500' : 'text-slate-600 hover:text-amber-500/50'}`}
                  >
                    <Star className={`w-3.5 h-3.5 ${book.rating >= star ? 'fill-current' : ''}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action / Progress Area */}
        <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-3">
          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between text-xs font-medium mb-1.5">
              <span className="text-slate-400">
                {book.pages_read || 0} / {book.total_pages > 0 ? book.total_pages : '?'} pages
              </span>
              <span className="text-amber-500">{progressPercent}%</span>
            </div>
            <div className="h-1.5 bg-navy-900 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 mt-auto">
            {book.status === BOOK_STATUS.WANT_TO_READ && (
              <button 
                onClick={() => updateBook(book.id, { status: BOOK_STATUS.READING, start_date: new Date().toISOString().split('T')[0] })}
                className="flex-1 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-xs font-medium rounded-lg transition-colors border border-amber-500/20"
              >
                Start Reading
              </button>
            )}

            {book.status === BOOK_STATUS.READING && (
              <>
                <button 
                  onClick={() => setShowLogModal(true)}
                  className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-400 text-navy-950 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <Edit2 className="w-3 h-3" /> Log
                </button>
                <button 
                  onClick={() => updateBook(book.id, { status: BOOK_STATUS.FINISHED, finish_date: new Date().toISOString().split('T')[0] })}
                  className="px-2 py-1.5 bg-sage-500/10 hover:bg-sage-500/20 text-sage-400 text-xs font-medium rounded-lg transition-colors border border-sage-500/20"
                  title="Mark as Finished"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </>
            )}

            {(book.status === BOOK_STATUS.FINISHED || book.status === BOOK_STATUS.ABANDONED) && (
              <button 
                onClick={() => updateBook(book.id, { status: BOOK_STATUS.READING })}
                className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium rounded-lg transition-colors"
              >
                Read Again
              </button>
            )}
          </div>
        </div>
      </div>

      {showLogModal && (
        <ReadingSessionModal 
          book={book} 
          onClose={() => setShowLogModal(false)} 
        />
      )}
    </>
  );
}
