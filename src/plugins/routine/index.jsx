import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useRoutineStore } from './routineStore';
import Timeline from './Timeline';
import TasksList from './TasksList';
import AddBlockModal from './AddBlockModal';

export default function RoutineTrackerPlugin() {
  const { fetchData, isLoaded } = useRoutineStore();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!isLoaded) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex overflow-hidden bg-navy-950 relative">
      
      {/* Main Timeline Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Plugin Header */}
        <div className="flex-shrink-0 px-6 py-5 border-b border-white/5 bg-navy-900 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500 font-semibold leading-tight flex items-center gap-2">
              Daily Routine
            </h1>
            <p className="text-slate-500 text-xs mt-1">
              Structure your day, conquer your goals.
            </p>
          </div>
          
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Block</span>
          </button>
        </div>

        <div className="flex-1 pt-6 pb-4 overflow-hidden flex flex-col">
          <Timeline />
        </div>
      </div>

      {/* Right Sidebar: One-off Tasks */}
      <TasksList />

      {showModal && <AddBlockModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
