import { create } from 'zustand';
import { api } from '../utils/api';

// All available plugins definition
export const ALL_PLUGINS = [
  { id: 'salah-quran', name: 'Salah & Quran Tracker', description: 'Track your 5 daily prayers and Quran memorization journey with streaks, stats, and insights.', icon: '🕌', emoji: '🕌', color: 'from-gold-500 to-sage-400', available: true },
  { id: 'movies', name: 'Movies & Series', description: 'Track what you\'ve watched, your watchlist, and ratings.', icon: '🎬', emoji: '🎬', color: 'from-purple-600 to-pink-500', available: true },
  { id: 'books', name: 'Books Tracker', description: 'Your reading list, progress tracker, and book reviews.', icon: '📚', emoji: '📚', color: 'from-amber-600 to-orange-500', available: true },
  { id: 'habits', name: 'Habit Tracker', description: 'Build and maintain positive habits with streaks and analytics.', icon: '⏱', emoji: '⏱', color: 'from-cyan-600 to-blue-500', available: true },
  { id: 'routine', name: 'Daily Routine', description: 'Plan and schedule your daily routine with time blocks.', icon: '🗓', emoji: '🗓', color: 'from-teal-600 to-emerald-500', available: true },
  { id: 'period', name: 'Period & Cycle', description: 'Track your cycle, symptoms, fertility, predictions, and personal phase insights.', icon: '🌸', emoji: '🌸', color: 'from-rose-500 to-pink-400', available: true },
  { id: 'meals', name: 'Meal Tracker', description: 'Log meals, track macros (protein, carbs, fat, calories), hit daily nutrition goals with smart food search.', icon: '🥗', emoji: '🥗', color: 'from-green-500 to-emerald-400', available: true },
  { id: 'journal', name: 'Notes & Journal', description: 'Private journal, quick notes, and daily reflections.', icon: '📝', emoji: '📝', color: 'from-violet-600 to-indigo-500', available: false },
  { id: 'links', name: 'Save Links & Videos', description: 'Bookmark articles, videos, and resources for later.', icon: '🔗', emoji: '🔗', color: 'from-sky-600 to-blue-600', available: false },
  { id: 'workout', name: 'Workout Logger', description: 'Log your workouts, track progress, and set fitness goals.', icon: '💪', emoji: '💪', color: 'from-red-600 to-rose-500', available: false },
];

export const usePluginStore = create((set, get) => ({
  activePlugins: [],
  currentPluginId: null,
  isStoreOpen: false,
  isLoaded: false,

  fetchPlugins: async () => {
    try {
      const activeIds = await api.get('/plugins');
      const current = activeIds.length > 0 ? activeIds[0] : null;
      set({ activePlugins: activeIds, currentPluginId: current, isLoaded: true });
    } catch (error) {
      console.error('Failed to fetch plugins', error);
      set({ isLoaded: true });
    }
  },

  activatePlugin: async (id) => {
    const { activePlugins } = get();
    if (!activePlugins.includes(id)) {
      // Optimistic update
      set({ activePlugins: [...activePlugins, id], currentPluginId: id, isStoreOpen: false });
      try {
        await api.post('/plugins/toggle', { pluginId: id, isActive: true });
      } catch (error) {
        // Revert on failure
        set({ activePlugins });
      }
    }
  },

  deactivatePlugin: async (id) => {
    const { activePlugins, currentPluginId } = get();
    const updated = activePlugins.filter(p => p !== id);
    
    // Optimistic update
    set({
      activePlugins: updated,
      currentPluginId: currentPluginId === id ? (updated[0] || null) : currentPluginId,
    });
    
    try {
      await api.post('/plugins/toggle', { pluginId: id, isActive: false });
    } catch (error) {
      // Revert on failure
      set({ activePlugins, currentPluginId });
    }
  },

  setCurrentPlugin: (id) => set({ currentPluginId: id, isStoreOpen: false }),

  openStore: () => set({ isStoreOpen: true }),
  closeStore: () => set({ isStoreOpen: false }),
  toggleStore: () => set(s => ({ isStoreOpen: !s.isStoreOpen })),

  getPlugin: (id) => ALL_PLUGINS.find(p => p.id === id),
  getActivePluginDefs: () => {
    const { activePlugins } = get();
    return activePlugins.map(id => ALL_PLUGINS.find(p => p.id === id)).filter(Boolean);
  },
}));
