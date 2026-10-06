import React, { useState } from 'react';
import { ClipboardList, Plus, X, Loader2, Check, ChevronUp, ChevronDown } from 'lucide-react';
import Modal, { btn } from '../../components/ui/Modal';
import { useWorkoutStore, WORKOUT_TYPES } from './workoutStore';

const WEEKDAY_OPTIONS = [['', 'Any day'], [1, 'Monday'], [2, 'Tuesday'], [3, 'Wednesday'], [4, 'Thursday'], [5, 'Friday'], [6, 'Saturday'], [0, 'Sunday']];

let seq = 0;
const key = () => `k${++seq}`;
const blankExercise = () => ({ key: key(), name: '', sets: '', reps: '', weight: '', duration_minutes: '', distance_km: '' });
const blankDay = (n) => ({ key: key(), id: null, label: `Day ${n}`, weekday: '', type: 'strength', notes: '', exercises: [blankExercise()] });
const fromDay = (d) => ({
  key: key(), id: d.id || null, label: d.label, weekday: d.weekday ?? '', type: d.type || 'strength', notes: d.notes || '',
  exercises: d.exercises?.length
    ? d.exercises.map(e => ({ key: key(), name: e.name, sets: e.sets ?? '', reps: e.reps ?? '', weight: e.weight ?? '', duration_minutes: e.duration_minutes ?? '', distance_km: e.distance_km ?? '' }))
    : [blankExercise()],
});

function Cell({ label, value, onChange, step = 1 }) {
  return (
    <input
      type="number" min="0" step={step} value={value} placeholder={label} aria-label={label}
      onChange={e => onChange(e.target.value)}
      className="w-16 bg-surface rounded-xl px-2 py-1.5 text-center text-sm font-bold text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-accent-200"
    />
  );
}

// `program` may be an existing program, a draft (from an import, without id), or null
export default function ProgramModal({ program, onClose, onSaved }) {
  const { saveProgram, sports } = useWorkoutStore();
  const [name, setName] = useState(program?.name || '');
  const [sportId, setSportId] = useState(program?.sport_id || null);
  const [description, setDescription] = useState(program?.description || '');
  const [days, setDays] = useState(program?.days?.length ? program.days.map(fromDay) : [blankDay(1)]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const updateDay = (k, patch) => setDays(list => list.map(d => (d.key === k ? { ...d, ...patch } : d)));
  const updateExercise = (dayKey, exKey, field, value) => setDays(list => list.map(d => (d.key !== dayKey ? d : {
    ...d, exercises: d.exercises.map(e => (e.key === exKey ? { ...e, [field]: value } : e)),
  })));
  const moveDay = (index, delta) => setDays(list => {
    const next = [...list];
    const [day] = next.splice(index, 1);
    next.splice(index + delta, 0, day);
    return next;
  });

  const save = async () => {
    setError(null);
    if (!name.trim()) return setError('Give the program a name.');
    setSaving(true);
    try {
      const saved = await saveProgram({
        name: name.trim(),
        sport_id: sportId,
        description,
        source: program?.source || 'manual',
        source_url: program?.source_url || null,
        days: days.map(({ key: _k, exercises, ...d }) => ({ ...d, exercises: exercises.map(({ key: _e, ...e }) => e) })),
      }, program?.id);
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal
      size="lg"
      title={program?.id ? 'Edit program' : 'New program'}
      subtitle="Plan the days once, start each one with a tap"
      icon={<ClipboardList className="w-5 h-5" />}
      onClose={onClose}
      footer={<>
        {error && <p role="alert" className="mr-auto self-center text-sm font-semibold text-red-400">{error}</p>}
        <button className={btn.secondary} onClick={onClose}>Cancel</button>
        <button className={btn.primary} onClick={save} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save program
        </button>
      </>}
    >
      <div className="space-y-5">
        <div className="grid sm:grid-cols-[1fr_auto] gap-3">
          <label className="block">
            <span className="block text-xs font-bold text-ink-soft mb-1.5">Program name</span>
            <input className="lifeos-input" autoFocus value={name} maxLength={255} onChange={e => setName(e.target.value)} placeholder="e.g. Push / Pull / Legs, BJJ conditioning" />
          </label>
          <label className="block">
            <span className="block text-xs font-bold text-ink-soft mb-1.5">Sport</span>
            <select className="lifeos-input" value={sportId || ''} onChange={e => setSportId(e.target.value || null)}>
              <option value="">No sport</option>
              {sports.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>)}
            </select>
          </label>
        </div>
        <label className="block">
          <span className="block text-xs font-bold text-ink-soft mb-1.5">Description</span>
          <textarea className="lifeos-input resize-none" rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Goal, how many weeks, tips…" />
        </label>

        <div className="space-y-3">
          {days.map((day, i) => {
            const cardio = day.type === 'cardio';
            return (
              <section key={day.key} className="rounded-3xl border-2 border-line/60 bg-surface-sunken/40 p-4">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <input
                    value={day.label}
                    onChange={e => updateDay(day.key, { label: e.target.value })}
                    aria-label={`Day ${i + 1} name`}
                    className="flex-1 min-w-[140px] bg-transparent font-display text-lg font-semibold text-ink focus:outline-none"
                  />
                  <select value={day.weekday} onChange={e => updateDay(day.key, { weekday: e.target.value === '' ? '' : Number(e.target.value) })} aria-label="Weekday" className="lifeos-input w-auto py-1.5 text-xs font-bold">
                    {WEEKDAY_OPTIONS.map(([v, l]) => <option key={l} value={v}>{l}</option>)}
                  </select>
                  <select value={day.type} onChange={e => updateDay(day.key, { type: e.target.value })} aria-label="Type" className="lifeos-input w-auto py-1.5 text-xs font-bold">
                    {Object.entries(WORKOUT_TYPES).map(([k, t]) => <option key={k} value={k}>{t.emoji} {t.label}</option>)}
                  </select>
                  <div className="flex">
                    <button type="button" disabled={i === 0} onClick={() => moveDay(i, -1)} className="p-1.5 text-ink-faint hover:text-ink disabled:opacity-30" aria-label="Move day up"><ChevronUp className="w-4 h-4" /></button>
                    <button type="button" disabled={i === days.length - 1} onClick={() => moveDay(i, 1)} className="p-1.5 text-ink-faint hover:text-ink disabled:opacity-30" aria-label="Move day down"><ChevronDown className="w-4 h-4" /></button>
                    <button type="button" disabled={days.length === 1} onClick={() => setDays(list => list.filter(d => d.key !== day.key))} className="p-1.5 text-ink-faint hover:text-red-400 disabled:opacity-30" aria-label="Remove day"><X className="w-4 h-4" /></button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {day.exercises.map(ex => (
                    <div key={ex.key} className="flex items-center gap-1.5">
                      <input
                        value={ex.name}
                        onChange={e => updateExercise(day.key, ex.key, 'name', e.target.value)}
                        placeholder={cardio ? 'e.g. Easy run' : 'e.g. Squat'}
                        aria-label="Exercise"
                        className="flex-1 min-w-0 bg-surface rounded-xl px-3 py-1.5 text-sm font-bold text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-accent-200"
                      />
                      {cardio ? (
                        <>
                          <Cell label="min" value={ex.duration_minutes} onChange={v => updateExercise(day.key, ex.key, 'duration_minutes', v)} />
                          <Cell label="km" step={0.1} value={ex.distance_km} onChange={v => updateExercise(day.key, ex.key, 'distance_km', v)} />
                        </>
                      ) : (
                        <>
                          <Cell label="sets" value={ex.sets} onChange={v => updateExercise(day.key, ex.key, 'sets', v)} />
                          <Cell label="reps" value={ex.reps} onChange={v => updateExercise(day.key, ex.key, 'reps', v)} />
                          <Cell label="kg" step={0.5} value={ex.weight} onChange={v => updateExercise(day.key, ex.key, 'weight', v)} />
                        </>
                      )}
                      <button type="button" onClick={() => updateDay(day.key, { exercises: day.exercises.length > 1 ? day.exercises.filter(e => e.key !== ex.key) : [blankExercise()] })} className="p-1.5 text-ink-faint hover:text-red-400" aria-label="Remove exercise">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <button type="button" onClick={() => updateDay(day.key, { exercises: [...day.exercises, blankExercise()] })} className={btn.ghost}>
                    <Plus className="w-3.5 h-3.5" /> Exercise
                  </button>
                  <input
                    value={day.notes}
                    onChange={e => updateDay(day.key, { notes: e.target.value })}
                    placeholder="Notes for this day (optional)"
                    aria-label="Day notes"
                    className="flex-1 bg-transparent text-xs text-ink-soft placeholder-ink-faint focus:outline-none"
                  />
                </div>
              </section>
            );
          })}
        </div>
        <button type="button" onClick={() => setDays(list => [...list, blankDay(list.length + 1)])} className={`${btn.secondary} w-full border-2 border-dashed border-line bg-transparent`}>
          <Plus className="w-4 h-4" /> Add day
        </button>
      </div>
    </Modal>
  );
}
