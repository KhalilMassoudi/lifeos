import { create } from 'zustand';
import { format, parseISO, differenceInCalendarDays, startOfMonth } from 'date-fns';
import { api } from '../../../utils/api';
import { useWorkoutStore } from '../workoutStore';

export const BELTS = {
  white:  { label: 'White',  color: '#F4F1EC', ink: '#3D2C3E' },
  blue:   { label: 'Blue',   color: '#2F6FD6', ink: '#FFFFFF' },
  purple: { label: 'Purple', color: '#7A3FB8', ink: '#FFFFFF' },
  brown:  { label: 'Brown',  color: '#7A4A2A', ink: '#FFFFFF' },
  black:  { label: 'Black',  color: '#1F1A1F', ink: '#FFFFFF' },
};

export const CLASS_TYPES = {
  gi:           { label: 'Gi',           emoji: '🥋', tint: '#E1EFFC' },
  nogi:         { label: 'No-Gi',        emoji: '🩳', tint: '#FFE8EE' },
  open_mat:     { label: 'Open mat',     emoji: '🤼', tint: '#DDF5E9' },
  fundamentals: { label: 'Fundamentals', emoji: '🌱', tint: '#E6F7E2' },
  advanced:     { label: 'Advanced',     emoji: '🔥', tint: '#FFEBDD' },
  competition:  { label: 'Competition',  emoji: '🏆', tint: '#FFF4D1' },
  drilling:     { label: 'Drilling',     emoji: '🔁', tint: '#EFE8FA' },
  private:      { label: 'Private',      emoji: '👤', tint: '#F1E6EA' },
  kids:         { label: 'Kids',         emoji: '🧒', tint: '#FFF4D1' },
  women:        { label: "Women's",      emoji: '🌸', tint: '#FFE8EE' },
};

export const POSITIONS = {
  closed_guard: 'Closed guard', open_guard: 'Open guard', half_guard: 'Half guard', butterfly: 'Butterfly',
  de_la_riva: 'De La Riva', x_guard: 'X-guard', spider_lasso: 'Spider / Lasso', mount: 'Mount',
  side_control: 'Side control', back: 'Back', north_south: 'North-south', knee_on_belly: 'Knee on belly',
  turtle: 'Turtle', standing: 'Standing', leg_entanglement: 'Leg locks', other: 'Other',
};

export const CATEGORIES = {
  submission: 'Submission', sweep: 'Sweep', pass: 'Pass', escape: 'Escape', takedown: 'Takedown',
  transition: 'Transition', control: 'Control', guard_retention: 'Guard retention', drill: 'Drill', concept: 'Concept', other: 'Other',
};

export const STATUSES = {
  to_learn: { label: 'To learn', emoji: '📌', cls: 'bg-surface-sunken text-ink-muted' },
  learning: { label: 'Learning', emoji: '🌱', cls: 'bg-amber-50 text-amber-300' },
  drilling: { label: 'Drilling', emoji: '🔁', cls: 'bg-sky-50 text-sky-300' },
  live:     { label: 'Can hit live', emoji: '⚡', cls: 'bg-emerald-50 text-emerald-300' },
};
export const STATUS_ORDER = ['to_learn', 'learning', 'drilling', 'live'];

// Techniques you're working on resurface after this many days without practice
export const REVIEW_AFTER_DAYS = 7;

export const useBjjStore = create((set, get) => ({
  profile: null,
  techniques: [],
  sessions: [],
  classes: [],
  isLoaded: false,

  fetchData: async () => {
    try {
      const [profile, techniques, sessions, classes] = await Promise.all([
        api.get('/bjj/profile'), api.get('/bjj/techniques'), api.get('/bjj/sessions'), api.get('/bjj/classes'),
      ]);
      set({ profile, techniques, sessions, classes, isLoaded: true });
    } catch {
      set({ isLoaded: true });
    }
  },

  saveProfile: async (profile) => set({ profile: await api.put('/bjj/profile', profile) }),

  // Techniques
  saveTechnique: async (technique, id) => {
    const saved = id ? await api.put(`/bjj/techniques/${id}`, technique) : await api.post('/bjj/techniques', technique);
    set(state => ({
      techniques: [...state.techniques.filter(t => t.id !== saved.id), { times_practiced: 0, ...state.techniques.find(t => t.id === saved.id), ...saved }]
        .sort((a, b) => a.name.localeCompare(b.name)),
    }));
    return saved;
  },
  importTechniques: async (techniques) => {
    const result = await api.post('/bjj/techniques/bulk', { techniques });
    set({ techniques: await api.get('/bjj/techniques') });
    return result;
  },
  markReviewed: async (id) => {
    const saved = await api.post(`/bjj/techniques/${id}/review`, {});
    set(state => ({ techniques: state.techniques.map(t => (t.id === id ? { ...t, ...saved } : t)) }));
  },
  deleteTechnique: async (id) => {
    const { techniques } = get();
    set({ techniques: techniques.filter(t => t.id !== id) });
    try { await api.delete(`/bjj/techniques/${id}`); } catch { set({ techniques }); }
  },

  // Sessions (each also logs a workout, so refresh the Workout Logger too)
  saveSession: async (session, id) => {
    const saved = id ? await api.put(`/bjj/sessions/${id}`, session) : await api.post('/bjj/sessions', session);
    set(state => ({
      sessions: [saved, ...state.sessions.filter(s => s.id !== saved.id)].sort((a, b) => b.date.localeCompare(a.date)),
    }));
    set({ techniques: await api.get('/bjj/techniques') }); // practice updates review dates
    useWorkoutStore.getState().refreshSessions();
    return saved;
  },
  deleteSession: async (id) => {
    const { sessions } = get();
    set({ sessions: sessions.filter(s => s.id !== id) });
    try {
      await api.delete(`/bjj/sessions/${id}`);
      useWorkoutStore.getState().refreshSessions();
    } catch { set({ sessions }); }
  },

  // Timetable
  saveClass: async (klass, id) => {
    const saved = id ? await api.put(`/bjj/classes/${id}`, klass) : await api.post('/bjj/classes', klass);
    set(state => ({ classes: [...state.classes.filter(c => c.id !== saved.id), saved] }));
    return saved;
  },
  importClasses: async (classes, { replace, source }) => {
    set({ classes: await api.post('/bjj/classes/bulk', { classes, replace, source }) });
  },
  deleteClass: async (id) => {
    const { classes } = get();
    set({ classes: classes.filter(c => c.id !== id) });
    try { await api.delete(`/bjj/classes/${id}`); } catch { set({ classes }); }
  },

  // ── Derived ───────────────────────────────────────────────────────────────

  getStats: () => {
    const { sessions, profile } = get();
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const thisMonth = sessions.filter(s => s.date >= monthStart);
    const minutes = (list) => list.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    const sincePromotion = profile?.promoted_on ? sessions.filter(s => s.date >= profile.promoted_on) : sessions;
    const hit = sessions.reduce((sum, s) => sum + (s.subs_hit || 0), 0);
    const caught = sessions.reduce((sum, s) => sum + (s.subs_caught || 0), 0);
    return {
      monthSessions: thisMonth.length,
      monthRounds: thisMonth.reduce((sum, s) => sum + (s.rounds || 0), 0),
      totalHours: Math.round(minutes(sessions) / 6) / 10,
      hoursSincePromotion: Math.round(minutes(sincePromotion) / 6) / 10,
      sessionsSincePromotion: sincePromotion.length,
      subsHit: hit,
      subsCaught: caught,
    };
  },

  getDueForReview: () => {
    const today = new Date();
    return get().techniques
      .filter(t => t.status === 'learning' || t.status === 'drilling')
      .filter(t => !t.last_reviewed || differenceInCalendarDays(today, parseISO(t.last_reviewed)) >= REVIEW_AFTER_DAYS)
      .sort((a, b) => (a.last_reviewed || '').localeCompare(b.last_reviewed || ''));
  },

  // The next class from now in the weekly timetable
  getNextClass: () => {
    const { classes } = get();
    if (classes.length === 0) return null;
    const now = new Date();
    const nowMinutes = now.getDay() * 1440 + now.getHours() * 60 + now.getMinutes();
    const toMinutes = (c) => c.weekday * 1440 + Number(c.start_time.slice(0, 2)) * 60 + Number(c.start_time.slice(3, 5));
    const sorted = [...classes].sort((a, b) => toMinutes(a) - toMinutes(b));
    const next = sorted.find(c => toMinutes(c) >= nowMinutes) || sorted[0];
    let minutesUntil = toMinutes(next) - nowMinutes;
    if (minutesUntil < 0) minutesUntil += 7 * 1440;
    return { ...next, minutesUntil };
  },
}));
