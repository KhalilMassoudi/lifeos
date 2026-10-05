import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useMealStore } from '../mealStore';
import AddFoodModal from './AddFoodModal';

const MEAL_CONFIG = {
  breakfast: { label: 'Breakfast', emoji: '🌅', border: 'border-amber-500/20',   bg: 'from-amber-500/10  to-orange-500/5'  },
  lunch:     { label: 'Lunch',     emoji: '☀️', border: 'border-yellow-500/20',  bg: 'from-yellow-500/10 to-amber-500/5'   },
  dinner:    { label: 'Dinner',    emoji: '🌙', border: 'border-indigo-500/20',  bg: 'from-indigo-500/10 to-purple-500/5'  },
  snack:     { label: 'Snack',     emoji: '🍎', border: 'border-green-500/20',   bg: 'from-green-500/10  to-emerald-500/5' },
};

export default function MealSection({ mealType }) {
  const { meals, getMealTotals, deleteEntry, findOrCreateMeal } = useMealStore();
  const [showModal,     setShowModal]     = useState(false);
  const [activeMealId,  setActiveMealId]  = useState(null);
  const [collapsed,     setCollapsed]     = useState(false);
  const [loading,       setLoading]       = useState(false);

  const cfg      = MEAL_CONFIG[mealType];
  const meal     = meals.find(m => m.meal_type === mealType);
  const entries  = meal?.entries || [];
  const totals   = meal ? getMealTotals(meal.id) : { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  const hasData  = entries.length > 0;

  const handleAddFood = async () => {
    setLoading(true);
    const m = await findOrCreateMeal(mealType);
    setLoading(false);
    if (m) {
      setActiveMealId(m.id);
      setShowModal(true);
    }
  };

  return (
    <>
      <div className={`mx-6 mb-3 rounded-2xl border ${cfg.border} bg-gradient-to-br ${cfg.bg} overflow-hidden`}>
        {/* Section header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-lg leading-none">{cfg.emoji}</span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white">{cfg.label}</h3>
              {hasData && (
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                  {totals.calories} kcal · {totals.protein_g}g P · {totals.carbs_g}g C · {totals.fat_g}g F
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleAddFood}
              disabled={loading}
              className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white text-xs px-2.5 py-1.5 rounded-lg transition-all active:scale-95 disabled:opacity-50"
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
            {hasData && (
              <button
                onClick={() => setCollapsed(v => !v)}
                className="text-slate-400 hover:text-white transition-colors p-1"
              >
                {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Entries */}
        {!collapsed && hasData && (
          <div className="px-4 pb-3 space-y-1.5">
            {entries.map(entry => (
              <EntryRow
                key={entry.id}
                entry={entry}
                mealId={meal.id}
                onDelete={deleteEntry}
              />
            ))}
          </div>
        )}

        {!hasData && (
          <p className="px-4 pb-3 text-[11px] text-slate-600 italic">Nothing logged yet</p>
        )}
      </div>

      {showModal && activeMealId && (
        <AddFoodModal
          mealId={activeMealId}
          mealType={mealType}
          onClose={() => { setShowModal(false); setActiveMealId(null); }}
        />
      )}
    </>
  );
}

function EntryRow({ entry, mealId, onDelete }) {
  return (
    <div className="flex items-center gap-2 bg-surface/80 hover:bg-surface shadow-soft rounded-xl px-3 py-2 group transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white truncate">{entry.food_name}</p>
        <p className="text-[10px] text-slate-400">
          {parseFloat(entry.quantity_g).toFixed(0)}g · {Math.round(parseFloat(entry.calories) || 0)} kcal
        </p>
      </div>
      <div className="hidden group-hover:flex items-center gap-2 text-[10px] shrink-0">
        <span className="text-blue-400">{parseFloat(entry.protein_g || 0).toFixed(1)}g P</span>
        <span className="text-green-400">{parseFloat(entry.carbs_g  || 0).toFixed(1)}g C</span>
        <span className="text-purple-400">{parseFloat(entry.fat_g   || 0).toFixed(1)}g F</span>
      </div>
      <button
        onClick={() => onDelete(entry.id, mealId)}
        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all ml-1 shrink-0"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
