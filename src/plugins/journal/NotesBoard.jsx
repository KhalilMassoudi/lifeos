import React, { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Pin, PinOff, Trash2, Search, Plus, Loader2, StickyNote, Check } from 'lucide-react';
import { useNotesStore, NOTE_COLORS } from './notesStore';
import Modal, { btn } from '../../components/ui/Modal';

function ColorDots({ value, onChange }) {
  return (
    <div className="flex gap-1.5" role="radiogroup" aria-label="Note color">
      {Object.entries(NOTE_COLORS).map(([key, c]) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={value === key}
          title={c.label}
          onClick={() => onChange(key)}
          className={`w-6 h-6 rounded-full transition-transform hover:scale-110 flex items-center justify-center ${value === key ? 'scale-110' : ''}`}
          style={{ background: c.edge, boxShadow: value === key ? `0 0 0 2px #fff, 0 0 0 4px ${c.edge}` : undefined }}
        >
          {value === key && <Check className="w-3 h-3" style={{ color: c.ink }} strokeWidth={3} />}
        </button>
      ))}
    </div>
  );
}

function Composer() {
  const { createNote } = useNotesStore();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState('butter');
  const [saving, setSaving] = useState(false);
  const c = NOTE_COLORS[color];

  const reset = () => { setTitle(''); setContent(''); setOpen(false); };
  const add = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await createNote({ type: 'quick_note', title, content, color_tag: color });
      reset();
    } catch { /* toast shown */ }
    setSaving(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full max-w-xl mx-auto flex items-center gap-3 px-5 py-3.5 rounded-3xl bg-surface shadow-soft border border-line/60 text-ink-muted hover:text-ink hover:shadow-lift transition-all"
      >
        <Plus className="w-5 h-5 text-accent-400" />
        <span className="font-semibold">Take a note…</span>
      </button>
    );
  }

  return (
    <div
      className="w-full max-w-xl mx-auto rounded-3xl shadow-lift border-2 p-4 space-y-2 animate-pop"
      style={{ background: c.bg, borderColor: c.edge }}
      onKeyDown={e => { if (e.key === 'Escape') reset(); if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') add(); }}
    >
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Title"
        aria-label="Note title"
        className="w-full bg-transparent font-display text-lg font-semibold placeholder-ink-faint focus:outline-none"
        style={{ color: c.ink }}
      />
      <textarea
        autoFocus
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Grocery list, a quote, an idea…"
        aria-label="Note"
        rows={3}
        className="w-full bg-transparent resize-none text-sm text-ink placeholder-ink-faint focus:outline-none"
      />
      <div className="flex items-center gap-2">
        <ColorDots value={color} onChange={setColor} />
        <span className="ml-auto" />
        <button type="button" className={btn.ghost} onClick={reset}>Cancel</button>
        <button type="button" className={btn.primary} onClick={add} disabled={!content.trim() || saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
        </button>
      </div>
    </div>
  );
}

function EditNoteModal({ note, onClose }) {
  const { updateNote } = useNotesStore();
  const [title, setTitle] = useState(note.title || '');
  const [content, setContent] = useState(note.content);
  const [color, setColor] = useState(note.color_tag || 'butter');
  const [saving, setSaving] = useState(false);
  const c = NOTE_COLORS[color];

  const save = async () => {
    setSaving(true);
    try {
      await updateNote(note.id, { title, content, color_tag: color });
      onClose();
    } catch { setSaving(false); }
  };

  return (
    <Modal
      title="Edit note"
      icon={<StickyNote className="w-5 h-5" />}
      onClose={onClose}
      footer={<>
        <button className={btn.secondary} onClick={onClose}>Cancel</button>
        <button className={btn.primary} onClick={save} disabled={!content.trim() || saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
        </button>
      </>}
    >
      <div className="rounded-3xl p-4 space-y-2 border-2" style={{ background: c.bg, borderColor: c.edge }}>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Title"
          aria-label="Note title"
          className="w-full bg-transparent font-display text-lg font-semibold placeholder-ink-faint focus:outline-none"
          style={{ color: c.ink }}
        />
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          aria-label="Note"
          rows={8}
          className="w-full bg-transparent resize-none text-sm text-ink focus:outline-none"
        />
      </div>
      <div className="mt-4"><ColorDots value={color} onChange={setColor} /></div>
    </Modal>
  );
}

function NoteCard({ note, index, onEdit }) {
  const { updateNote, deleteNote } = useNotesStore();
  const c = NOTE_COLORS[note.color_tag] || NOTE_COLORS.butter;
  const tilt = ['-0.6deg', '0.5deg', '-0.3deg', '0.7deg'][index % 4];

  return (
    <article
      className="group rounded-3xl p-4 border-2 shadow-soft hover:shadow-lift transition-all hover:!rotate-0 cursor-pointer relative"
      style={{ background: c.bg, borderColor: c.edge, transform: `rotate(${tilt})` }}
      onClick={() => onEdit(note)}
    >
      {note.is_pinned && (
        <Pin className="w-4 h-4 absolute -top-1.5 right-5 rotate-45 fill-current" style={{ color: c.ink }} aria-label="Pinned" />
      )}
      {note.title && <h3 className="font-display text-lg font-semibold leading-snug mb-1" style={{ color: c.ink }}>{note.title}</h3>}
      <p className="text-sm text-ink whitespace-pre-wrap break-words">{note.content}</p>
      <div className="flex items-center gap-1 mt-3 -mb-1">
        <span className="text-[11px] font-semibold text-ink-faint mr-auto">
          {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
        </span>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button
            onClick={e => { e.stopPropagation(); updateNote(note.id, { is_pinned: !note.is_pinned }); }}
            className="p-1.5 rounded-full hover:bg-paper/70"
            style={{ color: c.ink }}
            aria-label={note.is_pinned ? 'Unpin' : 'Pin'}
          >
            {note.is_pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={e => { e.stopPropagation(); if (window.confirm('Delete this note?')) deleteNote(note.id); }}
            className="p-1.5 rounded-full hover:bg-paper/70 text-red-400"
            aria-label="Delete note"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}

export default function NotesBoard() {
  const { notes, loaded, fetchNotes } = useNotesStore();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);

  useEffect(() => { fetchNotes('quick_note'); }, [fetchNotes]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? notes.quick_note.filter(n => `${n.title || ''} ${n.content}`.toLowerCase().includes(q))
      : notes.quick_note;
  }, [notes.quick_note, query]);
  const pinned = visible.filter(n => n.is_pinned);
  const others = visible.filter(n => !n.is_pinned);

  const Section = ({ label, list }) => list.length > 0 && (
    <section className="mb-4">
      {label && <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-faint mb-3 px-1">{label}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 items-start">
        {list.map((n, i) => <NoteCard key={n.id} note={n} index={i} onEdit={setEditing} />)}
      </div>
    </section>
  );

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="flex flex-col gap-4 mb-7">
        <Composer />
        {notes.quick_note.length > 3 && (
          <div className="relative w-full max-w-xs mx-auto">
            <Search className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search notes" aria-label="Search notes" className="lifeos-input pl-9 py-2" />
          </div>
        )}
      </div>

      {!loaded.quick_note ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-accent-400 animate-spin" /></div>
      ) : notes.quick_note.length === 0 ? (
        <div className="text-center py-16 text-ink-muted">
          <div className="text-5xl mb-3">🗒️</div>
          <p className="font-semibold">No notes yet — jot down your first one above.</p>
        </div>
      ) : (
        <>
          <Section label={pinned.length > 0 && others.length > 0 ? 'Pinned' : null} list={pinned} />
          <Section label={pinned.length > 0 && others.length > 0 ? 'Others' : null} list={others} />
          {visible.length === 0 && <p className="text-center text-sm text-ink-muted py-10">No notes match "{query}".</p>}
        </>
      )}

      {editing && <EditNoteModal note={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
