import React, { useState } from 'react';
import { X, Target, Loader2 } from 'lucide-react';
import { useMealStore } from '../mealStore';

const FIELDS = [
  { key: 'calories',  label: 'Daily Calories',  unit: 'kcal', icon: '🔥', cls: 'text-amber-400',  min: 500,  max: 6000 },
  { key: 'protein_g', label: 'Protein',          unit: 'g',    icon: '💪', cls: 'text-blue-400',   min: 10,   max: 400  },
  { key: 'carbs_g',   label: 'Carbohydrates',    unit: 'g',    icon: '🌾', cls: 'text-green-400',  min: 20,   max: 700  },
  { key: 'fat_g',     label: 'Fat',              unit: 'g',    icon: '🥑', cls: 'text-purple-400', min: 10,   max: 250  },
  { key: 'fiber_g',   label: 'Fiber',            unit: 'g',    icon: '🥦', cls: 'text-cyan-400',   min: 5,    max: 100  },
  { key: 'water_ml',  label: 'Water',            unit: 'ml',   icon: '💧', cls: 'text-sky-400',    min: 500,  max: 6000 },
];

export default function GoalsModal({ onClose }) {
  const { goals, saveGoals } = useMealStore();
  const [form,   setForm]   = useState({ ...goals });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await saveGoals({
      calories:  parseInt(form.calories)  || 2000,
      protein_g: parseFloat(form.protein_g) || 150,
      carbs_g:   parseFloat(form.carbs_g)   || 250,
      fat_g:     parseFloat(form.fat_g)     || 65,
      fiber_g:   parseFloat(form.fiber_g)   || 30,
      water_ml:  parseInt(form.water_ml)  || 2000,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/25 backdrop-blur-[3px] z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-navy-900 border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-green-400" />
            <h3 className="font-display text-base text-white">Daily Goals</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Fields */}
        <div className="p-5 space-y-3">
          {FIELDS.map(({ key, label, unit, icon, cls, min, max }) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-lg w-7 text-center leading-none">{icon}</span>
              <div className="flex-1">
                <label className={`text-[10px] ${cls} block mb-1`}>{label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={min} max={max} step={key === 'protein_g' || key === 'carbs_g' || key === 'fat_g' || key === 'fiber_g' ? '0.5' : '1'}
                    value={form[key]}
                    onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500/60"
                  />
                  <span className="text-xs text-slate-500 w-9 shrink-0">{unit}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-sm transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving…' : 'Save Goals'}
          </button>
        </div>
      </div>
    </div>
  );
}