import React, { useState, useEffect } from 'react';
import { useBookStore } from './bookStore';
import BookSearch from './BookSearch';
import StatsBar from './StatsBar';
import LibraryGrid from './LibraryGrid';
import Heatmap from './Heatmap';
import SessionLog from './SessionLog';

export default function BooksTrackerPlugin() {
  const [activeTab, setActiveTab] = useState('library');
  const { fetchData, isLoaded } = useBookStore();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!isLoaded) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-navy-950">
      {/* Plugin Header */}
      <div className="flex-shrink-0 px-6 pt-5 pb-0 border-b border-white/5 bg-navy-900">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-400 font-semibold leading-tight">
              Books Tracker
            </h1>
            <p className="text-slate-500 text-xs mt-1">
              Your personal reading library & log
            </p>
          </div>
          <BookSearch />
        </div>

        {/* Main tabs */}
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('library')}
            className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-sm font-medium border-b-2 transition-all -mb-px
              ${activeTab === 'library'
                ? 'text-amber-500 border-amber-500 bg-gradient-to-b from-amber-500/10 to-transparent'
                : 'text-slate-500 border-transparent hover:text-slate-300 hover:border-white/10'
              }`}
          >
            <span>📚</span>
            <span>My Library</span>
          </button>
          
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-sm font-medium border-b-2 transition-all -mb-px
              ${activeTab === 'stats'
                ? 'text-amber-500 border-amber-500 bg-gradient-to-b from-amber-500/10 to-transparent'
                : 'text-slate-500 border-transparent hover:text-slate-300 hover:border-white/10'
              }`}
          >
            <span>📈</span>
            <span>Reading Log & Stats</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'library' ? (
        <LibraryGrid />
      ) : (
        <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar flex flex-col gap-6">
          <StatsBar />
          <Heatmap />
          <SessionLog />
        </div>
      )}
    </div>
  );
}
