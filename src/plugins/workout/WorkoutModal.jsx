import React, { useState } from 'react';
import { format } from 'date-fns';
import { Dumbbell, Plus, X, Loader2, Check, Bookmark } from 'lucide-react';
import Modal, { btn } from '../../components/ui/Modal';
import { useWorkoutStore, WORKOUT_TYPES, FEELINGS } from './workoutStore';

// Row keys for the form (crypto.randomUUID is unavailable over plain http on a LAN)
let rowSeq = 0;
const newKey = () => `row-${++rowSeq}`;

const blankExercise = () => ({ key: newKey(), name: '', sets: '', reps: '', weight: '', duration_minutes: '', distance_km: '' });
const toRow = (e) => ({
  key: newKey(),
  name: e.name,
  sets: e.sets ?? '', reps: e.reps ?? '', weight: e.weight != null ? Number(e.weight) : '',
  duration_minutes: e.duration_minutes ?? '', distance_km: e.distance_km != null ? Number(e.distance_km) : '',
});

function NumberCell({ label, value, onChange, step = 1, width = 'w-16' }) {
  return (
    <label className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-faint">{label}</span>
      <input
        type="number"
        min="0"
        step={step}
        inputMode="decimal"
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`${width} bg-surface-sunken rounded-xl px-2 py-1.5 text-center text-sm font-bold text-ink focus:outline-none focus:ring-2 focus:ring-accent-200`}
      />
    </label>
  );
}

export default function WorkoutModal({ session, onClose }) {
  const { saveSession, templates, getExerciseNames } = useWorkoutStore();
  const [type, setType] = useState(session?.type || 'strength');
  const [title, setTitle] = useState(session?.title || '');
  const [date, setDate] = useState(session?.date || format(new Date(), 'yyyy-MM-dd'));
  const [duration, setDuration] = useState(session?.duration_minutes ?? '');
  const [feeling, setFeeling] = useState(session?.feeling ?? null);
  const [notes, setNotes] = useState(session?.notes || '');
  const [exercises, setExercises] = useState(session?.exercises.length ? session.exercises.map(toRow) : [blankExercise()]);
  const [templateName, setTemplateName] = useState('');
  const [saveTemplate, setSaveTemplate] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const isCardio = type === 'cardio';
  const names = getExerciseNames();

  const updateExercise = (key, field, value) =>
    setExercises(list => list.map(e => (e.key === key ? { ...e, [field]: value } : e)));

  const applyTemplate = (t) => {
    setType(t.type || 'strength');
    setTitle(t.name);
    setExercises(t.exercises.length ? t.exercises.map(toRow) : [blankExercise()]);
  };

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      await saveSession({
        title, type, date,
        duration_minutes: duration === '' ? null : Number(duration),
        feeling,
        notes,
        exercises: exercises.map(({ key, ...e }) => e),
        ...(saveTemplate && templateName.trim() ? { save_as_template: templateName.trim() } : {}),
      }, session?.id);
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal
      size="lg"
      title={session ? 'Edit workout' : 'Log a workout'}
      subtitle={session ? null : 'Every rep counts 💪'}
      icon={<Dumbbell className="w-5 h-5" />}
      onClose={onClose}
      footer={<>
        {error && <p role="alert" className="mr-auto self-center text-sm font-semibold text-red-400">{error}</p>}
        <button className={btn.secondary} onClick={onClose}>Cancel</button>
        <button className={btn.primary} onClick={save} disabled={saving || (saveTemplate && !templateName.trim())}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {session ? 'Save' : 'Save workout'}
        </button>
      </>}
    >
      <div className="space-y-5">
        {!session && templates.length > 0 && (
          <div>
            <p className="text-xs font-bold text-ink-soft mb-2">Start from a template</p>
            <div className="flex flex-wrap gap-2">
              {templates.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTemplate(t)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-extrabold transition-transform hover:-translate-y-0.5"
                  style={{ background: WORKOUT_TYPES[t.type]?.tint, color: WORKOUT_TYPES[t.type]?.ink }}
                >
                  <Bookmark className="w-3.5 h-3.5" /> {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Type */}
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Workout type">
          {Object.entries(WORKOUT_TYPES).map(([key, t]) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={type === key}
              onClick={() => setType(key)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-sm font-extrabold transition-all
                ${type === key ? 'shadow-soft scale-105' : 'opacity-60 hover:opacity-100'}`}
              style={{ background: t.tint, color: t.ink }}
            >
              <span>{t.emoji}</span> {t.label}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-[1fr_auto_auto] gap-3">
          <label className="block">
            <span className="block text-xs font-bold text-ink-soft mb-1.5">Title</span>
            <input className="lifeos-input" value={title} maxLength={255} onChange={e => setTitle(e.target.value)} placeholder={`${WORKOUT_TYPES[type].label} session`} />
          </label>
          <label className="block">
            <span className="block text-xs font-bold text-ink-soft mb-1.5">Date</span>
            <input type="date" className="lifeos-input" value={date} max={format(new Date(), 'yyyy-MM-dd')} onChange={e => setDate(e.target.value)} />
          </label>
          <label className="block">
            <span className="block text-xs font-bold text-ink-soft mb-1.5">Minutes</span>
            <input type="number" min="0" className="lifeos-input w-28" value={duration} onChange={e => setDuration(e.target.value)} placeholder="45" />
          </label>
        </div>

        {/* Exercises */}
        <div>
          <p className="text-xs font-bold text-ink-soft mb-2">Exercises</p>
          <datalist id="exercise-names">{names.map(n => <option key={n} value={n} />)}</datalist>
          <div className="space-y-2">
            {exercises.map((e, i) => (
              <div key={e.key} className="flex items-end gap-2 p-2.5 rounded-2xl bg-surface-sunken/50 border border-line/50">
                <label className="flex-1 min-w-0">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-faint">Exercise {i + 1}</span>
                  <input
                    list="exercise-names"
                    value={e.name}
                    onChange={ev => updateExercise(e.key, 'name', ev.target.value)}
                    placeholder={isCardio ? 'e.g. Run' : 'e.g. Squat'}
                    className="w-full bg-transparent text-sm font-bold text-ink placeholder-ink-faint focus:outline-none py-1.5"
                  />
                </label>
                {isCardio ? (
                  <>
                    <NumberCell label="min" value={e.duration_minutes} onChange={v => updateExercise(e.key, 'duration_minutes', v)} />
                    <NumberCell label="km" value={e.distance_km} step={0.1} onChange={v => updateExercise(e.key, 'distance_km', v)} />
                  </>
                ) : (
                  <>
                    <NumberCell label="sets" value={e.sets} width="w-14" onChange={v => updateExercise(e.key, 'sets', v)} />
                    <NumberCell label="reps" value={e.reps} width="w-14" onChange={v => updateExercise(e.key, 'reps', v)} />
                    <NumberCell label="kg" value={e.weight} step={0.5} onChange={v => updateExercise(e.key, 'weight', v)} />
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setExercises(list => (list.length > 1 ? list.filter(x => x.key !== e.key) : [blankExercise()]))}
                  className="p-2 rounded-full text-ink-faint hover:text-red-400 hover:bg-red-50 transition-colors"
                  aria-label={`Remove exercise ${i + 1}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setExercises(list => [...list, blankExercise()])} className={`${btn.ghost} mt-2`}>
            <Plus className="w-4 h-4" /> Add exercise
          </button>
        </div>

        {/* Feeling */}
        <div>
          <p className="text-xs font-bold text-ink-soft mb-2">How did it feel?</p>
          <div className="flex gap-2" role="radiogroup" aria-label="How did it feel">
            {FEELINGS.map(f => (
              <button
                key={f.value}
                type="button"
                role="radio"
                aria-checked={feeling === f.value}
                aria-label={f.label}
                onClick={() => setFeeling(feeling === f.value ? null : f.value)}
                className={`flex flex-col items-center gap-0.5 w-16 py-2 rounded-2xl transition-all
                  ${feeling === f.value ? 'bg-accent-50 ring-2 ring-accent-200 scale-105' : 'hover:bg-surface-sunken opacity-60 hover:opacity-100'}`}
              >
                <span className="text-2xl">{f.emoji}</span>
                <span className="text-[10px] font-extrabold text-ink-muted">{f.label}</span>
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="block text-xs font-bold text-ink-soft mb-1.5">Notes</span>
          <textarea className="lifeos-input resize-none" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="New PR on squats! Knee felt fine." />
        </label>

        {!session && (
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-2xl bg-accent-50/60">
            <label className="inline-flex items-center gap-2 text-sm font-bold text-ink-soft cursor-pointer">
              <input type="checkbox" checked={saveTemplate} onChange={e => setSaveTemplate(e.target.checked)} className="w-4 h-4 accent-[rgb(var(--accent-400))]" />
              Save as template
            </label>
            {saveTemplate && (
              <input
                autoFocus
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                placeholder="e.g. Leg day"
                aria-label="Template name"
                className="lifeos-input flex-1 min-w-[160px] py-1.5"
              />
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
