import React, { useState, useEffect } from 'react';
import { useMediaStore, MEDIA_TYPE } from './mediaStore';
import MediaSearch from './MediaSearch';
import StatsBar from './StatsBar';
import KanbanBoard from './KanbanBoard';

const TABS = [
  { id: MEDIA_TYPE.MOVIE, label: 'Movies', icon: '🎬' },
  { id: MEDIA_TYPE.SERIES, label: 'Series', icon: '📺' },
  { id: MEDIA_TYPE.ANIME, label: 'Anime', icon: '🌸' },
];

export default function MediaTrackerPlugin() {
  const [activeTab, setActiveTab] = useState(MEDIA_TYPE.MOVIE);
  const { fetchData, isLoaded } = useMediaStore();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!isLoaded) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-purple-400/30 border-t-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-navy-950">
      {/* Plugin Header */}
      <div className="flex-shrink-0 px-6 pt-5 pb-0 border-b border-white/5 bg-navy-900">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 font-semibold leading-tight">
              Watch Tracker
            </h1>
            <p className="text-slate-500 text-xs mt-1">
              Movies, Series & Anime
            </p>
          </div>
          <MediaSearch currentType={activeTab} />
        </div>

        {/* Main tabs */}
        <div className="flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-sm font-medium border-b-2 transition-all -mb-px
                ${activeTab === tab.id
                  ? 'text-purple-400 border-purple-400 bg-gradient-to-b from-purple-400/10 to-transparent'
                  : 'text-slate-500 border-transparent hover:text-slate-300 hover:border-white/10'
                }`}
            >
              <span className="text-base">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden pt-4 pb-2">
        <StatsBar currentType={activeTab} />
        <KanbanBoard type={activeTab} />
      </div>
    </div>
  );
}
