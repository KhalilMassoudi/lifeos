import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { Search, PenLine, Trash2, Heart, Lock, Check, Loader2, Hash, X } from 'lucide-react';
import { useNotesStore, MOODS } from './notesStore';
import { useAuthStore } from '../../store/authStore';
import { ProfileAvatar } from '../../components/profile/ProfileBits';
import { btn } from '../../components/ui/Modal';

const todayKey = () => format(new Date(), 'yyyy-MM-dd');

// Lined-paper writing surface: one rule every line
const PAPER_LINE = 30;
const paperStyle = {
  lineHeight: `${PAPER_LINE}px`,
  backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${PAPER_LINE - 1}px, rgb(var(--surface-500) / 0.7) ${PAPER_LINE - 1}px, rgb(var(--surface-500) / 0.7) ${PAPER_LINE}px)`,
  backgroundAttachment: 'local',
};

function TagInput({ tags, onChange, suggestions }) {
  const [draft, setDraft] = useState('');
  const add = (raw) => {
    const tag = raw.trim().toLowerCase().replace(/^#/, '');
    if (tag && !tags.includes(tag) && tags.length < 10) onChange([...tags, tag]);
    setDraft('');
  };
  const unused = suggestions.filter(s => !tags.includes(s)).slice(0, 6);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full bg-accent-50 text-accent-600 text-xs font-bold">
            #{tag}
            <button type="button" onClick={() => onChange(tags.filter(t => t !== tag))} aria-label={`Remove tag ${tag}`} className="hover:text-red-400">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <span className="inline-flex items-center gap-1 text-ink-faint">
          <Hash className="w-3.5 h-3.5" />
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(draft); }
              if (e.key === 'Backspace' && !draft && tags.length) onChange(tags.slice(0, -1));
            }}
            onBlur={() => draft && add(draft)}
            placeholder="add tag"
            aria-label="Add tag"
            className="w-24 bg-transparent text-xs font-semibold text-ink placeholder-ink-faint focus:outline-none"
          />
        </span>
      </div>
      {unused.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {unused.map(s => (
            <button key={s} type="button" onClick={() => add(s)} className="text-[11px] font-semibold text-ink-muted hover:text-accent-500 px-2 py-0.5 rounded-full bg-surface-sunken">
              +#{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EntryEditor({ entry, onSaved, onDeleted, partnerName }) {
  const { createNote, updateNote, deleteNote, tags: allTags } = useNotesStore();
  const blank = { date: todayKey(), mood: null, title: '', content: '', tags: [], is_shared: false };
  const initial = entry
    ? { date: entry.date || todayKey(), mood: entry.mood, title: entry.title || '', content: entry.content, tags: entry.tags, is_shared: entry.is_shared }
    : blank;
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const save = useCallback(async () => {
    if (!form.content.trim() || saving) return;
    setSaving(true);
    try {
      const payload = { ...form, type: 'journal' };
      const saved = entry ? await updateNote(entry.id, payload) : await createNote(payload);
      setSavedAt(new Date());
      onSaved(saved);
    } catch { /* toast shown by api */ }
    setSaving(false);
  }, [form, saving, entry, updateNote, createNote, onSaved]);

  // Ctrl/Cmd + S saves
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save]);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 px-8 pt-6 pb-4">
        <input
          type="date"
          value={form.date}
          max={todayKey()}
          onChange={e => set('date', e.target.value)}
          aria-label="Entry date"
          className="bg-surface-sunken rounded-xl px-3 py-1.5 text-sm font-bold text-ink-soft focus:outline-none focus:ring-2 focus:ring-accent-200"
        />
        <div className="flex items-center gap-0.5 flex-wrap" role="radiogroup" aria-label="Mood">
          {MOODS.map(m => (
            <button
              key={m.emoji}
              type="button"
              role="radio"
              aria-checked={form.mood === m.emoji}
              title={m.label}
              aria-label={m.label}
              onClick={() => set('mood', form.mood === m.emoji ? null : m.emoji)}
              className={`w-9 h-9 rounded-full text-lg flex items-center justify-center transition-all
                ${form.mood === m.emoji ? 'bg-accent-100 scale-110 shadow-soft' : 'opacity-50 grayscale-[40%] hover:opacity-100 hover:grayscale-0 hover:bg-surface-sunken'}`}
            >
              {m.emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Page */}
      <div className="flex-1 min-h-0 flex flex-col px-8">
        <input
          value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder={format(parseISO(form.date), 'EEEE, MMMM d')}
          aria-label="Title"
          maxLength={255}
          className="font-display text-3xl font-semibold text-ink placeholder-ink-faint/70 bg-transparent focus:outline-none mb-2"
        />
        <textarea
          autoFocus={!entry}
          value={form.content}
          onChange={e => set('content', e.target.value)}
          placeholder="Dear diary… what's on your heart today?"
          aria-label="Entry"
          style={paperStyle}
          className="flex-1 min-h-[200px] w-full resize-none bg-transparent text-[16px] text-ink placeholder-ink-faint focus:outline-none"
        />
      </div>

      {/* Footer */}
      <div className="px-8 py-4 border-t border-line/60 space-y-3">
        <TagInput tags={form.tags} onChange={t => set('tags', t)} suggestions={allTags} />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => set('is_shared', !form.is_shared)}
            aria-pressed={form.is_shared}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-extrabold transition-all
              ${form.is_shared ? 'bg-blush-light text-blush-deep' : 'bg-surface-sunken text-ink-muted hover:text-ink'}`}
          >
            {form.is_shared
              ? <><Heart className="w-3.5 h-3.5 fill-current" /> Shared with {partnerName || 'your partner'}</>
              : <><Lock className="w-3.5 h-3.5" /> Private</>}
          </button>

          <span className="text-xs text-ink-faint font-semibold ml-auto">
            {saving ? 'Saving…' : dirty ? 'Unsaved changes · Ctrl+S' : savedAt ? `Saved ${format(savedAt, 'HH:mm')}` : ''}
          </span>

          {entry && (
            <button
              type="button"
              onClick={() => { if (window.confirm('Delete this journal entry?')) { deleteNote(entry.id); onDeleted(); } }}
              className={btn.ghost}
              aria-label="Delete entry"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button type="button" onClick={save} disabled={!form.content.trim() || saving || (entry && !dirty)} className={btn.primary}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {entry ? 'Save' : 'Save entry'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Someone else's shared entry: read-only
function EntryReader({ entry }) {
  return (
    <div className="h-full overflow-y-auto px-8 py-6">
      <div className="flex items-center gap-3 mb-5">
        <ProfileAvatar profile={entry.author} size="md" />
        <div>
          <p className="text-sm font-extrabold text-ink">{entry.author.name} shared this with you 💞</p>
          <p className="text-xs text-ink-muted">{entry.date && format(parseISO(entry.date), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        {entry.mood && <span className="ml-auto text-3xl" title="Mood">{entry.mood}</span>}
      </div>
      <h2 className="font-display text-3xl font-semibold text-ink mb-3">
        {entry.title || (entry.date ? format(parseISO(entry.date), 'EEEE, MMMM d') : 'Untitled')}
      </h2>
      <p style={paperStyle} className="whitespace-pre-wrap text-[16px] text-ink">{entry.content}</p>
      {entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-5">
          {entry.tags.map(t => <span key={t} className="px-2.5 py-1 rounded-full bg-surface-sunken text-ink-muted text-xs font-bold">#{t}</span>)}
        </div>
      )}
    </div>
  );
}

export default function JournalView() {
  const { notes, loaded, fetchNotes, fetchTags } = useNotesStore();
  const { currentUser, profiles } = useAuthStore();
  const [selectedId, setSelectedId] = useState(null); // null = new entry
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all | mine | shared
  const [editorKey, setEditorKey] = useState(0);

  useEffect(() => { fetchNotes('journal'); fetchTags(); }, [fetchNotes, fetchTags]);

  const partner = profiles.find(p => p.id !== currentUser.id);
  const entries = notes.journal;
  const selected = entries.find(e => e.id === selectedId) || null;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter(e => {
      if (filter === 'mine' && e.user_id !== currentUser.id) return false;
      if (filter === 'shared' && e.user_id === currentUser.id) return false;
      if (!q) return true;
      return [e.title, e.content, ...e.tags].some(text => text?.toLowerCase().includes(q.replace(/^#/, '')));
    });
  }, [entries, query, filter, currentUser.id]);

  // Group by month for the list
  const groups = useMemo(() => {
    const map = new Map();
    for (const e of visible) {
      const key = e.date ? format(parseISO(e.date), 'MMMM yyyy') : 'Undated';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    }
    return [...map.entries()];
  }, [visible]);

  const startNew = () => { setSelectedId(null); setEditorKey(k => k + 1); };
  const hasShared = entries.some(e => e.user_id !== currentUser.id);

  return (
    <div className="h-full flex overflow-hidden">
      {/* Entry list */}
      <aside className="w-80 flex-shrink-0 border-r border-line/70 flex flex-col bg-navy-900/60">
        <div className="p-4 space-y-3">
          <button onClick={startNew} className={`${btn.primary} w-full`}>
            <PenLine className="w-4 h-4" /> New entry
          </button>
          <div className="relative">
            <Search className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search words or #tags"
              aria-label="Search journal"
              className="lifeos-input pl-9 py-2"
            />
          </div>
          {hasShared && (
            <div className="flex gap-1 p-1 rounded-2xl bg-surface-sunken text-xs font-extrabold" role="tablist">
              {[['all', 'All'], ['mine', 'Mine'], ['shared', `${partner?.name || 'Shared'}'s`]].map(([id, label]) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={filter === id}
                  onClick={() => setFilter(id)}
                  className={`flex-1 py-1.5 rounded-xl transition-all ${filter === id ? 'bg-surface text-ink shadow-soft' : 'text-ink-muted hover:text-ink'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {!loaded.journal ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-accent-400 animate-spin" /></div>
          ) : groups.length === 0 ? (
            <p className="text-center text-sm text-ink-muted px-6 py-10">
              {entries.length === 0 ? 'Your journal is waiting for its first page ✨' : 'No entries match your search.'}
            </p>
          ) : groups.map(([month, list]) => (
            <div key={month} className="mb-3">
              <p className="px-2 pt-2 pb-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-faint">{month}</p>
              {list.map(e => {
                const mine = e.user_id === currentUser.id;
                const active = e.id === selectedId;
                return (
                  <button
                    key={e.id}
                    onClick={() => setSelectedId(e.id)}
                    className={`w-full text-left flex gap-3 p-2.5 rounded-2xl transition-colors mb-0.5
                      ${active ? 'bg-surface shadow-soft ring-1 ring-accent-200' : 'hover:bg-surface/70'}`}
                  >
                    <div className="w-11 flex-shrink-0 text-center">
                      <div className="font-display text-2xl font-semibold text-ink leading-none">{e.date ? format(parseISO(e.date), 'd') : '–'}</div>
                      <div className="text-[10px] font-extrabold uppercase text-ink-faint mt-0.5">{e.date ? format(parseISO(e.date), 'EEE') : ''}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {e.mood && <span className="text-sm">{e.mood}</span>}
                        <span className="text-sm font-extrabold text-ink truncate">{e.title || e.content.split('\n')[0]}</span>
                      </div>
                      <p className="text-xs text-ink-muted line-clamp-2 mt-0.5">{e.content}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        {!mine && <ProfileAvatar profile={e.author} size="sm" />}
                        {mine && e.is_shared && <span className="text-[10px] font-extrabold text-blush-deep inline-flex items-center gap-0.5"><Heart className="w-2.5 h-2.5 fill-current" /> shared</span>}
                        {e.tags.slice(0, 2).map(t => <span key={t} className="text-[10px] font-bold text-ink-faint">#{t}</span>)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </aside>

      {/* Page */}
      <section className="flex-1 min-w-0 bg-surface">
        {selected && selected.user_id !== currentUser.id ? (
          <EntryReader entry={selected} />
        ) : (
          <EntryEditor
            key={selected ? selected.id : `new-${editorKey}`}
            entry={selected}
            partnerName={partner?.name}
            onSaved={(saved) => setSelectedId(saved.id)}
            onDeleted={startNew}
          />
        )}
      </section>
    </div>
  );
}

