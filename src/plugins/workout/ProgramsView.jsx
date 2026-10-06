import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Plus, Play, Pencil, Trash2, X, Loader2, Instagram } from 'lucide-react';
import { useWorkoutStore, WORKOUT_TYPES } from './workoutStore';
import { useToastStore } from '../../store/toastStore';
import { btn } from '../../components/ui/Modal';
import ProgramModal from './ProgramModal';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SPORT_EMOJIS = ['🏋️', '🏃', '⚽', '🏊', '🧘', '🥋', '🥊', '🚴', '🎾', '🏀', '🧗', '⛹️', '🤸', '🏐'];

// The day to do next: the one after the most recently done day (cycling), else the first
export function nextDayIndex(program) {
  let lastIndex = -1;
  let lastDate = '';
  program.days.forEach((d, i) => {
    if (d.last_done && d.last_done >= lastDate) { lastDate = d.last_done; lastIndex = i; }
  });
  return lastIndex === -1 ? 0 : (lastIndex + 1) % program.days.length;
}

function SportsBar() {
  const { sports, addSport, deleteSport } = useWorkoutStore();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🥋');
  const [busy, setBusy] = useState(false);
  const hasBjj = sports.some(s => s.kind === 'bjj');

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const sport = await addSport(name.trim(), emoji);
      if (sport.kind === 'bjj') useToastStore.getState().addToast('🥋 Your BJJ space is unlocked — see the BJJ tab!', 'success');
      setName(''); setAdding(false);
    } catch { /* toast shown */ }
    setBusy(false);
  };

  return (
    <div className="glass-card p-4 mb-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-ink-faint mr-1">Your sports</span>
        {sports.map(s => (
          <span key={s.id} className="group inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-2xl bg-surface-sunken text-sm font-bold text-ink">
            {s.emoji} {s.name}
            <button
              onClick={() => { if (window.confirm(`Remove ${s.name}? Its workouts and programs are kept, just untagged.`)) deleteSport(s.id); }}
              className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-ink-faint hover:text-red-400 transition-opacity"
              aria-label={`Remove ${s.name}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        ))}
        {!adding && (
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-2xl border-2 border-dashed border-line text-sm font-bold text-ink-muted hover:text-ink hover:border-accent-300">
            <Plus className="w-3.5 h-3.5" /> Add sport
          </button>
        )}
      </div>
      {adding && (
        <form onSubmit={add} className="flex flex-wrap items-center gap-2 mt-3 animate-fade-in">
          <select value={emoji} onChange={e => setEmoji(e.target.value)} aria-label="Sport icon" className="lifeos-input w-20 py-2 text-lg">
            {SPORT_EMOJIS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <input autoFocus value={name} onChange={e => setName(e.target.value)} maxLength={100} placeholder="e.g. BJJ, Boxing, Tennis" aria-label="Sport name" className="lifeos-input flex-1 min-w-[180px] py-2" />
          <button type="button" className={btn.ghost} onClick={() => setAdding(false)}>Cancel</button>
          <button type="submit" className={btn.primary} disabled={!name.trim() || busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
          </button>
        </form>
      )}
      {!hasBjj && (
        <p className="text-xs text-ink-muted mt-3">💡 Add <b>BJJ</b> (or Jiu-Jitsu) to unlock a BJJ space with a technique library, session journal and your gym's timetable.</p>
      )}
    </div>
  );
}

function ProgramCard({ program, onStartDay, onEdit }) {
  const { deleteProgram } = useWorkoutStore();
  const next = nextDayIndex(program);

  return (
    <article className="glass-card p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-12 h-12 rounded-2xl bg-accent-50 flex items-center justify-center text-2xl flex-shrink-0">{program.sport?.emoji || '📋'}</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-xl font-semibold text-ink truncate">{program.name}</h3>
          <p className="text-xs text-ink-muted font-semibold flex flex-wrap items-center gap-x-2">
            {program.sport && <span>{program.sport.name}</span>}
            <span>{program.days.length} day{program.days.length !== 1 ? 's' : ''}</span>
            {program.source === 'instagram' && <span className="inline-flex items-center gap-1 text-pink-400"><Instagram className="w-3 h-3" /> from Instagram</span>}
          </p>
          {program.description && <p className="text-sm text-ink-soft mt-1.5 line-clamp-2">{program.description}</p>}
        </div>
        <button onClick={() => onEdit(program)} className={btn.ghost} aria-label={`Edit ${program.name}`}><Pencil className="w-4 h-4" /></button>
        <button onClick={() => { if (window.confirm(`Delete the program "${program.name}"? Workouts you already logged stay.`)) deleteProgram(program.id); }} className="p-2 rounded-xl text-red-400 hover:bg-red-50" aria-label={`Delete ${program.name}`}>
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-2.5">
        {program.days.map((day, i) => {
          const t = WORKOUT_TYPES[day.type] || WORKOUT_TYPES.other;
          const isNext = i === next;
          return (
            <div key={day.id} className={`rounded-2xl p-3.5 border-2 transition-colors ${isNext ? 'border-accent-200 bg-accent-50/50' : 'border-transparent bg-surface-sunken/60'}`}>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0" style={{ background: t.tint }}>{t.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-extrabold text-ink truncate">
                    {day.label}
                    {day.weekday != null && <span className="text-ink-faint font-bold"> · {WEEKDAYS[day.weekday]}</span>}
                  </p>
                  <p className="text-[11px] font-semibold text-ink-muted">
                    {day.last_done ? `Done ${day.times_done}× · last ${format(parseISO(day.last_done), 'MMM d')}` : 'Not done yet'}
                  </p>
                </div>
                <button
                  onClick={() => onStartDay({
                    title: `${program.name} — ${day.label}`,
                    type: day.type,
                    sport_id: program.sport_id,
                    program_day_id: day.id,
                    program_label: `${program.name} · ${day.label}`,
                    exercises: day.exercises,
                  })}
                  className={isNext ? btn.primary + ' !px-3 !py-1.5' : btn.secondary + ' !px-3 !py-1.5'}
                  aria-label={`Start ${day.label}`}
                >
                  <Play className="w-3.5 h-3.5" /> {isNext ? 'Next up' : 'Start'}
                </button>
              </div>
              {day.exercises.length > 0 && (
                <p className="text-xs text-ink-muted mt-2 line-clamp-2">
                  {day.exercises.map(e => e.name).join(' · ')}
                </p>
              )}
              {day.notes && <p className="text-xs text-ink-faint italic mt-1 line-clamp-2">{day.notes}</p>}
            </div>
          );
        })}
      </div>
    </article>
  );
}

export default function ProgramsView({ onStartDay }) {
  const { programs } = useWorkoutStore();
  const [editing, setEditing] = useState(null); // null | { program }

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <SportsBar />

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl font-semibold text-ink">Training programs</h2>
        <button className={btn.secondary} onClick={() => setEditing({ program: null })}><Plus className="w-4 h-4" /> New program</button>
      </div>

      {programs.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <div className="text-5xl mb-3">📋</div>
          <p className="font-display text-2xl font-semibold text-ink">No programs yet</p>
          <p className="text-ink-muted mt-1 mb-5 max-w-md mx-auto">
            Build a plan for any sport — e.g. a Push/Pull/Legs split, a 5K running plan or your BJJ conditioning —
            then start each day with one tap.
          </p>
          <button className={btn.primary} onClick={() => setEditing({ program: null })}><Plus className="w-4 h-4" /> Create a program</button>
        </div>
      ) : (
        <div className="grid xl:grid-cols-2 gap-5 items-start">
          {programs.map(p => <ProgramCard key={p.id} program={p} onStartDay={onStartDay} onEdit={(program) => setEditing({ program })} />)}
        </div>
      )}

      {editing && <ProgramModal program={editing.program} onClose={() => setEditing(null)} />}
    </div>
  );
}
