import { create } from 'zustand';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { api } from '../../utils/api';

export const PRAYERS = [
  { id: 'fajr',    name: 'Fajr',    arabic: 'الفجر',    time: 'Before Sunrise' },
  { id: 'dhuhr',   name: 'Dhuhr',   arabic: 'الظهر',    time: 'Midday'         },
  { id: 'asr',     name: 'Asr',     arabic: 'العصر',    time: 'Afternoon'      },
  { id: 'maghrib', name: 'Maghrib', arabic: 'المغرب',   time: 'After Sunset'   },
  { id: 'isha',    name: 'Isha',    arabic: 'العشاء',   time: 'Night'          },
];

export const PRAYER_STATUS = {
  ONTIME:  'ontime',
  LATE:    'late',
  MISSED:  'missed',
  NONE:    null,
};

export const dateKey = (date) => format(date, 'yyyy-MM-dd');

export const getDayScore = (dayEntry) => {
  if (!dayEntry) return 0;
  return PRAYERS.reduce((acc, p) => {
    const status = dayEntry[p.id]?.status;
    if (status === PRAYER_STATUS.ONTIME || status === PRAYER_STATUS.LATE) return acc + 1;
    return acc;
  }, 0);
};

export const useSalahStore = create((set, get) => ({
  log: {},
  isLoaded: false,

  fetchData: async () => {
    try {
      const data = await api.get('/salah');
      set({ log: data || {}, isLoaded: true });
    } catch (error) {
      console.error('Failed to fetch salah logs', error);
      set({ isLoaded: true });
    }
  },

  setPrayerStatus: async (date, prayerId, status) => {
    const key = dateKey(date);
    const { log } = get();
    
    // Optimistic UI update
    set(state => ({
      log: {
        ...state.log,
        [key]: {
          ...state.log[key],
          [prayerId]: { ...(state.log[key]?.[prayerId] || {}), status },
        },
      },
    }));

    try {
      await api.post('/salah', { date: key, prayerId, status });
    } catch (error) {
      // Revert on failure
      set({ log });
    }
  },

  setPrayerNote: async (date, prayerId, note) => {
    const key = dateKey(date);
    const { log } = get();
    
    // Optimistic UI update
    set(state => ({
      log: {
        ...state.log,
        [key]: {
          ...state.log[key],
          [prayerId]: { ...(state.log[key]?.[prayerId] || {}), note },
        },
      },
    }));

    try {
      await api.post('/salah', { date: key, prayerId, note });
    } catch (error) {
      // Revert on failure
      set({ log });
    }
  },

  getDayEntry: (date) => get().log[dateKey(date)] || {},

  getWeeklyOverview: () => {
    const { log } = get();
    return Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const key = dateKey(date);
      const entry = log[key] || {};
      const score = getDayScore(entry);
      return { date, key, score, entry };
    });
  },

  getMonthlyCalendar: (year, month) => {
    const { log } = get();
    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(new Date(year, month - 1));
    return eachDayOfInterval({ start, end }).map(date => {
      const key = dateKey(date);
      const entry = log[key] || {};
      const score = getDayScore(entry);
      return { date, key, score };
    });
  },

  getCurrentStreak: () => {
    const { log } = get();
    let streak = 0;
    let d = new Date();
    while (true) {
      const key = dateKey(d);
      const entry = log[key] || {};
      const score = getDayScore(entry);
      if (score === 5) {
        streak++;
        d = subDays(d, 1);
      } else {
        break;
      }
    }
    return streak;
  },

  getBestStreak: () => {
    const { log } = get();
    const keys = Object.keys(log).sort();
    if (keys.length === 0) return 0;
    let best = 0;
    let current = 0;
    let prev = null;
    for (const key of keys) {
      const score = getDayScore(log[key]);
      if (score === 5) {
        if (prev) {
          const prevDate = parseISO(prev);
          const currDate = parseISO(key);
          const diff = (currDate - prevDate) / (1000 * 60 * 60 * 24);
          if (diff === 1) current++;
          else current = 1;
        } else {
          current = 1;
        }
        best = Math.max(best, current);
        prev = key;
      } else {
        current = 0;
        prev = null;
      }
    }
    return best;
  },

  getMonthlyStats: (year, month) => {
    const { log } = get();
    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(new Date(year, month - 1));
    const days = eachDayOfInterval({ start, end });
    let totalOnTime = 0, totalLate = 0, totalMissed = 0, totalLogged = 0;
    for (const day of days) {
      const entry = log[dateKey(day)] || {};
      for (const p of PRAYERS) {
        const s = entry[p.id]?.status;
        if (s === PRAYER_STATUS.ONTIME) totalOnTime++;
        else if (s === PRAYER_STATUS.LATE) totalLate++;
        else if (s === PRAYER_STATUS.MISSED) totalMissed++;
        if (s) totalLogged++;
      }
    }
    return { totalOnTime, totalLate, totalMissed, totalLogged };
  },
}));
