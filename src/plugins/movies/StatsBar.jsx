import React from 'react';
import { PlayCircle, Star, Sparkles, Shuffle } from 'lucide-react';
import { useMediaStore } from './mediaStore';

export default function StatsBar({ currentType }) {
  const { getStats, surpriseMe, updateItem } = useMediaStore();
  const stats = getStats(currentType);

  const handleSurpriseMe = () => {
    const item = surpriseMe(currentType);
    if (item) {
      if (window.confirm(`How about: ${item.title}?\n\nClick OK to move it to "Watching"!`)) {
        updateItem(item.id, { status: 'watching' });
      }
    } else {
      alert(`No items in your "Want to Watch" list for ${currentType}s.`);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4 px-6 mb-2">
      {/* Surprise Me Button */}
      <button 
        onClick={handleSurpriseMe}
        className="flex items-center gap-2 bg-gradient-to-r from-purple-600/80 to-pink-600/80 hover:from-purple-500 hover:to-pink-500 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-lg shadow-purple-900/20 transition-all active:scale-95"
      >
        <Shuffle className="w-4 h-4" />
        <span>Surprise Me</span>
      </button>

      {/* Stats */}
      <div className="flex-1 flex gap-2">
        <div className="flex-1 bg-navy-800/50 border border-white/5 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <PlayCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Total Watched</div>
            <div className="text-sm font-bold text-slate-200">{stats.totalWatched}</div>
          </div>
        </div>

        <div className="flex-1 bg-navy-800/50 border border-white/5 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gold-500/10 flex items-center justify-center text-gold-400">
            <Star className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Avg Rating</div>
            <div className="text-sm font-bold text-slate-200">{stats.avgRating}</div>
          </div>
        </div>

        <div className="flex-1 bg-navy-800/50 border border-white/5 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Fav Genre</div>
            <div className="text-sm font-bold text-slate-200 truncate max-w-[100px]">{stats.favGenre}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
