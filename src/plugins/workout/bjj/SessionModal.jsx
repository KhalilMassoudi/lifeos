import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Minus, Plus, Loader2, Check, Search } from 'lucide-react';
import Modal, { btn } from '../../../components/ui/Modal';
import { useBjjStore, CLASS_TYPES, POSITIONS } from './bjjStore';
import { FEELINGS } from '../workoutStore';

function Stepper({ label, value, onChange, max = 99 }) {
  const n = value === '' || value == null ? 0 : Number(value);
  return (
    <div className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-surface-sunken/60">
      <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink-faint">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(0, n - 1))} className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-ink-soft hover:text-ink shadow-soft" aria-label={`Fewer ${label}`}>
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="font-display text-2xl font-semibold text-ink w-8 text-center" aria-live="polite">{n}</span>
        <button type="button" onClick={() => onChange(Math.min(max, n + 1))} className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-ink-soft hover:text-ink shadow-soft" aria-label={`More ${label}`}>
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// `session` to edit, or `initial` to pre-fill a new one (e.g. from a timetable class)
export default function SessionModal({ session, initial, onClose }) {
  const { saveSession, saveTechnique, techniques } = useBjjStore();
  const start = session || initial || {};
  const [date, setDate] = useState(start.date || format(new Date(), 'yyyy-MM-dd'));
  const [classType, setClassType] = useState(start.class_type || 'gi');
  const [duration, setDuration] = useState(start.duration_minutes ?? 60);
  const [rounds, setRounds] = useState(start.rounds ?? 0);
  const [subsHit, setSubsHit] = useState(start.subs_hit ?? 0);
  const [subsCaught, setSubsCaught] = useState(start.subs_caught ?? 0);
  const [energy, setEnergy] = useState(start.energy ?? null);
  const [notes, setNotes] = useState(start.notes || '');
  const [selected, setSelected] = useState(new Set(start.technique_ids || []));
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const toggle = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return techniques
      .filter(t => !q || t.name.toLowerCase().includes(q))
      .sort((a, b) => Number(selected.has(b.id)) - Number(selected.has(a.id)) || a.name.localeCompare(b.name))
      .slice(0, 30);
  }, [techniques, search, selected]);
  const exactMatch = techniques.some(t => t.name.toLowerCase() === search.trim().toLowerCase());

  const addTechnique = async () => {
    try {
      const t = await saveTechnique({ name: search.trim(), status: 'learning' });
      setSelected(s => new Set(s).add(t.id));
      setSearch('');
    } catch { /* toast shown */ }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveSession({
        date, class_type: classType,
        duration_minutes: duration === '' ? null : Number(duration),
        rounds, subs_hit: subsHit, subs_caught: subsCaught, energy, notes,
        technique_ids: [...selected],
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
      title={session ? 'Edit session' : 'Log a BJJ session'}
      subtitle={session ? null : 'Also counts as a workout 💪'}
      icon={<span className="text-xl">🥋</span>}
      onClose={onClose}
      footer={<>
        {error && <p role="alert" className="mr-auto self-center text-sm font-semibold text-red-400">{error}</p>}
        <button className={btn.secondary} onClick={onClose}>Cancel</button>
        <button className={btn.primary} onClick={save} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save session
        </button>
      </>}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Class type">
          {Object.entries(CLASS_TYPES).filter(([k]) => !['kids', 'women'].includes(k) || classType === k).map(([key, c]) => (
            <button key={key} type="button" role="radio" aria-checked={classType === key} onClick={() => setClassType(key)}
              className={`px-3 py-1.5 rounded-2xl text-xs font-extrabold transition-all ${classType === key ? 'shadow-soft scale-105 text-ink' : 'opacity-60 hover:opacity-100 text-ink-soft'}`}
              style={{ background: c.tint }}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-bold text-ink-soft mb-1.5">Date</span>
            <input type="date" className="lifeos-input" value={date} max={format(new Date(), 'yyyy-MM-dd')} onChange={e => setDate(e.target.value)} />
          </label>
          <label className="block">
            <span className="block text-xs font-bold text-ink-soft mb-1.5">Minutes on the mat</span>
            <input type="number" min="0" className="lifeos-input" value={duration} onChange={e => setDuration(e.target.value)} />
          </label>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <Stepper label="Rounds" value={rounds} onChange={setRounds} />
          <Stepper label="Subs hit" value={subsHit} onChange={setSubsHit} />
          <Stepper label="Tapped" value={subsCaught} onChange={setSubsCaught} />
        </div>

        <div>
          <p className="text-xs font-bold text-ink-soft mb-2">Energy</p>
          <div className="flex gap-2" role="radiogroup" aria-label="Energy">
            {FEELINGS.map(f => (
              <button key={f.value} type="button" role="radio" aria-checked={energy === f.value} aria-label={f.label}
                onClick={() => setEnergy(energy === f.value ? null : f.value)}
                className={`flex flex-col items-center gap-0.5 w-16 py-2 rounded-2xl transition-all ${energy === f.value ? 'bg-accent-50 ring-2 ring-accent-200 scale-105' : 'hover:bg-surface-sunken opacity-60 hover:opacity-100'}`}>
                <span className="text-2xl">{f.emoji}</span>
                <span className="text-[10px] font-extrabold text-ink-muted">{f.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold text-ink-soft mb-2">Techniques you worked on <span className="text-ink-faint">({selected.size})</span></p>
          <div className="relative mb-2">
            <Search className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search or add a technique" aria-label="Search techniques" className="lifeos-input pl-9 py-2"
              onKeyDown={e => { if (e.key === 'Enter' && search.trim() && !exactMatch) { e.preventDefault(); addTechnique(); } }} />
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
            {visible.map(t => (
              <button key={t.id} type="button" onClick={() => toggle(t.id)} aria-pressed={selected.has(t.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${selected.has(t.id) ? 'bg-accent-400 text-paper' : 'bg-surface-sunken text-ink-soft hover:text-ink'}`}
                title={POSITIONS[t.position]}>
                {selected.has(t.id) && '✓ '}{t.name}
              </button>
            ))}
            {search.trim() && !exactMatch && (
              <button type="button" onClick={addTechnique} className="px-3 py-1.5 rounded-full text-xs font-extrabold border-2 border-dashed border-accent-300 text-accent-500">
                + Add "{search.trim()}"
              </button>
            )}
            {techniques.length === 0 && !search && <p className="text-xs text-ink-muted">Type a technique above to start your library.</p>}
          </div>
        </div>

        <label className="block">
          <span className="block text-xs font-bold text-ink-soft mb-1.5">Notes</span>
          <textarea className="lifeos-input resize-none" rows={3} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="What clicked? What got you tapped? Things to ask coach…" />
        </label>
      </div>
    </Modal>
  );
}
