import { create } from 'zustand';
import { api } from '../utils/api';

// All available plugins definition
export const ALL_PLUGINS = [
  { id: 'salah-quran', name: 'Salah & Quran Tracker', description: 'Track your 5 daily prayers and Quran memorization journey with streaks, stats, and insights.', icon: '🕌', emoji: '🕌', color: 'from-gold-500 to-sage-400', tint: '#E8F5EC', available: true },
  { id: 'movies', name: 'Movies & Series', description: 'Track what you\'ve watched, your watchlist, and ratings.', icon: '🎬', emoji: '🎬', color: 'from-purple-600 to-pink-500', tint: '#F1E9FB', available: true },
  { id: 'books', name: 'Books Tracker', description: 'Your reading list, progress tracker, and book reviews.', icon: '📚', emoji: '📚', color: 'from-amber-600 to-orange-500', tint: '#FFF0DE', available: true },
  { id: 'habits', name: 'Habit Tracker', description: 'Build and maintain positive habits with streaks and analytics.', icon: '⏱', emoji: '⏱', color: 'from-cyan-600 to-blue-500', tint: '#E3F3F9', available: true },
  { id: 'routine', name: 'Daily Routine', description: 'Plan and schedule your daily routine with time blocks.', icon: '🗓', emoji: '🗓', color: 'from-teal-600 to-emerald-500', tint: '#E2F6EE', available: true },
  { id: 'period', name: 'Period & Cycle', description: 'Track your cycle, symptoms, fertility, predictions, and personal phase insights.', icon: '🌸', emoji: '🌸', color: 'from-rose-500 to-pink-400', tint: '#FFE8EE', available: true },
  { id: 'meals', name: 'Meal Tracker', description: 'Log meals, track macros (protein, carbs, fat, calories), hit daily nutrition goals with smart food search.', icon: '🥗', emoji: '🥗', color: 'from-green-500 to-emerald-400', tint: '#E6F7E2', available: true },
  { id: 'journal', name: 'Notes & Journal', description: 'A private journal with moods and tags, sticky notes, and a love-notes wall you share with your partner.', icon: '📝', emoji: '📝', color: 'from-violet-600 to-indigo-500', tint: '#EFE8FA', available: true },
  { id: 'links', name: 'Save Links & Videos', description: 'Bookmark articles, videos, and resources for later.', icon: '🔗', emoji: '🔗', color: 'from-sky-600 to-blue-600', tint: '#E1EFFC', available: false },
  { id: 'workout', name: 'Workout Logger', description: 'Log strength and cardio workouts, reuse templates, hit a weekly goal and track personal records.', icon: '💪', emoji: '💪', color: 'from-red-600 to-rose-500', tint: '#FFE9E3', available: true },
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
