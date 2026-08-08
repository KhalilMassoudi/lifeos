import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useHabitStore } from './habitStore';
import HabitList from './HabitList';
import HabitStats from './HabitStats';
import AddHabitModal from './AddHabitModal';

export default function HabitTrackerPlugin() {
  const { fetchData, isLoaded } = useHabitStore();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!isLoaded) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-cyan-500/30 border-t-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-navy-950 relative">
      {/* Plugin Header */}
      <div className="flex-shrink-0 px-6 py-5 border-b border-white/5 bg-navy-900 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 font-semibold leading-tight flex items-center gap-2">
            Habit Tracker
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Build consistency, one day at a time.
          </p>
        </div>
        
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-lg shadow-cyan-900/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Habit</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden pt-4 pb-2">
        <HabitStats />
        <HabitList />
      </div>

      {showModal && <AddHabitModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
