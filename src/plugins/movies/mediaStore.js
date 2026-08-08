import { create } from 'zustand';
import { api } from '../../utils/api';
import { useToastStore } from '../../store/toastStore';

export const MEDIA_STATUS = {
  WANT_TO_WATCH: 'want_to_watch',
  WATCHING: 'watching',
  COMPLETED: 'completed',
  DROPPED: 'dropped'
};

export const MEDIA_TYPE = {
  MOVIE: 'movie',
  SERIES: 'series',
  ANIME: 'anime'
};

export const useMediaStore = create((set, get) => ({
  items: [],
  isLoaded: false,

  fetchData: async () => {
    try {
      const data = await api.get('/media');
      set({ items: data, isLoaded: true });
    } catch (error) {
      console.error('Failed to fetch media data', error);
      set({ isLoaded: true });
    }
  },

  addItem: async (itemData) => {
    try {
      const newItem = await api.post('/media', itemData);
      set(state => ({ items: [newItem, ...state.items] }));
      useToastStore.getState().addToast(`"${itemData.title}" added to watchlist.`, 'success');
    } catch (error) {
      console.error('Failed to add media item', error);
      useToastStore.getState().addToast('Failed to add media item.', 'error');
    }
  },

  updateItem: async (id, updates) => {
    const { items } = get();
    
    // Support user_rating field mapping (both rating and user_rating in db updates)
    const dbUpdates = { ...updates };
    if (updates.rating !== undefined) {
      dbUpdates.user_rating = updates.rating;
    }
    
    // Optimistic UI
    set(state => ({
      items: state.items.map(item => item.id === id ? { ...item, ...updates } : item)
    }));

    try {
      await api.patch(`/movies/${id}`, dbUpdates);
    } catch (error) {
      console.error('Failed to update media item', error);
      // Revert on failure
      set({ items });
      useToastStore.getState().addToast('Failed to update media item. Reverting changes.', 'error');
      throw error;
    }
  },

  deleteItem: async (id) => {
    const { items } = get();
    const itemToDelete = items.find(item => item.id === id);
    const title = itemToDelete ? itemToDelete.title : 'Item';
    
    // Optimistic UI
    set(state => ({
      items: state.items.filter(item => item.id !== id)
    }));

    try {
      await api.delete(`/media/${id}`);
      useToastStore.getState().addToast(`"${title}" deleted successfully.`, 'success');
    } catch (error) {
      console.error('Failed to delete media item', error);
      // Revert on failure
      set({ items });
      useToastStore.getState().addToast('Failed to delete media item.', 'error');
    }
  },

  getItemsByType: (type) => {
    return get().items.filter(item => item.type === type);
  },

  getStats: (type) => {
    const items = get().getItemsByType(type);
    const completed = items.filter(i => i.status === MEDIA_STATUS.COMPLETED).length;
    
    // Average rating for completed or watching items that have a rating
    const ratedItems = items.filter(i => i.rating > 0);
    const avgRating = ratedItems.length > 0
      ? (ratedItems.reduce((acc, curr) => acc + curr.rating, 0) / ratedItems.length).toFixed(1)
      : 0;

    // Favorite genre
    const genreCounts = {};
    items.forEach(i => {
      (i.genres || []).forEach(g => {
        genreCounts[g] = (genreCounts[g] || 0) + 1;
      });
    });
    const favGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

    return { totalWatched: completed, avgRating, favGenre };
  },

  surpriseMe: (type) => {
    const items = get().getItemsByType(type).filter(i => i.status === MEDIA_STATUS.WANT_TO_WATCH);
    if (items.length === 0) return null;
    const randIndex = Math.floor(Math.random() * items.length);
    return items[randIndex];
  }
}));
