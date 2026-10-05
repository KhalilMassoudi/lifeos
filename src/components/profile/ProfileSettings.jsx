import React, { useState, useEffect } from 'react';
import { Settings, UserRound, KeyRound, Users, Plus, Check, Loader2 } from 'lucide-react';
import Modal, { btn } from '../ui/Modal';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { applyAccent, DEFAULT_ACCENT } from '../../theme/palettes';
import { ProfileAvatar, AvatarPicker, ColorPicker } from './ProfileBits';

const MAX_PROFILES = 4;
const toast = (message, type = 'success') => useToastStore.getState().addToast(message, type);

function Field({ label, htmlFor, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-bold text-ink-soft mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function MyProfileTab() {
  const { currentUser, updateProfile } = useAuthStore();
  const [name, setName] = useState(currentUser.name);
  const [avatar, setAvatar] = useState(currentUser.avatar || '🌸');
  const [color, setColor] = useState(currentUser.color || DEFAULT_ACCENT);
  const [saving, setSaving] = useState(false);

  // Preview the color live; restore the saved one if the dialog closes unsaved
  useEffect(() => { applyAccent(color); }, [color]);
  useEffect(() => () => applyAccent(useAuthStore.getState().currentUser?.color), []);

  const dirty = name.trim() !== currentUser.name || avatar !== currentUser.avatar || color !== currentUser.color;

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ name: name.trim(), avatar, color });
      toast('Profile saved ✨');
    } catch { /* api already showed a toast */ }
    setSaving(false);
  };

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="flex items-center gap-4 p-4 rounded-3xl bg-accent-50">
        <ProfileAvatar profile={{ name, avatar, color }} size="lg" />
        <div>
          <p className="font-display text-2xl font-semibold text-ink">{name || 'Your name'}</p>
          <p className="text-xs text-ink-muted">This is how you appear on the lock screen</p>
        </div>
      </div>

      <Field label="Name" htmlFor="profile-name">
        <input id="profile-name" className="lifeos-input" value={name} maxLength={100} onChange={e => setName(e.target.value)} />
      </Field>
      <Field label="Avatar"><AvatarPicker value={avatar} onChange={setAvatar} /></Field>
      <Field label="Color — the whole app follows it"><ColorPicker value={color} onChange={setColor} /></Field>

      <div className="flex justify-end">
        <button type="submit" className={btn.primary} disabled={!dirty || !name.trim() || saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save profile
        </button>
      </div>
    </form>
  );
}

function PasswordTab() {
  const { changePassword } = useAuthStore();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setError(null);
    if (next.length < 6) return setError('New password must be at least 6 characters.');
    if (next !== confirm) return setError('New passwords do not match.');
    setSaving(true);
    try {
      await changePassword(current, next);
      setCurrent(''); setNext(''); setConfirm('');
      toast('Password changed 🔒');
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <Field label="Current password" htmlFor="pw-current">
        <input id="pw-current" type="password" autoComplete="current-password" className="lifeos-input" value={current} onChange={e => setCurrent(e.target.value)} />
      </Field>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="New password" htmlFor="pw-new">
          <input id="pw-new" type="password" autoComplete="new-password" className="lifeos-input" value={next} onChange={e => setNext(e.target.value)} />
        </Field>
        <Field label="Confirm new password" htmlFor="pw-confirm">
          <input id="pw-confirm" type="password" autoComplete="new-password" className="lifeos-input" value={confirm} onChange={e => setConfirm(e.target.value)} />
        </Field>
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-red-400">{error}</p>}
      <div className="flex justify-end">
        <button type="submit" className={btn.primary} disabled={!current || !next || !confirm || saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />} Change password
        </button>
      </div>
    </form>
  );
}

function ProfilesTab() {
  const { profiles, currentUser, addProfile } = useAuthStore();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🦋');
  const [color, setColor] = useState('lavender');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const create = async (e) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    setSaving(true);
    try {
      const profile = await addProfile({ name: name.trim(), avatar, color, password });
      toast(`${profile.name} can now unlock LifeOS 💞`);
      setAdding(false); setName(''); setPassword('');
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        Each profile has its own password, trackers and colors. Choose who's using LifeOS on the lock screen.
      </p>

      <div className="space-y-2">
        {profiles.map(p => (
          <div key={p.id} className="flex items-center gap-3 p-3 rounded-2xl bg-surface-sunken/70">
            <ProfileAvatar profile={p} size="md" />
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-ink truncate">{p.name}</p>
              <p className="text-xs text-ink-muted">{p.id === currentUser.id ? 'You' : 'Profile'}</p>
            </div>
          </div>
        ))}
      </div>

      {!adding && profiles.length < MAX_PROFILES && (
        <button onClick={() => setAdding(true)} className={`${btn.secondary} w-full border-2 border-dashed border-line bg-transparent`}>
          <Plus className="w-4 h-4" /> Add a profile for your partner
        </button>
      )}

      {adding && (
        <form onSubmit={create} className="space-y-4 p-4 rounded-3xl border-2 border-accent-100 bg-accent-50/50 animate-fade-in">
          <div className="flex items-center gap-3">
            <ProfileAvatar profile={{ name, avatar, color }} size="md" />
            <p className="font-display text-lg font-semibold text-ink">{name || 'New profile'}</p>
          </div>
          <Field label="Name" htmlFor="new-profile-name">
            <input id="new-profile-name" autoFocus className="lifeos-input" value={name} maxLength={100} onChange={e => setName(e.target.value)} />
          </Field>
          <Field label="Avatar"><AvatarPicker value={avatar} onChange={setAvatar} /></Field>
          <Field label="Color"><ColorPicker value={color} onChange={setColor} /></Field>
          <Field label="Their password (they can change it later)" htmlFor="new-profile-password">
            <input id="new-profile-password" type="password" autoComplete="new-password" className="lifeos-input" value={password} onChange={e => setPassword(e.target.value)} />
          </Field>
          {error && <p role="alert" className="text-sm font-semibold text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className={btn.ghost} onClick={() => setAdding(false)}>Cancel</button>
            <button type="submit" className={btn.primary} disabled={!name.trim() || !password || saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create profile
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

const TABS = [
  { id: 'profile', label: 'My profile', Icon: UserRound },
  { id: 'password', label: 'Password', Icon: KeyRound },
  { id: 'profiles', label: 'Profiles', Icon: Users },
];

export default function ProfileSettings({ onClose }) {
  const [tab, setTab] = useState('profile');

  return (
    <Modal title="Settings" subtitle="Your profile, password and partner" icon={<Settings className="w-5 h-5" />} onClose={onClose}>
      <div className="flex gap-1 p-1 mb-5 rounded-2xl bg-surface-sunken" role="tablist">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-extrabold transition-all
              ${tab === id ? 'bg-surface text-ink shadow-soft' : 'text-ink-muted hover:text-ink'}`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>
      {tab === 'profile' && <MyProfileTab />}
      {tab === 'password' && <PasswordTab />}
      {tab === 'profiles' && <ProfilesTab />}
    </Modal>
  );
}
