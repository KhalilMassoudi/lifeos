import { create } from 'zustand';
import { api } from '../../utils/api';

export const MOODS = [
  { emoji: '🥰', label: 'Loved' },
  { emoji: '😊', label: 'Happy' },
  { emoji: '😌', label: 'Calm' },
  { emoji: '🤩', label: 'Excited' },
  { emoji: '😐', label: 'Meh' },
  { emoji: '😴', label: 'Tired' },
  { emoji: '😔', label: 'Down' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '😤', label: 'Frustrated' },
  { emoji: '😰', label: 'Anxious' },
];

// Sticky-note paper colors: background, edge and ink
export const NOTE_COLORS = {
  blush:    { label: 'Blush',    bg: '#FFE8EE', edge: '#F7A8B8', ink: '#9E3A59' },
  lavender: { label: 'Lavender', bg: '#EFE8FA', edge: '#C3B1E1', ink: '#5A438C' },
  mint:     { label: 'Mint',     bg: '#DDF5E9', edge: '#A8E6CF', ink: '#246B4F' },
  peach:    { label: 'Peach',    bg: '#FFEBDD', edge: '#FFBE98', ink: '#9E4E2C' },
  butter:   { label: 'Butter',   bg: '#FFF4D1', edge: '#F9D88B', ink: '#7A5B12' },
  sky:      { label: 'Sky',      bg: '#E1EFFC', edge: '#A6CFF2', ink: '#2D5E90' },
};

const TYPES = ['journal', 'quick_note', 'love_note'];

export const useNotesStore = create((set, get) => ({
  notes: { journal: [], quick_note: [], love_note: [] },
  loaded: { journal: false, quick_note: false, love_note: false },
  tags: [],

  fetchNotes: async (type) => {
    try {
      const data = await api.get(`/notes?type=${type}`);
      set(state => ({ notes: { ...state.notes, [type]: data }, loaded: { ...state.loaded, [type]: true } }));
    } catch {
      set(state => ({ loaded: { ...state.loaded, [type]: true } }));
    }
  },

  fetchTags: async () => {
    try {
      set({ tags: await api.get('/notes/tags') });
    } catch { /* toast already shown */ }
  },

  createNote: async (note) => {
    const created = await api.post('/notes', note);
    set(state => ({ notes: { ...state.notes, [created.type]: sortNotes(created.type, [created, ...state.notes[created.type]]) } }));
    if (note.tags?.length) get().fetchTags();
    return created;
  },

  updateNote: async (id, updates) => {
    const updated = await api.put(`/notes/${id}`, updates);
    set(state => ({
      notes: { ...state.notes, [updated.type]: sortNotes(updated.type, state.notes[updated.type].map(n => (n.id === id ? updated : n))) },
    }));
    if (updates.tags) get().fetchTags();
    return updated;
  },

  deleteNote: async (id) => {
    const previous = get().notes;
    const type = TYPES.find(t => previous[t].some(n => n.id === id));
    if (!type) return;
    set(state => ({ notes: { ...state.notes, [type]: state.notes[type].filter(n => n.id !== id) } }));
    try {
      await api.delete(`/notes/${id}`);
      get().fetchTags();
    } catch {
      set({ notes: previous });
    }
  },
}));

// Same order the server uses
function sortNotes(type, list) {
  const byDate = (a, b) =>
    (b.date || '').localeCompare(a.date || '') || new Date(b.created_at) - new Date(a.created_at);
  if (type === 'quick_note') {
    return [...list].sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) || new Date(b.updated_at) - new Date(a.updated_at));
  }
  return [...list].sort(byDate);
}
