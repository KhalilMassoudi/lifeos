import { create } from 'zustand';
import { api, SESSION_EXPIRED_EVENT } from '../utils/api';

const STORAGE_KEYS = {
  FAILED_ATTEMPTS: 'lifeos_fa',
  LOCKOUT_UNTIL: 'lifeos_lu',
};

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export const useAuthStore = create((set, get) => ({
  isAuthenticated: false,
  isLoading: true,
  isNewUser: false,
  error: null,
  failedAttempts: parseInt(localStorage.getItem(STORAGE_KEYS.FAILED_ATTEMPTS) || '0'),
  lockoutUntil: parseInt(localStorage.getItem(STORAGE_KEYS.LOCKOUT_UNTIL) || '0'),

  initialize: async () => {
    try {
      // Check if any user exists in DB
      const { hasUser } = await api.get('/auth/status');
      
      if (!hasUser) {
        set({ isLoading: false, isNewUser: true, isAuthenticated: false });
        return;
      }

      // Has user, verify current session token
      const token = sessionStorage.getItem('lifeos_session_token');
      if (token) {
        const { valid } = await api.get('/auth/me');
        if (valid) {
          set({ isAuthenticated: true, isLoading: false, isNewUser: false });
          return;
        } else {
          sessionStorage.removeItem('lifeos_session_token');
        }
      }

      set({ isLoading: false, isNewUser: false, isAuthenticated: false });
    } catch (error) {
      set({ isLoading: false, error: 'Could not connect to server.' });
    }
  },

  setPassword: async (password) => {
    if (!password || password.length < 6) {
      set({ error: 'Password must be at least 6 characters.' });
      return false;
    }

    try {
      const { token } = await api.post('/auth/register', { password });
      sessionStorage.setItem('lifeos_session_token', token);
      set({ isAuthenticated: true, isNewUser: false, error: null, failedAttempts: 0 });
      return true;
    } catch (error) {
      set({ error: error.message || 'Registration failed.' });
      return false;
    }
  },

  login: async (password) => {
    const state = get();

    // Check lockout
    const now = Date.now();
    if (state.lockoutUntil > now) {
      const remaining = Math.ceil((state.lockoutUntil - now) / 1000);
      set({ error: `Locked. Try again in ${remaining}s.` });
      return false;
    }

    try {
      const { token } = await api.post('/auth/login', { password });
      sessionStorage.setItem('lifeos_session_token', token);
      
      // Reset counters
      localStorage.setItem(STORAGE_KEYS.FAILED_ATTEMPTS, '0');
      localStorage.setItem(STORAGE_KEYS.LOCKOUT_UNTIL, '0');

      set({ isAuthenticated: true, error: null, failedAttempts: 0, lockoutUntil: 0 });
      return true;
    } catch (error) {
      const newAttempts = state.failedAttempts + 1;
      localStorage.setItem(STORAGE_KEYS.FAILED_ATTEMPTS, String(newAttempts));

      if (newAttempts >= MAX_ATTEMPTS) {
        const lockUntil = now + LOCKOUT_DURATION_MS;
        localStorage.setItem(STORAGE_KEYS.LOCKOUT_UNTIL, String(lockUntil));
        set({
          failedAttempts: newAttempts,
          lockoutUntil: lockUntil,
          error: `Too many attempts. Locked for 5 minutes.`,
        });
      } else {
        set({
          failedAttempts: newAttempts,
          error: `Incorrect password. ${MAX_ATTEMPTS - newAttempts} attempt${MAX_ATTEMPTS - newAttempts !== 1 ? 's' : ''} remaining.`,
        });
      }
      return false;
    }
  },

  lock: () => {
    sessionStorage.removeItem('lifeos_session_token');
    set({ isAuthenticated: false, error: null });
  },

  clearError: () => set({ error: null }),

  getLockoutRemaining: () => {
    const { lockoutUntil } = get();
    const remaining = Math.max(0, lockoutUntil - Date.now());
    return Math.ceil(remaining / 1000);
  },
}));

// Expired/invalid token on any API call → back to the lock screen
window.addEventListener(SESSION_EXPIRED_EVENT, () => {
  useAuthStore.setState({ isAuthenticated: false, error: 'Your session expired. Please unlock again.' });
});
