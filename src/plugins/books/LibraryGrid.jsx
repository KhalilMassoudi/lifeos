import React from 'react';
import { useBookStore, BOOK_STATUS } from './bookStore';
import BookCard from './BookCard';

export default function LibraryGrid() {
  const { books } = useBookStore();

  const reading = books.filter(b => b.status === BOOK_STATUS.READING);
  const wantToRead = books.filter(b => b.status === BOOK_STATUS.WANT_TO_READ);
  const finished = books.filter(b => b.status === BOOK_STATUS.FINISHED);
  const abandoned = books.filter(b => b.status === BOOK_STATUS.ABANDONED);

  const renderSection = (title, items, emptyMessage) => {
    if (items.length === 0 && !emptyMessage) return null;
    
    return (
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-medium text-slate-200 font-display">{title}</h2>
          <div className="h-px flex-1 bg-white/5" />
          <span className="text-xs font-medium text-slate-500 bg-navy-800 px-2 py-0.5 rounded-full border border-white/5">
            {items.length}
          </span>
        </div>
        
        {items.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map(book => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-500 italic p-4 bg-navy-900/50 rounded-xl border border-white/5 border-dashed text-center">
            {emptyMessage}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
      {renderSection('Currently Reading', reading, 'Not reading anything right now. Pick a book from your list!')}
      {renderSection('Want to Read', wantToRead, 'Your reading list is empty. Search above to add some books!')}
      {renderSection('Finished', finished, null)}
      {renderSection('Abandoned', abandoned, null)}
    </div>
  );
}
