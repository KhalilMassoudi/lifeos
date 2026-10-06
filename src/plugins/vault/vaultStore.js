import { create } from 'zustand';
import { api } from '../../utils/api';
import {
  createVault, unlockVault, rewrapVault, encryptEntry, decryptEntry, isCryptoAvailable,
} from './vaultCrypto';

export const CATEGORIES = {
  login:  { label: 'Login',   emoji: '🔑' },
  email:  { label: 'Email',   emoji: '✉️' },
  social: { label: 'Social',  emoji: '💬' },
  bank:   { label: 'Banking', emoji: '🏦' },
  wifi:   { label: 'Wi-Fi',   emoji: '📶' },
  other:  { label: 'Other',   emoji: '📦' },
};

export const AUTO_LOCK_MS = 5 * 60 * 1000;

let autoLockTimer = null;

// The data key and decrypted entries live only in this store's memory —
// never in localStorage — and are dropped on lock.
export const useVaultStore = create((set, get) => ({
  status: 'loading', // loading | unsupported | setup | locked | unlocked
  record: null,
  dataKey: null,
  entries: [], // decrypted: { id, created_at, updated_at, title, username, password, url, notes, category, favorite }

  init: async () => {
    if (!isCryptoAvailable()) return set({ status: 'unsupported' });
    try {
      const record = await api.get('/vault/key');
      set({ record, status: record ? (get().dataKey ? 'unlocked' : 'locked') : 'setup' });
    } catch {
      set({ status: 'locked' });
    }
  },

  setup: async (password) => {
    const { record, dataKey } = await createVault(password);
    const saved = await api.post('/vault/key', record);
    set({ record: saved, dataKey, entries: [], status: 'unlocked' });
    get().touch();
  },

  // Throws WrongPasswordError on a bad password
  unlock: async (password) => {
    const dataKey = await unlockVault(password, get().record);
    const rows = await api.get('/vault/items');
    const entries = await Promise.all(rows.map(async (row) => ({
      ...(await decryptEntry(dataKey, row)),
      id: row.id, created_at: row.created_at, updated_at: row.updated_at,
    })));
    set({ dataKey, entries, status: 'unlocked' });
    get().touch();
  },

  lock: () => {
    clearTimeout(autoLockTimer);
    set(state => ({ dataKey: null, entries: [], status: state.record ? 'locked' : 'setup' }));
  },

  // Activity: push the auto-lock back
  touch: () => {
    clearTimeout(autoLockTimer);
    if (get().status === 'unlocked') autoLockTimer = setTimeout(() => get().lock(), AUTO_LOCK_MS);
  },

  saveEntry: async (entry, id) => {
    const { dataKey } = get();
    const { id: _id, created_at, updated_at, ...plain } = entry;
    const payload = await encryptEntry(dataKey, plain);
    const row = id ? await api.put(`/vault/items/${id}`, payload) : await api.post('/vault/items', payload);
    const saved = { ...plain, id: row.id, created_at: row.created_at, updated_at: row.updated_at };
    set(state => ({ entries: id ? state.entries.map(e => (e.id === id ? saved : e)) : [...state.entries, saved] }));
    get().touch();
    return saved;
  },

  deleteEntry: async (id) => {
    const { entries } = get();
    set({ entries: entries.filter(e => e.id !== id) });
    try { await api.delete(`/vault/items/${id}`); } catch { set({ entries }); }
  },

  // Throws WrongPasswordError if the current password is wrong
  changePassword: async (currentPassword, newPassword) => {
    await unlockVault(currentPassword, get().record); // verify
    const record = await api.put('/vault/key', await rewrapVault(get().dataKey, newPassword));
    set({ record });
  },
}));
