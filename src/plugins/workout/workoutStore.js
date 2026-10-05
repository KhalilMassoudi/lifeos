import { create } from 'zustand';
import { format, parseISO, startOfWeek, subWeeks, isSameWeek, startOfMonth } from 'date-fns';
import { api } from '../../utils/api';

export const WORKOUT_TYPES = {
  strength:    { label: 'Strength',    emoji: '🏋️', tint: '#FFE8EE', ink: '#9E3A59' },
  cardio:      { label: 'Cardio',      emoji: '🏃', tint: '#E1EFFC', ink: '#2D5E90' },
  flexibility: { label: 'Flexibility', emoji: '🧘', tint: '#EFE8FA', ink: '#5A438C' },
  sport:       { label: 'Sport',       emoji: '⚽', tint: '#DDF5E9', ink: '#246B4F' },
  other:       { label: 'Other',       emoji: '✨', tint: '#FFEBDD', ink: '#9E4E2C' },
};

export const FEELINGS = [
  { value: 1, emoji: '😫', label: 'Rough' },
  { value: 2, emoji: '😕', label: 'Meh' },
  { value: 3, emoji: '🙂', label: 'Good' },
  { value: 4, emoji: '😄', label: 'Great' },
  { value: 5, emoji: '🔥', label: 'On fire' },
];

const WEEK_OPTIONS = { weekStartsOn: 1 };
const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));

// Total kg lifted in a session: Σ sets × reps × weight
export const sessionVolume = (session) =>
  session.exercises.reduce((sum, e) => sum + (num(e.sets) || 1) * (num(e.reps) || 0) * (num(e.weight) || 0), 0);

export const useWorkoutStore = create((set, get) => ({
  sessions: [],
  templates: [],
  isLoaded: false,

  fetchData: async () => {
    try {
      const [sessions, templates] = await Promise.all([api.get('/workouts/sessions'), api.get('/workouts/templates')]);
      set({ sessions, templates, isLoaded: true });
    } catch {
      set({ isLoaded: true });
    }
  },

  saveSession: async (payload, id) => {
    const saved = id ? await api.put(`/workouts/sessions/${id}`, payload) : await api.post('/workouts/sessions', payload);
    set(state => ({
      sessions: [saved, ...state.sessions.filter(s => s.id !== saved.id)]
        .sort((a, b) => b.date.localeCompare(a.date) || new Date(b.created_at) - new Date(a.created_at)),
    }));
    if (payload.save_as_template) set({ templates: await api.get('/workouts/templates') });
    return saved;
  },

  deleteSession: async (id) => {
    const { sessions } = get();
    set({ sessions: sessions.filter(s => s.id !== id) });
    try { await api.delete(`/workouts/sessions/${id}`); } catch { set({ sessions }); }
  },

  deleteTemplate: async (id) => {
    const { templates } = get();
    set({ templates: templates.filter(t => t.id !== id) });
    try { await api.delete(`/workouts/templates/${id}`); } catch { set({ templates }); }
  },

  // Every exercise name used before, most frequent first (for autocomplete)
  getExerciseNames: () => {
    const counts = {};
    for (const s of get().sessions) for (const e of s.exercises) counts[e.name] = (counts[e.name] || 0) + 1;
    for (const t of get().templates) for (const e of t.exercises) counts[e.name] = (counts[e.name] || 0) + 1;
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  },

  getStats: (weeklyGoal) => {
    const { sessions } = get();
    const now = new Date();
    const thisWeek = sessions.filter(s => isSameWeek(parseISO(s.date), now, WEEK_OPTIONS));
    const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
    const monthMinutes = sessions.filter(s => s.date >= monthStart).reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

    // Weeks in a row (ending this week, or last week if this one isn't done yet) that hit the goal
    const perWeek = (weekStart) => sessions.filter(s => isSameWeek(parseISO(s.date), weekStart, WEEK_OPTIONS)).length;
    let streak = 0;
    let week = thisWeek.length >= weeklyGoal ? now : subWeeks(now, 1);
    while (perWeek(week) >= weeklyGoal && streak < 520) { streak++; week = subWeeks(week, 1); }

    return { thisWeek: thisWeek.length, monthMinutes, total: sessions.length, streak };
  },

  // Minutes and workout count for the last `weeks` weeks (oldest first)
  getWeeklyChart: (weeks = 8) => {
    const { sessions } = get();
    return Array.from({ length: weeks }, (_, i) => {
      const weekStart = startOfWeek(subWeeks(new Date(), weeks - 1 - i), WEEK_OPTIONS);
      const inWeek = sessions.filter(s => isSameWeek(parseISO(s.date), weekStart, WEEK_OPTIONS));
      return {
        label: format(weekStart, 'MMM d'),
        minutes: inWeek.reduce((sum, s) => sum + (s.duration_minutes || 0), 0),
        workouts: inWeek.length,
      };
    });
  },

  // Heaviest weight per exercise, with the date it was lifted
  getPersonalRecords: (limit = 6) => {
    const best = {};
    for (const s of get().sessions) {
      for (const e of s.exercises) {
        const w = num(e.weight);
        if (!w) continue;
        if (!best[e.name] || w > best[e.name].weight) best[e.name] = { name: e.name, weight: w, reps: num(e.reps), date: s.date };
      }
    }
    return Object.values(best).sort((a, b) => b.weight - a.weight).slice(0, limit);
  },
}));
