import React, { useState } from 'react';
import SalahTracker from './SalahTracker';
import QuranTracker from './QuranTracker';

const TABS = [
  { id: 'salah', label: 'Salah', arabic: 'الصلاة', icon: '🕌', desc: 'Daily Prayer Tracker' },
  { id: 'quran', label: 'Quran', arabic: 'القرآن', icon: '📖', desc: 'Learning & Memorization' },
];

export default function SalahQuranPlugin() {
  const [activeTab, setActiveTab] = useState('salah');

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Plugin Header */}
      <div className="flex-shrink-0 px-6 pt-5 pb-0 border-b border-white/5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl gold-text font-semibold leading-tight">
              Salah & Quran
            </h1>
            <p className="text-slate-500 text-xs mt-1 font-arabic">
              الصلاة والقرآن الكريم
            </p>
          </div>
          <div className="text-right text-xs text-slate-600">
            <div className="font-arabic text-base text-gold-400/40">﷽</div>
          </div>
        </div>

        {/* Main tabs */}
        <div className="flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              id={`plugin-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-sm font-medium border-b-2 transition-all -mb-px
                ${activeTab === tab.id
                  ? 'text-gold-400 border-gold-400 bg-gradient-to-b from-gold-400/8 to-transparent'
                  : 'text-slate-500 border-transparent hover:text-slate-300 hover:border-white/10'
                }`}
            >
              <span className="text-base">{tab.icon}</span>
              <div className="text-left">
                <div className="leading-tight">{tab.label}</div>
                <div className={`text-xs font-arabic leading-tight mt-0.5 ${activeTab === tab.id ? 'text-gold-400/60' : 'text-slate-600'}`}>
                  {tab.arabic}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'salah' && <SalahTracker />}
        {activeTab === 'quran' && <QuranTracker />}
      </div>
    </div>
  );
}
