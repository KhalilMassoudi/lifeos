import { create } from 'zustand';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { api } from '../../utils/api';
import { SURAHS } from './data/surahs';

export const SESSION_TYPES = [
  { id: 'tilawah',   label: 'Tilawah',   arabic: 'تلاوة',   desc: 'Reading / Recitation', icon: '📖' },
  { id: 'hifz',      label: 'Hifz',      arabic: 'حفظ',     desc: 'Memorization',         icon: '🧠' },
  { id: 'muraja',    label: "Muraja'ah", arabic: 'مراجعة',  desc: 'Revision',             icon: '🔁' },
];

export const AYAH_STATUS = {
  MEMORIZED: 'memorized',
  IN_PROGRESS: 'inprogress',
  NOT_STARTED: 'notstarted',
};

const dateKey = (date) => format(date, 'yyyy-MM-dd');

// Load reminder settings from localStorage manually (browser specific)
const loadReminders = () => {
  try {
    return JSON.parse(localStorage.getItem('lifeos_quran_reminders')) || {
      enabled: false,
      time: '06:00',
      message: "It's time for your daily Quran session 📖",
    };
  } catch {
    return { enabled: false, time: '06:00', message: "It's time for your daily Quran session 📖" };
  }
};

export const useQuranStore = create((set, get) => ({
  sessions: [],
  memorizationMap: {},
  currentSurahNumber: null,
  currentAyah: 1,
  
  // Reminders
  reminderEnabled: loadReminders().enabled,
  reminderTime: loadReminders().time,
  reminderMessage: loadReminders().message,

  isLoaded: false,

  fetchData: async () => {
    try {
      const [sessions, memorizationMap] = await Promise.all([
        api.get('/quran/sessions'),
        api.get('/quran/memorization')
      ]);
      
      // We need to map Surah name and Arabic since DB only stores surahNumber
      const enrichedSessions = sessions.map(s => {
        const surah = SURAHS.find(su => su.number === s.surah_number) || SURAHS[0];
        return {
          id: s.id,
          surahNumber: s.surah_number,
          surahName: surah.name,
          surahArabic: surah.arabic,
          fromAyah: s.from_ayah,
          toAyah: s.to_ayah,
          duration: s.duration,
          sessionType: s.session_type,
          difficulty: s.difficulty,
          notes: s.notes,
          date: s.date,
          createdAt: new Date(s.created_at).getTime(),
        };
      });

      set({ sessions: enrichedSessions, memorizationMap, isLoaded: true });
    } catch (error) {
      console.error('Failed to fetch quran data', error);
      set({ isLoaded: true });
    }
  },

  addSession: async (sessionData) => {
    try {
      const newSession = await api.post('/quran/sessions', {
        ...sessionData,
        date: dateKey(new Date()),
      });
      
      const surah = SURAHS.find(su => su.number === newSession.surah_number) || SURAHS[0];
      const enrichedSession = {
        id: newSession.id,
        surahNumber: newSession.surah_number,
        surahName: surah.name,
        surahArabic: surah.arabic,
        fromAyah: newSession.from_ayah,
        toAyah: newSession.to_ayah,
        duration: newSession.duration,
        sessionType: newSession.session_type,
        difficulty: newSession.difficulty,
        notes: newSession.notes,
        date: newSession.date,
        createdAt: new Date(newSession.created_at).getTime(),
      };

      set(state => ({ sessions: [enrichedSession, ...state.sessions] }));
    } catch (error) {
      console.error('Failed to add session', error);
    }
  },

  deleteSession: async (id) => {
    const { sessions } = get();
    // Optimistic delete
    set({ sessions: sessions.filter(s => s.id !== id) });
    try {
      await api.delete(`/quran/sessions/${id}`);
    } catch (error) {
      // Revert on failure
      set({ sessions });
    }
  },

  toggleAyahStatus: async (surahNumber, ayahNumber) => {
    const { memorizationMap } = get();
    const current = memorizationMap[surahNumber]?.[ayahNumber] || AYAH_STATUS.NOT_STARTED;
    const next =
      current === AYAH_STATUS.NOT_STARTED ? AYAH_STATUS.IN_PROGRESS :
      current === AYAH_STATUS.IN_PROGRESS ? AYAH_STATUS.MEMORIZED :
      AYAH_STATUS.NOT_STARTED;
    
    // Optimistic update
    set(state => ({
      memorizationMap: {
        ...state.memorizationMap,
        [surahNumber]: {
          ...(state.memorizationMap[surahNumber] || {}),
          [ayahNumber]: next,
        },
      },
    }));

    try {
      await api.post('/quran/memorization/toggle', { surahNumber, ayahNumber, status: next });
    } catch (error) {
      // Revert on failure
      set({ memorizationMap });
    }
  },

  getAyahStatus: (surahNumber, ayahNumber) => {
    return get().memorizationMap[surahNumber]?.[ayahNumber] || AYAH_STATUS.NOT_STARTED;
  },

  getSurahProgress: (surahNumber, totalAyahs) => {
    const surahMap = get().memorizationMap[surahNumber] || {};
    const memorized = Object.values(surahMap).filter(s => s === AYAH_STATUS.MEMORIZED).length;
    const inProgress = Object.values(surahMap).filter(s => s === AYAH_STATUS.IN_PROGRESS).length;
    return { memorized, inProgress, total: totalAyahs, percentage: Math.round((memorized / totalAyahs) * 100) };
  },

  getTotalMemorized: () => {
    const { memorizationMap } = get();
    return Object.values(memorizationMap).reduce((total, surahMap) => {
      return total + Object.values(surahMap).filter(s => s === AYAH_STATUS.MEMORIZED).length;
    }, 0);
  },

  getCompletedSurahs: (surahList) => {
    const { memorizationMap } = get();
    return surahList.filter(s => {
      const surahMap = memorizationMap[s.number] || {};
      const memorized = Object.values(surahMap).filter(st => st === AYAH_STATUS.MEMORIZED).length;
      return memorized === s.ayahs;
    });
  },

  setCurrentSurah: (surahNumber) => set({ currentSurahNumber: surahNumber, currentAyah: 1 }),
  setCurrentAyah: (ayah) => set({ currentAyah: ayah }),

  getSessionsByDate: () => {
    const { sessions } = get();
    return sessions.reduce((groups, session) => {
      const key = session.date;
      if (!groups[key]) groups[key] = [];
      groups[key].push(session);
      return groups;
    }, {});
  },

  getHeatmapData: (days = 84) => {
    const { sessions } = get();
    const map = {};
    sessions.forEach(s => { map[s.date] = (map[s.date] || 0) + (s.duration || 0); });
    return Array.from({ length: days }, (_, i) => {
      const date = subDays(new Date(), days - 1 - i);
      const key = dateKey(date);
      return { date, key, minutes: map[key] || 0 };
    });
  },

  getTimeStats: () => {
    const { sessions } = get();
    const now = new Date();
    const weekStart = dateKey(startOfWeek(now, { weekStartsOn: 1 }));
    const weekEnd = dateKey(endOfWeek(now, { weekStartsOn: 1 }));
    const monthStart = dateKey(startOfMonth(now));
    const monthEnd = dateKey(endOfMonth(now));

    let weekTotal = 0, monthTotal = 0, sessionCount = 0;
    const dayMap = {};

    sessions.forEach(s => {
      if (s.date >= weekStart && s.date <= weekEnd) weekTotal += s.duration || 0;
      if (s.date >= monthStart && s.date <= monthEnd) monthTotal += s.duration || 0;
      dayMap[s.date] = (dayMap[s.date] || 0) + (s.duration || 0);
      sessionCount++;
    });

    const avgSession = sessionCount > 0
      ? Math.round(sessions.reduce((a, s) => a + (s.duration || 0), 0) / sessionCount)
      : 0;

    const dayOfWeekMap = { 0:0,1:0,2:0,3:0,4:0,5:0,6:0 };
    sessions.forEach(s => {
      const d = new Date(s.date).getDay();
      dayOfWeekMap[d] = (dayOfWeekMap[d] || 0) + (s.duration || 0);
    });
    const bestDow = Object.entries(dayOfWeekMap).sort((a,b)=>b[1]-a[1])[0];
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const bestDay = bestDow[1] > 0 ? days[parseInt(bestDow[0])] : null;

    return { weekTotal, monthTotal, avgSession, bestDay, sessionCount };
  },

  setReminder: (enabled, time, message) => {
    set({ reminderEnabled: enabled, reminderTime: time, reminderMessage: message });
    localStorage.setItem('lifeos_quran_reminders', JSON.stringify({ enabled, time, message }));
  },
}));
