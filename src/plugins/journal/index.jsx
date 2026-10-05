import React, { useState } from 'react';
import { BookHeart, StickyNote, Mail } from 'lucide-react';
import JournalView from './JournalView';
import NotesBoard from './NotesBoard';
import LoveWall from './LoveWall';

const TABS = [
  { id: 'journal', label: 'Journal', Icon: BookHeart },
  { id: 'notes', label: 'Notes', Icon: StickyNote },
  { id: 'love', label: 'Love notes', Icon: Mail },
];

export default function JournalPlugin() {
  const [tab, setTab] = useState('journal');

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <header className="flex-shrink-0 px-6 pt-5 pb-4 flex flex-wrap items-end justify-between gap-4 border-b border-line/70 bg-navy-900">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink leading-tight">
            Notes & <span className="gold-text italic">Journal</span>
          </h1>
          <p className="text-ink-muted text-sm mt-0.5">Your thoughts, little notes, and letters to each other</p>
        </div>
        <nav className="flex gap-1 p-1 rounded-2xl bg-surface-sunken" role="tablist" aria-label="Journal sections">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-extrabold transition-all
                ${tab === id ? 'bg-surface text-ink shadow-soft' : 'text-ink-muted hover:text-ink'}`}
            >
              <Icon className={`w-4 h-4 ${tab === id ? 'text-accent-400' : ''}`} /> {label}
            </button>
          ))}
        </nav>
      </header>

      <div className="flex-1 min-h-0">
        {tab === 'journal' && <JournalView />}
        {tab === 'notes' && <NotesBoard />}
        {tab === 'love' && <LoveWall />}
      </div>
    </div>
  );
}
