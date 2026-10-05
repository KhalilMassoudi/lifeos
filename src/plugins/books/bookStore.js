import { create } from 'zustand';
import { api } from '../../utils/api';
import { subDays, startOfYear, isSameDay, format, parseISO } from 'date-fns';

export const BOOK_STATUS = {
  WANT_TO_READ: 'want_to_read',
  READING: 'reading',
  FINISHED: 'finished',
  ABANDONED: 'abandoned'
};

const dateKey = (date) => format(date, 'yyyy-MM-dd');

export const useBookStore = create((set, get) => ({
  books: [],
  sessions: [],
  isLoaded: false,

  fetchData: async () => {
    try {
      const [books, sessions] = await Promise.all([
        api.get('/books'),
        api.get('/books/sessions')
      ]);
      set({ books, sessions, isLoaded: true });
    } catch (error) {
      console.error('Failed to fetch books data', error);
      set({ isLoaded: true });
    }
  },

  addBook: async (bookData) => {
    try {
      const newBook = await api.post('/books', bookData);
      set(state => ({ books: [newBook, ...state.books] }));
    } catch (error) {
      console.error('Failed to add book', error);
    }
  },

  updateBook: async (id, updates) => {
    const { books } = get();
    // Optimistic UI
    set(state => ({
      books: state.books.map(b => b.id === id ? { ...b, ...updates } : b)
    }));

    try {
      await api.put(`/books/${id}`, updates);
    } catch (error) {
      set({ books }); // Revert
    }
  },

  deleteBook: async (id) => {
    const { books } = get();
    set(state => ({
      books: state.books.filter(b => b.id !== id)
    }));
    try {
      await api.delete(`/books/${id}`);
    } catch (error) {
      set({ books });
    }
  },

  logSession: async (bookId, pagesRead, durationMinutes, notes) => {
    const { sessions, books } = get();
    const todayStr = dateKey(new Date());
    
    // Optimistic book update
    const bookToUpdate = books.find(b => b.id === bookId);
    if (bookToUpdate) {
      const newPages = (bookToUpdate.pages_read || 0) + pagesRead;
      set(state => ({
        books: state.books.map(b => b.id === bookId ? { ...b, pages_read: newPages } : b)
      }));
    }

    try {
      const newSession = await api.post('/books/sessions', {
        book_id: bookId,
        date: todayStr,
        pages_read: pagesRead,
        duration_minutes: durationMinutes,
        notes
      });
      set(state => ({ sessions: [newSession, ...state.sessions] }));
    } catch (error) {
      set({ sessions, books }); // Revert
    }
  },

  deleteSession: async (sessionId) => {
    const { sessions, books } = get();
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    // Optimistic: drop the session and take its pages back off the book
    set(state => ({
      sessions: state.sessions.filter(s => s.id !== sessionId),
      books: state.books.map(b => b.id === session.book_id
        ? { ...b, pages_read: Math.max((b.pages_read || 0) - (session.pages_read || 0), 0) }
        : b),
    }));

    try {
      await api.delete(`/books/sessions/${sessionId}`);
    } catch (error) {
      set({ sessions, books }); // Revert
    }
  },

  getStats: () => {
    const { books, sessions } = get();
    
    const yearStart = startOfYear(new Date());
    const finishedThisYear = books.filter(b => 
      b.status === BOOK_STATUS.FINISHED && 
      b.finish_date && parseISO(b.finish_date) >= yearStart
    ).length;

    const totalPagesRead = sessions.reduce((acc, s) => acc + (s.pages_read || 0), 0);
    
    // Average pages per day (over all days that have a session)
    const uniqueDays = new Set(sessions.map(s => s.date)).size;
    const avgPagesPerDay = uniqueDays > 0 ? Math.round(totalPagesRead / uniqueDays) : 0;

    // Current Streak
    let streak = 0;
    let d = new Date();
    while (true) {
      const key = dateKey(d);
      const hasSession = sessions.some(s => s.date === key);
      if (hasSession) {
        streak++;
        d = subDays(d, 1);
      } else {
        // If it's today and no session yet, we don't break the streak immediately, we check yesterday
        if (streak === 0 && isSameDay(d, new Date())) {
          d = subDays(d, 1);
        } else {
          break;
        }
      }
    }

    return { finishedThisYear, totalPagesRead, avgPagesPerDay, streak };
  },

  getHeatmapData: (days = 84) => {
    const { sessions } = get();
    const map = {};
    sessions.forEach(s => {
      map[s.date] = (map[s.date] || 0) + (s.pages_read || 0);
    });
    
    return Array.from({ length: days }, (_, i) => {
      const date = subDays(new Date(), days - 1 - i);
      const key = dateKey(date);
      return { date, key, value: map[key] || 0 };
    });
  }
}));
