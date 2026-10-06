import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, Wand2, Loader2, Check, RefreshCw } from 'lucide-react';
import Modal, { btn } from '../../components/ui/Modal';
import { useVaultStore, CATEGORIES } from './vaultStore';
import { generatePassword, passwordStrength } from './vaultCrypto';

export function StrengthMeter({ password }) {
  const { score, label } = passwordStrength(password);
  const colors = ['bg-surface-sunken', 'bg-red-500', 'bg-amber-500', 'bg-emerald-500', 'bg-emerald-500'];
  if (!password) return null;
  return (
    <div className="flex items-center gap-2 mt-1.5" aria-live="polite">
      <div className="flex gap-1 flex-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= score ? colors[score] : 'bg-surface-sunken'}`} />
        ))}
      </div>
      <span className="text-[11px] font-extrabold text-ink-muted w-20 text-right">{label}</span>
    </div>
  );
}

function Generator({ onUse }) {
  const [length, setLength] = useState(20);
  const [symbols, setSymbols] = useState(true);
  const [digits, setDigits] = useState(true);
  const [value, setValue] = useState(() => generatePassword({ length: 20 }));
  const regenerate = (opts = {}) => setValue(generatePassword({ length, symbols, digits, ...opts }));

  return (
    <div className="mt-2 p-3 rounded-2xl bg-accent-50/70 border border-accent-100 space-y-2.5 animate-fade-in">
      <div className="flex items-center gap-2">
        <code className="flex-1 min-w-0 truncate font-mono text-sm font-bold text-ink bg-surface rounded-xl px-3 py-2">{value}</code>
        <button type="button" onClick={() => regenerate()} className={btn.ghost} aria-label="Generate another">
          <RefreshCw className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => onUse(value)} className={btn.primary}>Use</button>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-ink-soft">
        <label className="flex items-center gap-2">
          Length {length}
          <input type="range" min="8" max="40" value={length}
            onChange={e => { const n = Number(e.target.value); setLength(n); regenerate({ length: n }); }}
            className="accent-[rgb(var(--accent-400))]" />
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={digits} onChange={e => { setDigits(e.target.checked); regenerate({ digits: e.target.checked }); }} className="accent-[rgb(var(--accent-400))]" /> 0-9
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={symbols} onChange={e => { setSymbols(e.target.checked); regenerate({ symbols: e.target.checked }); }} className="accent-[rgb(var(--accent-400))]" /> !@#
        </label>
      </div>
    </div>
  );
}

export default function EntryEditor({ entry, onClose, onSaved }) {
  const { saveEntry } = useVaultStore();
  const [form, setForm] = useState({
    title: entry?.title || '',
    username: entry?.username || '',
    password: entry?.password || '',
    url: entry?.url || '',
    notes: entry?.notes || '',
    category: entry?.category || 'login',
    favorite: entry?.favorite || false,
  });
  const [show, setShow] = useState(!entry);
  const [showGenerator, setShowGenerator] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async (e) => {
    e?.preventDefault();
    if (!form.title.trim()) return setError('Give it a name.');
    setSaving(true);
    setError(null);
    try {
      const saved = await saveEntry({ ...form, title: form.title.trim() }, entry?.id);
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal
      title={entry ? 'Edit entry' : 'New entry'}
      subtitle="Encrypted on this device before it's saved"
      icon={<KeyRound className="w-5 h-5" />}
      onClose={onClose}
      footer={<>
        {error && <p role="alert" className="mr-auto self-center text-sm font-semibold text-red-400">{error}</p>}
        <button className={btn.secondary} onClick={onClose}>Cancel</button>
        <button className={btn.primary} onClick={save} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
        </button>
      </>}
    >
      <form onSubmit={save} className="space-y-4" autoComplete="off">
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Category">
          {Object.entries(CATEGORIES).map(([key, c]) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={form.category === key}
              onClick={() => set('category', key)}
              className={`px-3 py-1.5 rounded-2xl text-xs font-extrabold transition-all
                ${form.category === key ? 'bg-accent-100 text-accent-600' : 'bg-surface-sunken text-ink-muted hover:text-ink'}`}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="block text-xs font-bold text-ink-soft mb-1.5">Name</span>
          <input className="lifeos-input" autoFocus value={form.title} maxLength={200} onChange={e => set('title', e.target.value)} placeholder="e.g. Gmail, Netflix, Home Wi-Fi" />
        </label>

        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-bold text-ink-soft mb-1.5">{form.category === 'wifi' ? 'Network name' : 'Username / email'}</span>
            <input className="lifeos-input" value={form.username} maxLength={500} onChange={e => set('username', e.target.value)} autoComplete="off" />
          </label>
          <label className="block">
            <span className="block text-xs font-bold text-ink-soft mb-1.5">Website</span>
            <input className="lifeos-input" value={form.url} maxLength={2000} onChange={e => set('url', e.target.value)} placeholder="https://…" inputMode="url" />
          </label>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-ink-soft">Password</span>
            <button type="button" onClick={() => setShowGenerator(v => !v)} className="text-xs font-extrabold text-accent-500 hover:text-accent-600 inline-flex items-center gap-1">
              <Wand2 className="w-3.5 h-3.5" /> Generate
            </button>
          </div>
          <div className="relative">
            <input
              className="lifeos-input pr-11 font-mono"
              type={show ? 'text' : 'password'}
              value={form.password}
              maxLength={1000}
              onChange={e => set('password', e.target.value)}
              autoComplete="new-password"
              aria-label="Password"
            />
            <button type="button" onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink" aria-label={show ? 'Hide password' : 'Show password'}>
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <StrengthMeter password={form.password} />
          {showGenerator && <Generator onUse={(pw) => { set('password', pw); setShow(true); setShowGenerator(false); }} />}
        </div>

        <label className="block">
          <span className="block text-xs font-bold text-ink-soft mb-1.5">Notes</span>
          <textarea className="lifeos-input resize-none" rows={3} value={form.notes} maxLength={5000} onChange={e => set('notes', e.target.value)} placeholder="Security questions, PIN hints, recovery codes…" />
        </label>
      </form>
    </Modal>
  );
}
