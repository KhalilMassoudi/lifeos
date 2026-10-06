import React, { useEffect, useState } from 'react';
import { Plus, Loader2, LayoutDashboard, ClipboardList } from 'lucide-react';
import { useWorkoutStore } from './workoutStore';
import { btn } from '../../components/ui/Modal';
import Overview from './Overview';
import ProgramsView from './ProgramsView';
import BjjView from './bjj/BjjView';
import WorkoutModal from './WorkoutModal';

export default function WorkoutPlugin() {
  const { fetchData, isLoaded, hasBjj } = useWorkoutStore();
  const [tab, setTab] = useState('overview');
  const [modal, setModal] = useState(null); // null | { session } | { initial }

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!isLoaded) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-7 h-7 text-accent-400 animate-spin" /></div>;
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'programs', label: 'Programs', icon: <ClipboardList className="w-4 h-4" /> },
    ...(hasBjj() ? [{ id: 'bjj', label: 'BJJ', icon: <span className="text-base leading-none">🥋</span> }] : []),
  ];
  const activeTab = tabs.some(t => t.id === tab) ? tab : 'overview';

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <header className="flex-shrink-0 px-6 pt-5 pb-4 flex flex-wrap items-center justify-between gap-4 border-b border-line/70 bg-navy-900">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink leading-tight">
            Workout <span className="gold-text italic">Logger</span>
          </h1>
          <p className="text-ink-muted text-sm mt-0.5">Move a little every day — and watch it add up</p>
        </div>
        <div className="flex items-center gap-3">
          <nav className="flex gap-1 p-1 rounded-2xl bg-surface-sunken" role="tablist" aria-label="Workout sections">
            {tabs.map(t => (
              <button
                key={t.id}
                role="tab"
                aria-selected={activeTab === t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-extrabold transition-all
                  ${activeTab === t.id ? 'bg-surface text-ink shadow-soft' : 'text-ink-muted hover:text-ink'}`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </nav>
          {activeTab !== 'bjj' && (
            <button className={btn.primary} onClick={() => setModal({})}>
              <Plus className="w-4 h-4" /> Log workout
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 min-h-0">
        {activeTab === 'overview' && (
          <div className="h-full overflow-y-auto">
            <Overview onLog={() => setModal({})} onEdit={(session) => setModal({ session })} />
          </div>
        )}
        {activeTab === 'programs' && <ProgramsView onStartDay={(initial) => setModal({ initial })} />}
        {activeTab === 'bjj' && <BjjView />}
      </div>

      {modal && <WorkoutModal session={modal.session} initial={modal.initial} onClose={() => setModal(null)} />}
    </div>
  );
}
