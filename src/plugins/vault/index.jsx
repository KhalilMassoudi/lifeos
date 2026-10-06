import React, { useEffect, useMemo, useState } from 'react';
import {
  Lock, LockOpen, ShieldCheck, ShieldAlert, Plus, Search, Copy, Eye, EyeOff, Pencil, Trash2,
  Star, ExternalLink, Loader2, KeyRound, Settings2,
} from 'lucide-react';
import { useVaultStore, CATEGORIES, AUTO_LOCK_MS } from './vaultStore';
import { WrongPasswordError, passwordStrength } from './vaultCrypto';
import { useToastStore } from '../../store/toastStore';
import Modal, { btn } from '../../components/ui/Modal';
import EntryEditor, { StrengthMeter } from './EntryEditor';

const CLIPBOARD_CLEAR_MS = 30_000;
const toast = (m, t = 'success') => useToastStore.getState().addToast(m, t);

let clipboardTimer = null;
async function copySecret(value, label) {
  try {
    await navigator.clipboard.writeText(value);
    toast(`${label} copied — clipboard clears in 30s`);
    clearTimeout(clipboardTimer);
    clipboardTimer = setTimeout(() => navigator.clipboard.writeText('').catch(() => {}), CLIPBOARD_CLEAR_MS);
  } catch {
    toast('Could not copy to the clipboard.', 'error');
  }
}

const safeUrl = (url) => {
  if (!url) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch { return null; }
};

function Shell({ children }) {
  return (
    <div className="h-full overflow-y-auto geometric-bg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-surface/90 backdrop-blur-xl rounded-[28px] border border-paper shadow-lift p-8 animate-pop">
        {children}
      </div>
    </div>
  );
}

function SetupScreen() {
  const { setup } = useVaultStore();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (password.length < 10) return setError('Use at least 10 characters — this protects all your passwords.');
    if (password !== confirm) return setError('Passwords do not match.');
    setBusy(true);
    try { await setup(password); } catch (err) { setError(err.message); setBusy(false); }
  };

  return (
    <Shell>
      <form onSubmit={submit} className="space-y-5">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-3xl bg-accent-100 text-accent-500 flex items-center justify-center mb-4"><ShieldCheck className="w-8 h-8" /></div>
          <h2 className="font-display text-3xl font-semibold text-ink">Create your <span className="gold-text italic">vault</span></h2>
          <p className="text-sm text-ink-muted mt-2 leading-relaxed">
            Your passwords are encrypted on this device with a vault password before they're saved.
            Not even the LifeOS server can read them.
          </p>
        </div>
        <label className="block">
          <span className="block text-xs font-bold text-ink-soft mb-1.5">Vault password</span>
          <input type="password" className="lifeos-input" autoFocus value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
          <StrengthMeter password={password} />
        </label>
        <label className="block">
          <span className="block text-xs font-bold text-ink-soft mb-1.5">Confirm</span>
          <input type="password" className="lifeos-input" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" />
        </label>
        <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50 border border-amber-100 cursor-pointer">
          <input type="checkbox" checked={understood} onChange={e => setUnderstood(e.target.checked)} className="mt-0.5 accent-[rgb(var(--accent-400))]" />
          <span className="text-xs font-semibold text-amber-200 leading-relaxed">
            I understand this password <b>can't be recovered</b>. If I forget it, my saved passwords are lost for good.
            It should be different from my LifeOS login.
          </span>
        </label>
        {error && <p role="alert" className="text-sm font-semibold text-red-400">{error}</p>}
        <button type="submit" className={`${btn.primary} w-full py-3`} disabled={!understood || !password || !confirm || busy}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Create vault
        </button>
      </form>
    </Shell>
  );
}

function LockScreen() {
  const { unlock } = useVaultStore();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await unlock(password);
    } catch (err) {
      setError(err instanceof WrongPasswordError ? 'Wrong vault password.' : err.message);
      setPassword('');
      setBusy(false);
    }
  };

  return (
    <Shell>
      <form onSubmit={submit} className="space-y-5 text-center">
        <div className="mx-auto w-16 h-16 rounded-3xl bg-accent-100 text-accent-500 flex items-center justify-center"><Lock className="w-8 h-8" /></div>
        <div>
          <h2 className="font-display text-3xl font-semibold text-ink">Vault locked</h2>
          <p className="text-sm text-ink-muted mt-1">Enter your vault password to see your passwords</p>
        </div>
        <input
          type="password" autoFocus className="lifeos-input text-center" value={password}
          onChange={e => { setPassword(e.target.value); setError(null); }}
          aria-label="Vault password" autoComplete="current-password" placeholder="Vault password"
        />
        {error && <p role="alert" className="text-sm font-semibold text-red-400">{error}</p>}
        <button type="submit" className={`${btn.primary} w-full py-3`} disabled={!password || busy}>
          {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Decrypting…</> : <><LockOpen className="w-4 h-4" /> Unlock</>}
        </button>
        <p className="text-[11px] text-ink-faint font-semibold">Locks itself after {AUTO_LOCK_MS / 60000} minutes of inactivity</p>
      </form>
    </Shell>
  );
}

function ChangePasswordModal({ onClose }) {
  const { changePassword } = useVaultStore();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    setError(null);
    if (next.length < 10) return setError('Use at least 10 characters.');
    if (next !== confirm) return setError('New passwords do not match.');
    setBusy(true);
    try {
      await changePassword(current, next);
      toast('Vault password changed 🔒');
      onClose();
    } catch (err) {
      setError(err instanceof WrongPasswordError ? 'Current vault password is wrong.' : err.message);
      setBusy(false);
    }
  };

  return (
    <Modal title="Change vault password" icon={<Settings2 className="w-5 h-5" />} onClose={onClose}
      footer={<>
        {error && <p role="alert" className="mr-auto self-center text-sm font-semibold text-red-400">{error}</p>}
        <button className={btn.secondary} onClick={onClose}>Cancel</button>
        <button className={btn.primary} onClick={submit} disabled={!current || !next || !confirm || busy}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />} Change
        </button>
      </>}
    >
      <div className="space-y-4">
        <label className="block"><span className="block text-xs font-bold text-ink-soft mb-1.5">Current vault password</span>
          <input type="password" className="lifeos-input" value={current} onChange={e => setCurrent(e.target.value)} autoComplete="current-password" /></label>
        <label className="block"><span className="block text-xs font-bold text-ink-soft mb-1.5">New vault password</span>
          <input type="password" className="lifeos-input" value={next} onChange={e => setNext(e.target.value)} autoComplete="new-password" />
          <StrengthMeter password={next} /></label>
        <label className="block"><span className="block text-xs font-bold text-ink-soft mb-1.5">Confirm</span>
          <input type="password" className="lifeos-input" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" /></label>
      </div>
    </Modal>
  );
}

function EntryDetail({ entry, reused, onEdit }) {
  const { deleteEntry, saveEntry } = useVaultStore();
  const [show, setShow] = useState(false);
  const cat = CATEGORIES[entry.category] || CATEGORIES.other;
  const strength = passwordStrength(entry.password);
  const link = safeUrl(entry.url);

  useEffect(() => setShow(false), [entry.id]);

  const Field = ({ label, value, secret, copyLabel }) => value ? (
    <div className="p-4 rounded-2xl bg-surface-sunken/60">
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-faint mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span className={`flex-1 min-w-0 truncate text-ink font-bold ${secret ? 'font-mono' : ''}`}>
          {secret && !show ? '•'.repeat(Math.min(value.length, 16)) : value}
        </span>
        {secret && (
          <button onClick={() => setShow(s => !s)} className={btn.ghost} aria-label={show ? 'Hide password' : 'Show password'}>
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
        <button onClick={() => copySecret(value, copyLabel)} className={btn.ghost} aria-label={`Copy ${copyLabel.toLowerCase()}`}>
          <Copy className="w-4 h-4" />
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div className="max-w-xl mx-auto px-8 py-8 space-y-4 animate-fade-in">
      <div className="flex items-start gap-4 mb-2">
        <div className="w-16 h-16 rounded-3xl bg-accent-50 flex items-center justify-center text-3xl flex-shrink-0">{cat.emoji}</div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-3xl font-semibold text-ink truncate">{entry.title}</h2>
          <p className="text-sm text-ink-muted font-semibold">{cat.label}</p>
        </div>
        <button onClick={() => saveEntry({ ...entry, favorite: !entry.favorite }, entry.id)} className={btn.ghost} aria-label={entry.favorite ? 'Remove from favorites' : 'Add to favorites'}>
          <Star className={`w-5 h-5 ${entry.favorite ? 'fill-amber-500 text-amber-500' : ''}`} />
        </button>
      </div>

      <Field label={entry.category === 'wifi' ? 'Network' : 'Username'} value={entry.username} copyLabel="Username" />
      <Field label="Password" value={entry.password} secret copyLabel="Password" />

      {entry.password && (
        <div className="flex flex-wrap gap-2">
          <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${strength.score >= 3 ? 'bg-emerald-50 text-emerald-400' : strength.score === 2 ? 'bg-amber-50 text-amber-400' : 'bg-red-50 text-red-400'}`}>
            {strength.label} password
          </span>
          {reused > 0 && (
            <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-red-50 text-red-400">
              Also used in {reused} other entr{reused === 1 ? 'y' : 'ies'}
            </span>
          )}
        </div>
      )}

      {link && (
        <a href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-4 rounded-2xl bg-surface-sunken/60 text-sm font-bold text-accent-500 hover:text-accent-600">
          <ExternalLink className="w-4 h-4" /> <span className="truncate">{entry.url}</span>
        </a>
      )}
      {entry.notes && (
        <div className="p-4 rounded-2xl bg-surface-sunken/60">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-faint mb-1">Notes</p>
          <p className="text-sm text-ink whitespace-pre-wrap break-words">{entry.notes}</p>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button className={btn.secondary} onClick={onEdit}><Pencil className="w-4 h-4" /> Edit</button>
        <button className={btn.danger} onClick={() => { if (window.confirm(`Delete "${entry.title}" from your vault?`)) deleteEntry(entry.id); }}>
          <Trash2 className="w-4 h-4" /> Delete
        </button>
      </div>
    </div>
  );
}

function VaultView() {
  const { entries, lock, touch } = useVaultStore();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(null); // null | { entry }
  const [changingPassword, setChangingPassword] = useState(false);

  // Any activity in the vault pushes the auto-lock back
  useEffect(() => {
    const onActivity = () => touch();
    window.addEventListener('pointerdown', onActivity);
    window.addEventListener('keydown', onActivity);
    return () => {
      window.removeEventListener('pointerdown', onActivity);
      window.removeEventListener('keydown', onActivity);
    };
  }, [touch]);

  const reuseCount = useMemo(() => {
    const counts = {};
    for (const e of entries) if (e.password) counts[e.password] = (counts[e.password] || 0) + 1;
    return counts;
  }, [entries]);
  const weak = entries.filter(e => e.password && passwordStrength(e.password).score <= 1).length;
  const reused = entries.filter(e => e.password && reuseCount[e.password] > 1).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries
      .filter(e => category === 'all' || (category === 'favorites' ? e.favorite : e.category === category))
      .filter(e => !q || [e.title, e.username, e.url].some(v => v?.toLowerCase().includes(q)))
      .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.title.localeCompare(b.title));
  }, [entries, query, category]);

  const selected = entries.find(e => e.id === selectedId);
  const usedCategories = Object.entries(CATEGORIES).filter(([key]) => entries.some(e => e.category === key));

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <header className="flex-shrink-0 px-6 pt-5 pb-4 flex flex-wrap items-center gap-3 border-b border-line/70 bg-navy-900">
        <div className="mr-auto">
          <h1 className="font-display text-3xl font-semibold text-ink leading-tight">Password <span className="gold-text italic">Vault</span></h1>
          <p className="text-ink-muted text-sm mt-0.5 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-400" /> End-to-end encrypted · only you can open it</p>
        </div>
        <button className={btn.ghost} onClick={() => setChangingPassword(true)} aria-label="Change vault password"><Settings2 className="w-4 h-4" /></button>
        <button className={btn.secondary} onClick={lock}><Lock className="w-4 h-4" /> Lock</button>
        <button className={btn.primary} onClick={() => setEditing({ entry: null })}><Plus className="w-4 h-4" /> Add</button>
      </header>

      <div className="flex-1 flex min-h-0">
        <aside className="w-80 flex-shrink-0 border-r border-line/70 flex flex-col bg-navy-900/60">
          <div className="p-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search vault" aria-label="Search vault" className="lifeos-input pl-9 py-2" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[['all', 'All'], ['favorites', '⭐ Favorites'], ...usedCategories.map(([k, c]) => [k, `${c.emoji} ${c.label}`])].map(([key, label]) => (
                <button key={key} onClick={() => setCategory(key)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold transition-colors ${category === key ? 'bg-accent-100 text-accent-600' : 'bg-surface-sunken text-ink-muted hover:text-ink'}`}>
                  {label}
                </button>
              ))}
            </div>
            {(weak > 0 || reused > 0) && (
              <div className="flex items-start gap-2 p-3 rounded-2xl bg-amber-50 border border-amber-100 text-xs font-semibold text-amber-200">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{[weak && `${weak} weak`, reused && `${reused} reused`].filter(Boolean).join(' · ')} password{weak + reused !== 1 ? 's' : ''} — consider changing them.</span>
              </div>
            )}
          </div>
          <ul className="flex-1 overflow-y-auto px-3 pb-4 space-y-0.5">
            {visible.length === 0 && (
              <li className="text-center text-sm text-ink-muted px-6 py-10">
                {entries.length === 0 ? 'Your vault is empty. Add your first password 🔑' : 'Nothing matches.'}
              </li>
            )}
            {visible.map(e => {
              const c = CATEGORIES[e.category] || CATEGORIES.other;
              return (
                <li key={e.id}>
                  <button onClick={() => setSelectedId(e.id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-2xl text-left transition-colors ${e.id === selectedId ? 'bg-surface shadow-soft ring-1 ring-accent-200' : 'hover:bg-surface/70'}`}>
                    <span className="w-10 h-10 rounded-xl bg-accent-50 flex items-center justify-center text-lg flex-shrink-0">{c.emoji}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-extrabold text-ink truncate">{e.title}</span>
                      <span className="block text-xs text-ink-muted truncate">{e.username || c.label}</span>
                    </span>
                    {e.favorite && <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 flex-shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className="flex-1 min-w-0 overflow-y-auto bg-surface">
          {selected ? (
            <EntryDetail entry={selected} reused={(reuseCount[selected.password] || 1) - 1} onEdit={() => setEditing({ entry: selected })} />
          ) : (
            <div className="h-full flex items-center justify-center text-center px-6">
              <div>
                <div className="text-5xl mb-3">🔐</div>
                <p className="font-display text-2xl font-semibold text-ink">{entries.length} saved password{entries.length !== 1 ? 's' : ''}</p>
                <p className="text-ink-muted mt-1">Pick one on the left, or add a new one.</p>
              </div>
            </div>
          )}
        </section>
      </div>

      {editing && <EntryEditor entry={editing.entry} onClose={() => setEditing(null)} onSaved={(saved) => setSelectedId(saved.id)} />}
      {changingPassword && <ChangePasswordModal onClose={() => setChangingPassword(false)} />}
    </div>
  );
}

export default function VaultPlugin() {
  const { status, init } = useVaultStore();
  useEffect(() => { init(); }, [init]);

  if (status === 'loading') return <div className="h-full flex items-center justify-center"><Loader2 className="w-7 h-7 text-accent-400 animate-spin" /></div>;
  if (status === 'unsupported') {
    return (
      <Shell>
        <div className="text-center space-y-3">
          <div className="text-5xl">🔒</div>
          <h2 className="font-display text-2xl font-semibold text-ink">Secure connection needed</h2>
          <p className="text-sm text-ink-muted">
            The vault encrypts on this device, which browsers only allow over <b>https</b> or on <b>localhost</b>.
            Open LifeOS through one of those to use it.
          </p>
        </div>
      </Shell>
    );
  }
  if (status === 'setup') return <SetupScreen />;
  if (status === 'locked') return <LockScreen />;
  return <VaultView />;
}
