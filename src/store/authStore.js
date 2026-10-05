import { create } from 'zustand';
import { api, SESSION_EXPIRED_EVENT } from '../utils/api';
import { applyAccent } from '../theme/palettes';

const TOKEN_KEY = 'lifeos_session_token';
const STORAGE_KEYS = {
  FAILED_ATTEMPTS: 'lifeos_fa',
  LOCKOUT_UNTIL: 'lifeos_lu',
  LAST_PROFILE: 'lifeos_last_profile',
};
const SESSION_EXPIRED_FLAG = 'lifeos_session_expired';

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

const readNumber = (key) => parseInt(localStorage.getItem(key) || '0', 10);

export const useAuthStore = create((set, get) => ({
  isAuthenticated: false,
  isLoading: true,
  isNewUser: false,
  profiles: [],
  currentUser: null,
  error: null,
  failedAttempts: readNumber(STORAGE_KEYS.FAILED_ATTEMPTS),
  lockoutUntil: readNumber(STORAGE_KEYS.LOCKOUT_UNTIL),

  initialize: async () => {
    try {
      const { hasUser, profiles } = await api.get('/auth/status');

      if (!hasUser) {
        set({ isLoading: false, isNewUser: true, isAuthenticated: false, profiles: [] });
        return;
      }

      if (sessionStorage.getItem(TOKEN_KEY)) {
        const { valid, user } = await api.get('/auth/me');
        if (valid) {
          applyAccent(user.color);
          set({ isAuthenticated: true, isLoading: false, isNewUser: false, profiles, currentUser: user });
          return;
        }
        sessionStorage.removeItem(TOKEN_KEY);
      }

      const expired = sessionStorage.getItem(SESSION_EXPIRED_FLAG);
      sessionStorage.removeItem(SESSION_EXPIRED_FLAG);
      set({
        isLoading: false, isNewUser: false, isAuthenticated: false, profiles,
        error: expired ? 'Your session expired. Please unlock again.' : null,
      });
    } catch (error) {
      set({ isLoading: false, error: 'Could not connect to server.' });
    }
  },

  // First run: create the first profile
  register: async ({ name, avatar, color, password }) => {
    if (!name?.trim()) {
      set({ error: 'Please enter your name.' });
      return false;
    }
    if (!password || password.length < 6) {
      set({ error: 'Password must be at least 6 characters.' });
      return false;
    }

    try {
      const { token, user } = await api.post('/auth/register', { name, avatar, color, password });
      sessionStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(STORAGE_KEYS.LAST_PROFILE, user.id);
      applyAccent(user.color);
      set({ isAuthenticated: true, isNewUser: false, error: null, currentUser: user, profiles: [user] });
      return true;
    } catch (error) {
      set({ error: error.message || 'Registration failed.' });
      return false;
    }
  },

  login: async (userId, password) => {
    const state = get();

    const now = Date.now();
    if (state.lockoutUntil > now) {
      const remaining = Math.ceil((state.lockoutUntil - now) / 1000);
      set({ error: `Locked. Try again in ${remaining}s.` });
      return false;
    }

    try {
      const { token, user } = await api.post('/auth/login', { userId, password });
      sessionStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(STORAGE_KEYS.FAILED_ATTEMPTS, '0');
      localStorage.setItem(STORAGE_KEYS.LOCKOUT_UNTIL, '0');
      localStorage.setItem(STORAGE_KEYS.LAST_PROFILE, user.id);

      applyAccent(user.color);
      set({ isAuthenticated: true, error: null, failedAttempts: 0, lockoutUntil: 0, currentUser: user });
      return true;
    } catch (error) {
      const newAttempts = state.failedAttempts + 1;
      localStorage.setItem(STORAGE_KEYS.FAILED_ATTEMPTS, String(newAttempts));

      if (newAttempts >= MAX_ATTEMPTS) {
        const lockUntil = now + LOCKOUT_DURATION_MS;
        localStorage.setItem(STORAGE_KEYS.LOCKOUT_UNTIL, String(lockUntil));
        set({ failedAttempts: newAttempts, lockoutUntil: lockUntil, error: 'Too many attempts. Locked for 5 minutes.' });
      } else {
        const left = MAX_ATTEMPTS - newAttempts;
        set({ failedAttempts: newAttempts, error: `Incorrect password. ${left} attempt${left !== 1 ? 's' : ''} remaining.` });
      }
      return false;
    }
  },

  // Reload so no store keeps the previous profile's data in memory
  lock: () => {
    sessionStorage.removeItem(TOKEN_KEY);
    window.location.reload();
  },

  // Signed in: create another profile (e.g. your partner)
  addProfile: async ({ name, avatar, color, password }) => {
    const user = await api.post('/auth/profiles', { name, avatar, color, password });
    set(state => ({ profiles: [...state.profiles, user] }));
    return user;
  },

  updateProfile: async (updates) => {
    const user = await api.patch('/auth/me', updates);
    applyAccent(user.color);
    set(state => ({
      currentUser: user,
      profiles: state.profiles.map(p => (p.id === user.id ? user : p)),
    }));
    return user;
  },

  changePassword: (currentPassword, newPassword) =>
    api.post('/auth/me/password', { currentPassword, newPassword }),

  getLastProfileId: () => localStorage.getItem(STORAGE_KEYS.LAST_PROFILE),

  clearError: () => set({ error: null }),
}));

// Expired/invalid token on any API call → back to the lock screen (reloading
// clears every store), with a note so the lock screen can say why
window.addEventListener(SESSION_EXPIRED_EVENT, () => {
  sessionStorage.setItem(SESSION_EXPIRED_FLAG, '1');
  window.location.reload();
});
