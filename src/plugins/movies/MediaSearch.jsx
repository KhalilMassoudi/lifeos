import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Image as ImageIcon } from 'lucide-react';
import { useMediaStore, MEDIA_TYPE, MEDIA_STATUS } from './mediaStore';
import { useToastStore } from '../../store/toastStore';

export default function MediaSearch({ currentType }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFetchingOMDB, setIsFetchingOMDB] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  
  const { addItem } = useMediaStore();

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
    const searchTMDB = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      
      const apiKey = import.meta.env.VITE_TMDB_KEY;
      if (!apiKey) {
        return;
      }

      setIsSearching(true);
      try {
        const endpoint = currentType === MEDIA_TYPE.MOVIE ? 'movie' : 'tv';
        const url = `https://api.themoviedb.org/3/search/${endpoint}?api_key=${apiKey}&query=${encodeURIComponent(query)}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        let fetchedResults = data.results || [];
        
        if (currentType === MEDIA_TYPE.ANIME) {
          fetchedResults = fetchedResults.filter(item => 
            item.genre_ids?.includes(16) || item.original_language === 'ja'
          );
        }

        setResults(fetchedResults.slice(0, 5));
        setIsOpen(true);
      } catch (error) {
        console.error('TMDB Search Error:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(searchTMDB, 500); // Debounce
    return () => clearTimeout(timer);
  }, [query, currentType]);

  const handleAdd = async (item) => {
    const isTv = currentType !== MEDIA_TYPE.MOVIE;
    const title = isTv ? item.name : item.title;
    
    setIsFetchingOMDB(true);

    const initialReleaseYear = isTv 
      ? (item.first_air_date ? parseInt(item.first_air_date.split('-')[0]) : null)
      : (item.release_date ? parseInt(item.release_date.split('-')[0]) : null);

    // Initial placeholder item data in case OMDB fails
    let itemData = {
      title,
      tmdb_id: item.id.toString(),
      poster_url: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
      description: item.overview || '',
      release_year: initialReleaseYear,
      genres: [],
      rating: null,
      status: MEDIA_STATUS.WANT_TO_WATCH,
      notes: '',
      type: currentType,
      current_season: 1,
      current_episode: 0,
      imdb_rating: null,
      duration: null,
      director: null,
      cast: null,
      imdb_id: null
    };

    const omdbKey = import.meta.env.VITE_OMDB_KEY;
    if (omdbKey) {
      try {
        const typeParam = currentType === MEDIA_TYPE.MOVIE ? 'movie' : 'series';
        const omdbUrl = `https://www.omdbapi.com/?apikey=${omdbKey}&t=${encodeURIComponent(title)}&type=${typeParam}`;
        
        const response = await fetch(omdbUrl);
        const data = await response.json();
        
        if (data && data.Response === 'True') {
          itemData.poster_url = (data.Poster && data.Poster !== 'N/A') ? data.Poster : itemData.poster_url;
          itemData.description = (data.Plot && data.Plot !== 'N/A') ? data.Plot : itemData.description;
          itemData.imdb_rating = (data.imdbRating && data.imdbRating !== 'N/A') ? data.imdbRating : null;
          itemData.genres = (data.Genre && data.Genre !== 'N/A') ? data.Genre.split(',').map(g => g.trim()) : [];
          
          if (data.Year && data.Year !== 'N/A') {
            const yearMatch = data.Year.match(/^\d{4}/);
            if (yearMatch) {
              itemData.release_year = parseInt(yearMatch[0], 10);
            }
          }
          
          itemData.duration = (data.Runtime && data.Runtime !== 'N/A') ? data.Runtime : null;
          itemData.director = (data.Director && data.Director !== 'N/A') ? data.Director : null;
          itemData.cast = (data.Actors && data.Actors !== 'N/A') ? data.Actors : null;
          itemData.imdb_id = (data.imdbID && data.imdbID !== 'N/A') ? data.imdbID : null;
        } else {
          useToastStore.getState().addToast('Could not fetch details for this title. You can still add it manually.', 'warning');
        }
      } catch (error) {
        console.error('OMDB fetch details error:', error);
        useToastStore.getState().addToast('Could not fetch details for this title. You can still add it manually.', 'warning');
      }
    } else {
      console.warn('VITE_OMDB_KEY is not defined in the environment.');
    }

    try {
      await addItem(itemData);
    } catch (err) {
      console.error('Failed to add media item:', err);
    } finally {
      setIsFetchingOMDB(false);
      setIsOpen(false);
      setQuery('');
    }
  };

  const handleManualAdd = async (e) => {
    if (e.key === 'Enter' && query.trim()) {
      const title = query.trim();
      setIsFetchingOMDB(true);
      
      let itemData = {
        title,
        status: MEDIA_STATUS.WANT_TO_WATCH,
        type: currentType,
        rating: null,
        current_season: 1,
        current_episode: 0,
        poster_url: null,
        description: '',
        release_year: null,
        genres: [],
        imdb_rating: null,
        duration: null,
        director: null,
        cast: null,
        imdb_id: null,
        tmdb_id: null
      };

      const omdbKey = import.meta.env.VITE_OMDB_KEY;
      if (omdbKey) {
        try {
          const typeParam = currentType === MEDIA_TYPE.MOVIE ? 'movie' : 'series';
          const omdbUrl = `https://www.omdbapi.com/?apikey=${omdbKey}&t=${encodeURIComponent(title)}&type=${typeParam}`;
          
          const response = await fetch(omdbUrl);
          const data = await response.json();
          
          if (data && data.Response === 'True') {
            itemData.poster_url = (data.Poster && data.Poster !== 'N/A') ? data.Poster : null;
            itemData.description = (data.Plot && data.Plot !== 'N/A') ? data.Plot : '';
            itemData.imdb_rating = (data.imdbRating && data.imdbRating !== 'N/A') ? data.imdbRating : null;
            itemData.genres = (data.Genre && data.Genre !== 'N/A') ? data.Genre.split(',').map(g => g.trim()) : [];
            
            if (data.Year && data.Year !== 'N/A') {
              const yearMatch = data.Year.match(/^\d{4}/);
              if (yearMatch) {
                itemData.release_year = parseInt(yearMatch[0], 10);
              }
            }
            
            itemData.duration = (data.Runtime && data.Runtime !== 'N/A') ? data.Runtime : null;
            itemData.director = (data.Director && data.Director !== 'N/A') ? data.Director : null;
            itemData.cast = (data.Actors && data.Actors !== 'N/A') ? data.Actors : null;
            itemData.imdb_id = (data.imdbID && data.imdbID !== 'N/A') ? data.imdbID : null;
          }
        } catch (error) {
          console.error('OMDB fetch error during manual enter:', error);
        }
      }

      try {
        await addItem(itemData);
      } catch (err) {
        console.error('Failed to add manual media item:', err);
      } finally {
        setIsFetchingOMDB(false);
        setQuery('');
        setIsOpen(false);
      }
    }
  };

  return (
    <div className="relative w-full max-w-md" ref={wrapperRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder={`Search for ${currentType}s... (Press Enter for manual add)`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleManualAdd}
          onFocus={() => { if (query.trim()) setIsOpen(true); }}
          className="w-full bg-navy-800/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/50 transition-all"
        />
        {(isSearching || isFetchingOMDB) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-gold-400/30 border-t-gold-400 animate-spin" />
        )}
      </div>

      {/* OMDB Fetch Overlay */}
      {isFetchingOMDB && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] flex items-center justify-center z-50">
          <div className="bg-navy-900 border border-white/10 p-5 rounded-2xl flex items-center gap-3 shadow-2xl animate-fade-in max-w-sm">
            <div className="w-5 h-5 rounded-full border-2 border-gold-400/30 border-t-gold-400 animate-spin" />
            <span className="text-sm font-medium text-slate-300">Fetching title details from OMDB...</span>
          </div>
        </div>
      )}

      {/* Dropdown Results */}
      {isOpen && query.trim() && (
        <div className="absolute top-full mt-2 w-full bg-navy-800 border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
          {results.length > 0 ? (
            results.map((item) => (
              <button
                key={item.id}
                onClick={() => handleAdd(item)}
                className="group w-full flex items-center gap-3 p-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
              >
                {item.poster_path ? (
                  <img 
                    src={`https://image.tmdb.org/t/p/w92${item.poster_path}`} 
                    alt={item.title || item.name} 
                    className="w-10 h-14 object-cover rounded bg-navy-900"
                  />
                ) : (
                  <div className="w-10 h-14 rounded bg-navy-900 flex items-center justify-center text-slate-600">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-200 truncate">
                    {currentType === MEDIA_TYPE.MOVIE ? item.title : item.name}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {currentType === MEDIA_TYPE.MOVIE 
                      ? (item.release_date ? item.release_date.split('-')[0] : 'N/A')
                      : (item.first_air_date ? item.first_air_date.split('-')[0] : 'N/A')}
                  </div>
                </div>
                <Plus className="w-4 h-4 text-gold-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))
          ) : (
            <div className="p-4 text-center text-sm text-slate-500">
              {!isSearching && "No results found on TMDB. Press Enter to add manually."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
