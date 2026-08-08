import React, { useState } from 'react';
import { Star, Image as ImageIcon, Plus, Minus, Trash2, X, Film, User, Users, Clock, Award, BookOpen } from 'lucide-react';
import { useMediaStore, MEDIA_TYPE, MEDIA_STATUS } from './mediaStore';

export default function MediaCard({ item }) {
  const { updateItem, deleteItem } = useMediaStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [notesText, setNotesText] = useState(item.notes || '');

  const handleStarClick = (e, starValue) => {
    e.stopPropagation();
    // Clicking the same star clears it (sets to null)
    const newRating = item.rating === starValue ? null : starValue;
    updateItem(item.id, { rating: newRating });
  };

  const handleNotesBlur = () => {
    if (notesText !== item.notes) {
      updateItem(item.id, { notes: notesText });
    }
  };

  const activeRating = hoverRating || item.rating || 0;

  return (
    <>
      <div
        onClick={() => setIsModalOpen(true)}
        className="bg-navy-800/80 border border-white/5 rounded-xl p-3 shadow-md hover:border-gold-400/30 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] group relative w-full"
      >
        <div className="flex gap-3">
          {/* Poster */}
          {item.poster_url ? (
            <img 
              src={item.poster_url} 
              alt={item.title} 
              className="w-16 h-24 object-cover rounded-lg shadow-sm flex-shrink-0"
              onError={(e) => {
                // Fallback if image fails to load
                e.target.onerror = null;
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          
          {/* Fallback Poster Placeholder */}
          <div 
            className="w-16 h-24 rounded-lg bg-navy-900 flex flex-col items-center justify-center text-slate-500 shadow-sm border border-white/5 p-1 text-center flex-shrink-0"
            style={{ display: item.poster_url ? 'none' : 'flex' }}
          >
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 truncate w-full px-0.5">{item.title}</span>
            <ImageIcon className="w-4 h-4 text-slate-600 mt-1" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 py-0.5 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-semibold text-slate-200 leading-tight truncate" title={item.title}>
                  {item.title}
                </h4>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Delete "${item.title}"?`)) {
                      deleteItem(item.id);
                    }
                  }}
                  className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                <span>{item.release_year || 'Year unknown'}</span>
                {item.imdb_rating && (
                  <span className="bg-gold-400/10 text-gold-400 text-[10px] px-1.5 py-0.2 rounded font-bold border border-gold-400/20">
                    IMDb {item.imdb_rating}
                  </span>
                )}
                {item.duration && (
                  <span className="text-slate-600">• {item.duration}</span>
                )}
              </div>

              {item.genres && item.genres.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {item.genres.slice(0, 2).map((g, idx) => (
                    <span key={idx} className="text-[9px] px-1.5 py-0.5 bg-white/5 rounded text-slate-400">
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-2 pt-1 flex items-center justify-between">
              {/* Rating */}
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={(e) => handleStarClick(e, star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className={`w-4 h-4 flex items-center justify-center transition-colors
                      ${activeRating >= star ? 'text-gold-400' : 'text-slate-600 hover:text-gold-400/50'}`}
                  >
                    <Star className={`w-3 h-3 ${activeRating >= star ? 'fill-current' : ''}`} />
                  </button>
                ))}
              </div>

              {/* Episode Tracker (Series/Anime) */}
              {(item.type === MEDIA_TYPE.SERIES || item.type === MEDIA_TYPE.ANIME) && (
                <div className="flex items-center gap-1 bg-navy-900 rounded-md pl-2 pr-1 py-0.5 border border-white/5">
                  <span className="text-[10px] font-medium text-slate-400">
                    Ep {item.current_episode || 0}
                  </span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      updateItem(item.id, { current_episode: (item.current_episode || 0) + 1 });
                    }}
                    className="w-4 h-4 flex items-center justify-center text-gold-400 hover:bg-white/10 rounded"
                    title="+1 Episode"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="w-full max-w-2xl bg-navy-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-navy-800">
              <span className="text-xs uppercase tracking-widest text-gold-400 font-bold">{item.type} Details</span>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-1 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[80vh] custom-scrollbar flex flex-col md:flex-row gap-6">
              {/* Left Column: Poster */}
              <div className="w-full md:w-48 flex-shrink-0 flex justify-center">
                {item.poster_url ? (
                  <img 
                    src={item.poster_url} 
                    alt={item.title} 
                    className="w-44 h-64 object-cover rounded-xl shadow-lg border border-white/10 bg-navy-950"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className="w-44 h-64 rounded-xl bg-navy-950 flex flex-col items-center justify-center text-slate-500 shadow-lg border border-white/10 p-4 text-center"
                  style={{ display: item.poster_url ? 'none' : 'flex' }}
                >
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 leading-tight">{item.title}</span>
                  <ImageIcon className="w-8 h-8 text-slate-600" />
                </div>
              </div>

              {/* Right Column: Meta Info & Editing */}
              <div className="flex-1 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-100 font-display leading-tight">{item.title}</h2>
                  
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-sm text-slate-400 font-semibold">{item.release_year || 'N/A'}</span>
                    {item.duration && (
                      <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-600" /> {item.duration}
                      </span>
                    )}
                    {item.imdb_rating && (
                      <span className="bg-gold-400/10 text-gold-400 text-xs px-2 py-0.5 rounded font-bold border border-gold-400/20 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-gold-400" /> IMDb {item.imdb_rating}
                      </span>
                    )}
                  </div>
                </div>

                {item.genres && item.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {item.genres.map((g, idx) => (
                      <span key={idx} className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded">
                        {g}
                      </span>
                    ))}
                  </div>
                )}

                {item.description && (
                  <p className="text-sm text-slate-400 leading-relaxed bg-white/2 p-3 rounded-xl border border-white/5">
                    {item.description}
                  </p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {item.director && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <User className="w-4 h-4 text-slate-600 flex-shrink-0" />
                      <div>
                        <span className="text-slate-600 block">Director</span>
                        <span className="font-medium text-slate-300">{item.director}</span>
                      </div>
                    </div>
                  )}
                  {item.cast && (
                    <div className="flex items-start gap-2 text-slate-400 col-span-1 md:col-span-2">
                      <Users className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-slate-600 block">Cast</span>
                        <span className="font-medium text-slate-300">{item.cast}</span>
                      </div>
                    </div>
                  )}
                </div>

                <hr className="border-white/5" />

                {/* Interactive Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Status dropdown */}
                  <div>
                    <label className="block text-xs text-slate-500 mb-1 font-medium">Watch Status</label>
                    <select
                      value={item.status}
                      onChange={(e) => updateItem(item.id, { status: e.target.value })}
                      className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-gold-400/50"
                    >
                      <option value={MEDIA_STATUS.WANT_TO_WATCH}>Want to Watch</option>
                      <option value={MEDIA_STATUS.WATCHING}>Watching</option>
                      <option value={MEDIA_STATUS.COMPLETED}>Completed</option>
                      <option value={MEDIA_STATUS.DROPPED}>Dropped</option>
                    </select>
                  </div>

                  {/* Personal Rating */}
                  <div>
                    <label className="block text-xs text-slate-500 mb-1 font-medium">My Rating</label>
                    <div className="flex items-center h-9">
                      <div className="flex gap-1 bg-navy-950 px-3 py-1.5 rounded-xl border border-white/10">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            type="button"
                            onClick={(e) => handleStarClick(e, star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className={`w-6 h-6 flex items-center justify-center transition-colors
                              ${activeRating >= star ? 'text-gold-400' : 'text-slate-600 hover:text-gold-400/50'}`}
                          >
                            <Star className={`w-4 h-4 ${activeRating >= star ? 'fill-current' : ''}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Season / Episode Trackers (if series/anime) */}
                  {(item.type === MEDIA_TYPE.SERIES || item.type === MEDIA_TYPE.ANIME) && (
                    <>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1.5 font-medium">Current Season</label>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => updateItem(item.id, { current_season: Math.max(1, (item.current_season || 1) - 1) })}
                            className="w-8 h-8 rounded-lg bg-navy-950 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="flex-1 text-center text-sm font-semibold text-slate-200">
                            {item.current_season || 1}
                          </span>
                          <button 
                            onClick={() => updateItem(item.id, { current_season: (item.current_season || 1) + 1 })}
                            className="w-8 h-8 rounded-lg bg-navy-950 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-slate-500 mb-1.5 font-medium">Current Episode</label>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => updateItem(item.id, { current_episode: Math.max(0, (item.current_episode || 0) - 1) })}
                            className="w-8 h-8 rounded-lg bg-navy-950 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="flex-1 text-center text-sm font-semibold text-slate-200">
                            {item.current_episode || 0}
                          </span>
                          <button 
                            onClick={() => updateItem(item.id, { current_episode: (item.current_episode || 0) + 1 })}
                            className="w-8 h-8 rounded-lg bg-navy-950 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Personal Notes */}
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5 font-medium flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-slate-600" /> My Notes
                  </label>
                  <textarea
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    onBlur={handleNotesBlur}
                    placeholder="Write a review, thoughts, or comments. Autosaver triggers on leave..."
                    className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-gold-400/50 h-24 resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
