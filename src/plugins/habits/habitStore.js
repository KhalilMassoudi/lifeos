import { create } from 'zustand';
import { api } from '../../utils/api';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';

const dateKey = (date) => format(date, 'yyyy-MM-dd');

export const useHabitStore = create((set, get) => ({
  habits: [],
  logs: [], // Array of { habit_id, date, completed }
  isLoaded: false,

  fetchData: async () => {
    try {
      const [habits, logs] = await Promise.all([
        api.get('/habits'),
        api.get('/habits/logs')
      ]);
      set({ habits, logs, isLoaded: true });
    } catch (error) {
      console.error('Failed to fetch habits', error);
      set({ isLoaded: true });
    }
  },

  addHabit: async (habitData) => {
    try {
      const newHabit = await api.post('/habits', habitData);
      set(state => ({ habits: [newHabit, ...state.habits] }));
    } catch (error) {
      console.error('Failed to add habit', error);
    }
  },

  updateHabit: async (id, updates) => {
    const { habits } = get();
    set(state => ({
      habits: state.habits.map(h => h.id === id ? { ...h, ...updates } : h)
    }));
    try {
      await api.put(`/habits/${id}`, updates);
    } catch (error) {
      set({ habits });
    }
  },

  deleteHabit: async (id) => {
    const { habits, logs } = get();
    set(state => ({
      habits: state.habits.filter(h => h.id !== id),
      logs: state.logs.filter(l => l.habit_id !== id)
    }));
    try {
      await api.delete(`/habits/${id}`);
    } catch (error) {
      set({ habits, logs });
    }
  },

  toggleLog: async (habitId, dateObj) => {
    const { logs } = get();
    const dateStr = dateKey(dateObj);
    
    const existingLog = logs.find(l => l.habit_id === habitId && l.date === dateStr);
    const newCompletedState = existingLog ? !existingLog.completed : true;

    // Optimistic UI
    if (existingLog) {
      set(state => ({
        logs: state.logs.map(l => l.habit_id === habitId && l.date === dateStr ? { ...l, completed: newCompletedState } : l)
      }));
    } else {
      set(state => ({
        logs: [...state.logs, { habit_id: habitId, date: dateStr, completed: newCompletedState }]
      }));
    }

    try {
      await api.post('/habits/logs/toggle', { habit_id: habitId, date: dateStr, completed: newCompletedState });
    } catch (error) {
      set({ logs }); // Revert
    }
  },

  getLogStatus: (habitId, dateObj) => {
    const dateStr = dateKey(dateObj);
    const log = get().logs.find(l => l.habit_id === habitId && l.date === dateStr);
    return log ? log.completed : false;
  },

  getHabitStreak: (habitId) => {
    const { logs } = get();
    const habitLogs = logs.filter(l => l.habit_id === habitId && l.completed);
    
    let streak = 0;
    let d = new Date();
    while (true) {
      const key = dateKey(d);
      const isCompleted = habitLogs.some(l => l.date === key);
      
      if (isCompleted) {
        streak++;
        d = subDays(d, 1);
      } else {
        if (streak === 0 && isSameDay(d, new Date())) {
          d = subDays(d, 1);
        } else {
          break;
        }
      }
    }
    return streak;
  },

  getStats: () => {
    const { habits, logs } = get();
    
    let bestStreak = 0;
    let mostConsistentHabit = 'None';
    
    // Quick 30-day completion rate
    const thirtyDaysAgo = subDays(new Date(), 30);
    const recentLogs = logs.filter(l => new Date(l.date) >= thirtyDaysAgo && l.completed);
    
    habits.forEach(h => {
      const streak = get().getHabitStreak(h.id);
      if (streak > bestStreak) {
        bestStreak = streak;
        mostConsistentHabit = h.name;
      }
    });

    const completionRate = habits.length > 0 
      ? Math.round((recentLogs.length / (habits.length * 30)) * 100) 
      : 0;

    return { 
      totalActive: habits.length, 
      bestStreak, 
      mostConsistentHabit,
      completionRate: Math.min(completionRate, 100)
    };
  }
}));
