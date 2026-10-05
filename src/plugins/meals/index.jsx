import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Target, UtensilsCrossed, BarChart3 } from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';
import { useMealStore } from './mealStore';
import MacroRings   from './components/MacroRings';
import MealSection  from './components/MealSection';
import WaterTracker from './components/WaterTracker';
import WeeklyStats  from './components/WeeklyStats';
import GoalsModal   from './components/GoalsModal';

export default function MealTrackerPlugin() {
  const {
    fetchData, currentDate, prevDay, nextDay, goToday,
    getDayTotals, goals, isLoaded,
  } = useMealStore();

  const [tab,       setTab]       = useState('today');
  const [showGoals, setShowGoals] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const totals = getDayTotals();
  const isCurrentToday = isToday(parseISO(currentDate));
  const dateLabel = isCurrentToday
    ? 'Today'
    : format(parseISO(currentDate), 'EEE, MMM d');

  // Smart insight text
  const remCal  = Math.max(0, (goals.calories  || 0) - totals.calories);
  const remProt = Math.max(0, (goals.protein_g || 0) - totals.protein_g);
  const insight = totals.calories === 0
    ? null
    : totals.calories > (goals.calories || 0)
      ? `⚠️ You're ${totals.calories - goals.calories} kcal over your goal today`
      : `${remCal} kcal remaining · ${remProt.toFixed(0)}g protein left`;

  if (!isLoaded) {
    return (
      <div className="h-full flex items-center justify-center bg-navy-950">
        <div className="w-8 h-8 rounded-full border-2 border-green-500/30 border-t-green-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-navy-950">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-6 py-5 border-b border-white/5 bg-navy-900">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold leading-tight text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">
              Meal Tracker
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">Track nutrition · Hit your goals</p>
          </div>
          <button
            onClick={() => setShowGoals(true)}
            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white px-3 py-2 rounded-xl text-xs transition-all"
          >
            <Target className="w-3.5 h-3.5 text-green-400" />
            Goals
          </button>
        </div>

        {/* Date navigation */}
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={prevDay}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToday}
            className={`flex-1 text-center text-sm font-medium py-1 rounded-lg transition-colors ${
              isCurrentToday
                ? 'text-green-400'
                : 'text-slate-300 hover:text-green-400'
            }`}
          >
            {dateLabel}
          </button>
          <button
            onClick={nextDay}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* View tabs */}
        <div className="flex mt-4 gap-1 bg-white/5 p-1 rounded-xl">
          {[
            { id: 'today', Icon: UtensilsCrossed, label: 'Today'      },
            { id: 'week',  Icon: BarChart3,       label: 'Week Stats' },
          ].map(({ id, Icon, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                tab === id
                  ? 'bg-surface text-ink shadow-soft'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pt-4 pb-8">
        {tab === 'today' ? (
          <>
            {/* Macro progress rings */}
            <MacroRings totals={totals} goals={goals} />

            {/* Smart daily insight */}
            {insight && (
              <div className={`mx-6 mb-3 px-3 py-2 rounded-xl text-xs border ${
                totals.calories > goals.calories
                  ? 'bg-red-500/10 border-red-500/20 text-red-300'
                  : 'bg-green-500/10 border-green-500/20 text-slate-300'
              }`}>
                {insight}
              </div>
            )}

            {/* Water tracker */}
            <WaterTracker />

            {/* Four meal sections */}
            {['breakfast', 'lunch', 'dinner', 'snack'].map(type => (
              <MealSection key={type} mealType={type} />
            ))}
          </>
        ) : (
          <WeeklyStats />
        )}
      </div>

      {showGoals && <GoalsModal onClose={() => setShowGoals(false)} />}
    </div>
  );
}