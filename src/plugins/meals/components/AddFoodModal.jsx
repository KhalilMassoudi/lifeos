import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Plus, Loader2, Scale, ChevronRight } from 'lucide-react';
import { api } from '../../../utils/api';
import { useMealStore } from '../mealStore';

const MEAL_LABELS = { breakfast: 'Breakfast 🌅', lunch: 'Lunch ☀️', dinner: 'Dinner 🌙', snack: 'Snack 🍎' };

const MACRO_COLORS = {
  calories: 'text-amber-400',
  protein:  'text-blue-400',
  carbs:    'text-green-400',
  fat:      'text-purple-400',
};

function calcNutrient(per100, qty) {
  return Math.round((parseFloat(per100) || 0) * (parseFloat(qty) || 100) / 100 * 10) / 10;
}

export default function AddFoodModal({ mealId, mealType, onClose }) {
  const { addEntry } = useMealStore();

  // tabs
  const [mode, setMode] = useState('search'); // 'search' | 'manual'

  // search state
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [quantity, setQuantity] = useState('100');
  const debounceRef = useRef(null);

  // manual state
  const [manual, setManual] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '', fiber: '' });

  // submission
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await api.get(`/meals/search?q=${encodeURIComponent(query.trim())}`);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const qty = parseFloat(quantity) || 100;

  const canAdd = adding ? false
    : mode === 'search' ? !!selected
    : !!manual.name.trim();

  const handleAdd = async () => {
    if (!canAdd) return;
    setAdding(true);
    try {
      if (mode === 'manual') {
        await addEntry(mealId, {
          food_name:         manual.name.trim() || 'Custom food',
          calories_per_100g: parseFloat(manual.calories) || 0,
          protein_per_100g:  parseFloat(manual.protein)  || 0,
          carbs_per_100g:    parseFloat(manual.carbs)    || 0,
          fat_per_100g:      parseFloat(manual.fat)      || 0,
          fiber_per_100g:    parseFloat(manual.fiber)    || 0,
        }, qty);
      } else {
        const label = selected.brand
          ? `${selected.name} (${selected.brand})`
          : selected.name;
        await addEntry(mealId, {
          food_name:         label,
          calories_per_100g: selected.calories_per_100g,
          protein_per_100g:  selected.protein_per_100g,
          carbs_per_100g:    selected.carbs_per_100g,
          fat_per_100g:      selected.fat_per_100g,
          fiber_per_100g:    selected.fiber_per_100g,
        }, qty);
      }
      onClose();
    } catch {
      setAdding(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-navy-900 border border-white/10 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h3 className="font-display text-sm text-white">
            Add to {MEAL_LABELS[mealType]}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 flex border-b border-white/5">
          {[{ id: 'search', label: 'Search Database' }, { id: 'manual', label: 'Add Manually' }].map(tab => (
            <button
              key={tab.id}
              onClick={() => setMode(tab.id)}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                mode === tab.id
                  ? 'text-green-400 border-green-400'
                  : 'text-slate-400 border-transparent hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {mode === 'search' ? (
            <div className="p-4 space-y-3">
              {/* Search input */}
              <div className="relative">
                {searching
                  ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400 animate-spin" />
                  : <Search   className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                }
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={e => { setQuery(e.target.value); setSelected(null); }}
                  placeholder="e.g. chicken breast, oatmeal, banana…"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-green-500/60 focus:ring-1 focus:ring-green-500/20"
                />
              </div>

              {/* Results list */}
              {!selected && results.length > 0 && (
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {results.map(food => (
                    <button
                      key={food.id}
                      onClick={() => setSelected(food)}
                      className="w-full text-left bg-white/5 hover:bg-green-500/10 border border-white/5 hover:border-green-500/30 rounded-xl px-3 py-2.5 transition-all flex items-center gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{food.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {food.brand && <span className="text-[9px] text-slate-500 truncate">{food.brand} ·</span>}
                          <span className="text-[9px] text-slate-500">{food.source}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-amber-400">{parseFloat(food.calories_per_100g).toFixed(0)}</p>
                        <p className="text-[9px] text-slate-500">kcal/100g</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {/* No results hint */}
              {query.length >= 2 && !searching && results.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-4">
                  No results for "{query}" — try the Manual tab
                </p>
              )}

              {/* Selected food card */}
              {selected && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white leading-tight">{selected.name}</p>
                      {selected.brand && <p className="text-[10px] text-slate-400 mt-0.5">{selected.brand}</p>}
                    </div>
                    <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quantity */}
                  <div className="flex items-center gap-2">
                    <Scale className="w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="number"
                      value={quantity}
                      onChange={e => setQuantity(e.target.value)}
                      min="1" max="5000"
                      className="w-20 bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:border-green-400"
                    />
                    <span className="text-xs text-slate-400">grams</span>
                  </div>

                  {/* Calculated macros */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Calories', val: calcNutrient(selected.calories_per_100g, qty), unit: 'kcal', cls: 'text-amber-400' },
                      { label: 'Protein',  val: calcNutrient(selected.protein_per_100g,  qty), unit: 'g',    cls: 'text-blue-400'  },
                      { label: 'Carbs',    val: calcNutrient(selected.carbs_per_100g,    qty), unit: 'g',    cls: 'text-green-400' },
                      { label: 'Fat',      val: calcNutrient(selected.fat_per_100g,      qty), unit: 'g',    cls: 'text-purple-400'},
                    ].map(({ label, val, unit, cls }) => (
                      <div key={label} className="bg-black/30 rounded-lg p-2 text-center">
                        <p className={`text-xs font-bold ${cls}`}>{val}{unit}</p>
                        <p className="text-[9px] text-slate-500 mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Manual entry */
            <div className="p-4 space-y-3">
              <input
                autoFocus
                type="text"
                placeholder="Food name *"
                value={manual.name}
                onChange={e => setManual(p => ({ ...p, name: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-green-500/60"
              />
              <p className="text-[10px] text-slate-500">Values per 100 g</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'calories', label: 'Calories', unit: 'kcal', cls: 'text-amber-400' },
                  { key: 'protein',  label: 'Protein',  unit: 'g',    cls: 'text-blue-400'  },
                  { key: 'carbs',    label: 'Carbs',    unit: 'g',    cls: 'text-green-400' },
                  { key: 'fat',      label: 'Fat',      unit: 'g',    cls: 'text-purple-400'},
                  { key: 'fiber',    label: 'Fiber',    unit: 'g',    cls: 'text-cyan-400'  },
                ].map(({ key, label, unit, cls }) => (
                  <div key={key}>
                    <label className={`text-[10px] ${cls} mb-1 block`}>{label} ({unit})</label>
                    <input
                      type="number" min="0" step="0.1"
                      value={manual[key]}
                      onChange={e => setManual(p => ({ ...p, [key]: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 text-sm text-white focus:outline-none focus:border-green-500/60"
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Scale className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="number" value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  className="w-20 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white text-center focus:outline-none focus:border-green-400"
                />
                <span className="text-xs text-slate-400">grams to log</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 py-4 border-t border-white/5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-sm transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!canAdd}
            className="flex-1 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {adding
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Plus    className="w-4 h-4" />
            }
            Add Food
          </button>
        </div>
      </div>
    </div>
  );
}
