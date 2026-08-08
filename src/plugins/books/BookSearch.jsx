import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Book as BookIcon } from 'lucide-react';
import { useBookStore, BOOK_STATUS } from './bookStore';

export default function BookSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  
  const { addBook } = useBookStore();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchOpenLibrary = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      
      setIsSearching(true);
      try {
        const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=5`;
        
        const response = await fetch(url, {
          headers: { 'User-Agent': 'LifeOS/1.0 (personal app)' }
        });
        const data = await response.json();
        
        setResults(data.docs || []);
        setIsOpen(true);
      } catch (error) {
        console.error('Open Library Search Error:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(searchOpenLibrary, 600); // Debounce
    return () => clearTimeout(timer);
  }, [query]);

  const handleAdd = (item) => {
    const title = item.title;
    const author = item.author_name ? item.author_name[0] : 'Unknown Author';
    const coverUrl = item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg` : null;
      
    const newBook = {
      title,
      author,
      openlibrary_id: item.key,
      cover_url: coverUrl,
      genres: item.subject ? item.subject.slice(0, 3) : [],
      total_pages: item.number_of_pages_median || 0,
      pages_read: 0,
      status: BOOK_STATUS.WANT_TO_READ,
      rating: null,
      notes: '',
    };
    
    addBook(newBook);
    setIsOpen(false);
    setQuery('');
  };

  const handleManualAdd = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      addBook({
        title: query.trim(),
        author: 'Unknown Author',
        total_pages: 0,
        pages_read: 0,
        status: BOOK_STATUS.WANT_TO_READ,
        rating: null,
      });
      setQuery('');
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full max-w-md" ref={wrapperRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search books... (Press Enter for manual add)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleManualAdd}
          onFocus={() => { if (query.trim()) setIsOpen(true); }}
          className="w-full bg-navy-800/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && query.trim() && (
        <div className="absolute top-full mt-2 w-full bg-navy-800 border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
          {results.length > 0 ? (
            results.map((item, idx) => (
              <button
                key={item.key || idx}
                onClick={() => handleAdd(item)}
                className="w-full flex items-start gap-3 p-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 group"
              >
                {item.cover_i ? (
                  <img 
                    src={`https://covers.openlibrary.org/b/id/${item.cover_i}-S.jpg`} 
                    alt={item.title} 
                    className="w-10 h-14 object-cover rounded bg-navy-900 flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-14 rounded bg-navy-900 flex items-center justify-center text-slate-600 flex-shrink-0">
                    <BookIcon className="w-5 h-5" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-200 truncate pr-4 relative">
                    {item.title}
                    <Plus className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 truncate">
                    {item.author_name ? item.author_name.join(', ') : 'Unknown Author'}
                  </div>
                  {item.first_publish_year && (
                    <div className="text-[10px] text-slate-600 mt-0.5">
                      {item.first_publish_year}
                    </div>
                  )}
                </div>
              </button>
            ))
          ) : (
            <div className="p-4 text-center text-sm text-slate-500">
              {!isSearching && "No results found on Open Library. Press Enter to add manually."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
