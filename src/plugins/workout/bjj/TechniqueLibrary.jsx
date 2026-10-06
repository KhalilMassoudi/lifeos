import React, { useMemo, useState } from 'react';
import { formatDistanceToNowStrict, parseISO } from 'date-fns';
import { Plus, Search, Pencil, Trash2, PlayCircle, Check, Loader2, BookOpen, RotateCcw } from 'lucide-react';
import Modal, { btn } from '../../../components/ui/Modal';
import { useBjjStore, POSITIONS, CATEGORIES, STATUSES, STATUS_ORDER, REVIEW_AFTER_DAYS } from './bjjStore';

const safeVideo = (url) => {
  try { return new URL(url).protocol === 'https:' ? url : null; } catch { return null; }
};

export function TechniqueModal({ technique, onClose }) {
  const { saveTechnique } = useBjjStore();
  const [form, setForm] = useState({
    name: technique?.name || '',
    position: technique?.position || 'closed_guard',
    category: technique?.category || 'submission',
    status: technique?.status || 'learning',
    video_url: technique?.video_url || '',
    notes: technique?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveTechnique(form, technique?.id);
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal title={technique ? 'Edit technique' : 'New technique'} icon={<BookOpen className="w-5 h-5" />} onClose={onClose}
      footer={<>
        {error && <p role="alert" className="mr-auto self-center text-sm font-semibold text-red-400">{error}</p>}
        <button className={btn.secondary} onClick={onClose}>Cancel</button>
        <button className={btn.primary} onClick={save} disabled={saving || !form.name.trim()}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
        </button>
      </>}
    >
      <div className="space-y-4">
        <label className="block">
          <span className="block text-xs font-bold text-ink-soft mb-1.5">Technique</span>
          <input className="lifeos-input" autoFocus value={form.name} maxLength={255} onChange={e => set('name', e.target.value)} placeholder="e.g. Armbar from closed guard" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-bold text-ink-soft mb-1.5">Position</span>
            <select className="lifeos-input" value={form.position} onChange={e => set('position', e.target.value)}>
              {Object.entries(POSITIONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs font-bold text-ink-soft mb-1.5">Type</span>
            <select className="lifeos-input" value={form.category} onChange={e => set('category', e.target.value)}>
              {Object.entries(CATEGORIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
        </div>
        <div>
          <span className="block text-xs font-bold text-ink-soft mb-1.5">Where you're at</span>
          <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Status">
            {STATUS_ORDER.map(k => (
              <button key={k} type="button" role="radio" aria-checked={form.status === k} onClick={() => set('status', k)}
                className={`py-2 rounded-2xl text-xs font-extrabold transition-all ${form.status === k ? `${STATUSES[k].cls} ring-2 ring-accent-200` : 'bg-surface-sunken/50 text-ink-muted hover:text-ink'}`}>
                {STATUSES[k].emoji} {STATUSES[k].label}
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="block text-xs font-bold text-ink-soft mb-1.5">Video (YouTube, Instagram…)</span>
          <input className="lifeos-input" value={form.video_url} onChange={e => set('video_url', e.target.value)} placeholder="https://…" inputMode="url" />
        </label>
        <label className="block">
          <span className="block text-xs font-bold text-ink-soft mb-1.5">Your notes — key details</span>
          <textarea className="lifeos-input resize-none" rows={6} value={form.notes} onChange={e => set('notes', e.target.value)}
            placeholder={'1. Break posture with collar + sleeve\n2. Foot on hip, pivot 90°\n3. Squeeze knees, hips up\nCommon mistake: …'} />
        </label>
      </div>
    </Modal>
  );
}

function TechniqueCard({ technique: t, onEdit }) {
  const { saveTechnique, deleteTechnique } = useBjjStore();
  const status = STATUSES[t.status] || STATUSES.to_learn;
  const video = safeVideo(t.video_url);
  const nextStatus = STATUS_ORDER[(STATUS_ORDER.indexOf(t.status) + 1) % STATUS_ORDER.length];

  return (
    <article className="group glass-card-sm p-4 flex flex-col gap-2">
      <div className="flex items-start gap-2">
        <h4 className="flex-1 font-extrabold text-ink leading-snug">{t.name}</h4>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button onClick={() => onEdit(t)} className="p-1.5 rounded-full text-ink-muted hover:text-ink hover:bg-surface-sunken" aria-label={`Edit ${t.name}`}><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={() => { if (window.confirm(`Delete "${t.name}"?`)) deleteTechnique(t.id); }} className="p-1.5 rounded-full text-red-400 hover:bg-red-50" aria-label={`Delete ${t.name}`}><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <button onClick={() => saveTechnique({ ...t, status: nextStatus }, t.id)} title={`Move to "${STATUSES[nextStatus].label}"`}
          className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${status.cls} hover:ring-2 hover:ring-accent-200 transition-shadow`}>
          {status.emoji} {status.label}
        </button>
        <span className="text-[11px] font-bold text-ink-faint">{CATEGORIES[t.category]}</span>
        {t.source === 'gym' && <span className="text-[11px] font-bold text-pink-400" title={t.source_label || ''}>· from gym</span>}
      </div>
      {t.notes && <p className="text-xs text-ink-soft whitespace-pre-wrap line-clamp-4">{t.notes}</p>}
      <div className="flex items-center gap-3 mt-auto pt-1 text-[11px] font-semibold text-ink-faint">
        {t.times_practiced > 0 && <span>Practiced {t.times_practiced}×</span>}
        {t.last_reviewed && <span>Last {formatDistanceToNowStrict(parseISO(t.last_reviewed), { addSuffix: true })}</span>}
        {video && (
          <a href={video} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 font-extrabold text-accent-500 hover:text-accent-600">
            <PlayCircle className="w-3.5 h-3.5" /> Video
          </a>
        )}
      </div>
    </article>
  );
}

export default function TechniqueLibrary() {
  const { techniques, getDueForReview, markReviewed } = useBjjStore();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [position, setPosition] = useState('all');
  const [editing, setEditing] = useState(null); // null | { technique }
  const due = getDueForReview();

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = techniques.filter(t =>
      (status === 'all' || t.status === status) &&
      (position === 'all' || t.position === position) &&
      (!q || [t.name, t.notes].some(v => v?.toLowerCase().includes(q))));
    const map = new Map();
    for (const key of Object.keys(POSITIONS)) map.set(key, []);
    for (const t of filtered) (map.get(t.position) || map.get('other')).push(t);
    return [...map.entries()].filter(([, list]) => list.length > 0);
  }, [techniques, query, status, position]);

  const usedPositions = Object.entries(POSITIONS).filter(([k]) => techniques.some(t => t.position === k));

  return (
    <div className="space-y-6">
      {due.length > 0 && (
        <section className="rounded-3xl p-5 bg-gradient-to-br from-amber-50 to-accent-50 border border-amber-100">
          <h3 className="font-display text-lg font-semibold text-ink flex items-center gap-2 mb-1">
            <RotateCcw className="w-4 h-4 text-amber-400" /> Due for review
          </h3>
          <p className="text-xs text-ink-muted mb-3">Techniques you're learning that you haven't touched in {REVIEW_AFTER_DAYS}+ days. Drill them in your next class!</p>
          <div className="flex flex-wrap gap-2">
            {due.slice(0, 10).map(t => (
              <span key={t.id} className="inline-flex items-center gap-2 pl-3 pr-1 py-1 rounded-full bg-surface shadow-soft text-sm font-bold text-ink">
                {t.name}
                <button onClick={() => markReviewed(t.id)} className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-300 text-[11px] font-extrabold hover:bg-emerald-100" aria-label={`Mark ${t.name} reviewed`}>
                  ✓ Reviewed
                </button>
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search techniques & notes" aria-label="Search techniques" className="lifeos-input pl-9 py-2" />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)} aria-label="Filter by status" className="lifeos-input w-auto py-2 text-sm font-bold">
          <option value="all">All statuses</option>
          {STATUS_ORDER.map(k => <option key={k} value={k}>{STATUSES[k].emoji} {STATUSES[k].label}</option>)}
        </select>
        <select value={position} onChange={e => setPosition(e.target.value)} aria-label="Filter by position" className="lifeos-input w-auto py-2 text-sm font-bold">
          <option value="all">All positions</option>
          {usedPositions.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <button className={`${btn.primary} ml-auto`} onClick={() => setEditing({ technique: null })}><Plus className="w-4 h-4" /> Technique</button>
      </div>

      {techniques.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <div className="text-5xl mb-3">📚</div>
          <p className="font-display text-2xl font-semibold text-ink">Your technique library</p>
          <p className="text-ink-muted mt-1 mb-5 max-w-md mx-auto">Save every technique you learn with the key details, a video, and how well you know it. Import your gym's curriculum from the Gym tab.</p>
          <button className={btn.primary} onClick={() => setEditing({ technique: null })}><Plus className="w-4 h-4" /> Add your first technique</button>
        </div>
      ) : groups.length === 0 ? (
        <p className="text-center text-sm text-ink-muted py-10">No techniques match.</p>
      ) : groups.map(([pos, list]) => (
        <section key={pos}>
          <h3 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-faint mb-2.5 px-1">{POSITIONS[pos]} · {list.length}</h3>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {list.map(t => <TechniqueCard key={t.id} technique={t} onEdit={(technique) => setEditing({ technique })} />)}
          </div>
        </section>
      ))}

      {editing && <TechniqueModal technique={editing.technique} onClose={() => setEditing(null)} />}
    </div>
  );
}
