import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { applyAccent, DEFAULT_ACCENT } from '../../theme/palettes';
import { ProfileAvatar, AvatarPicker, ColorPicker } from '../profile/ProfileBits';

const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

function PasswordField({ id, label, value, onChange, show, onToggleShow, inputRef, disabled, autoComplete, placeholder }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-ink-soft mb-1.5">{label}</label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="lifeos-input pr-11"
          disabled={disabled}
          autoComplete={autoComplete}
        />
        {onToggleShow && (
          <button
            type="button"
            onClick={onToggleShow}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-accent-500 transition-colors"
            aria-label={show ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {show ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
          </button>
        )}
      </div>
    </div>
  );
}

function ErrorNote({ children }) {
  return (
    <div role="alert" className="px-4 py-2.5 rounded-2xl bg-red-50 border border-red-100 text-red-400 text-sm font-semibold animate-fade-in">
      {children}
    </div>
  );
}

function SubmitButton({ loading, disabled, loadingLabel, children }) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className="w-full py-3 px-6 rounded-2xl font-bold text-paper text-sm transition-all
        bg-gradient-to-r from-accent-400 to-accent-500 shadow-glow
        hover:brightness-105 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]
        disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none
        flex items-center justify-center gap-2"
    >
      {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> {loadingLabel}</> : children}
    </button>
  );
}

// ── First run: create the first profile ────────────────────────────────────
function SetupForm() {
  const { register, error, clearError } = useAuthStore();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🌸');
  const [color, setColor] = useState(DEFAULT_ACCENT);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { applyAccent(color); }, [color]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    if (password !== confirm) {
      useAuthStore.setState({ error: 'Passwords do not match.' });
      return;
    }
    setLoading(true);
    await register({ name, avatar, color, password });
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex flex-col items-center text-center">
        <ProfileAvatar profile={{ name: name || '?', avatar, color }} size="lg" ring />
        <h1 className="font-display text-3xl font-semibold text-ink mt-4">Welcome to <span className="gold-text italic">LifeOS</span></h1>
        <p className="text-ink-muted text-sm mt-1">Let's make your profile. You can add your partner's next.</p>
      </div>

      <div>
        <label htmlFor="setup-name" className="block text-xs font-bold text-ink-soft mb-1.5">Your name</label>
        <input
          id="setup-name"
          autoFocus
          value={name}
          onChange={e => { setName(e.target.value); clearError(); }}
          placeholder="e.g. Khalil"
          className="lifeos-input"
          maxLength={100}
        />
      </div>

      <div>
        <span className="block text-xs font-bold text-ink-soft mb-1.5">Pick an avatar</span>
        <AvatarPicker value={avatar} onChange={setAvatar} />
      </div>

      <div>
        <span className="block text-xs font-bold text-ink-soft mb-2">Your color</span>
        <ColorPicker value={color} onChange={setColor} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <PasswordField
          id="setup-password" label="Password" value={password}
          onChange={e => { setPassword(e.target.value); clearError(); }}
          show={showPassword} onToggleShow={() => setShowPassword(v => !v)}
          autoComplete="new-password" placeholder="6+ characters"
        />
        <PasswordField
          id="setup-confirm" label="Confirm" value={confirm}
          onChange={e => { setConfirm(e.target.value); clearError(); }}
          show={showPassword} autoComplete="new-password" placeholder="Once more"
        />
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      <SubmitButton loading={loading} loadingLabel="Creating…" disabled={!name.trim() || !password || !confirm}>
        <Sparkles className="w-4 h-4" /> Create my space
      </SubmitButton>
    </form>
  );
}

// ── Unlock: pick a profile, enter its password ──────────────────────────────
function UnlockForm() {
  const { profiles, login, error, clearError, failedAttempts, lockoutUntil, getLastProfileId } = useAuthStore();
  const [selectedId, setSelectedId] = useState(() => {
    const last = getLastProfileId();
    return profiles.some(p => p.id === last) ? last : profiles[0]?.id;
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const inputRef = useRef(null);

  const selected = profiles.find(p => p.id === selectedId);
  const isLocked = lockoutSeconds > 0;

  useEffect(() => {
    applyAccent(selected?.color);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [selected]);

  useEffect(() => {
    if (lockoutUntil <= Date.now()) return;
    const update = () => {
      const rem = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      setLockoutSeconds(rem);
      if (rem === 0) clearError();
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil, clearError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || isLocked || !selected) return;
    clearError();
    setLoading(true);
    const ok = await login(selected.id, password);
    setLoading(false);
    if (!ok) {
      setPassword('');
      setShaking(true);
      setTimeout(() => setShaking(false), 600);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="font-display text-3xl font-semibold text-ink">
          {selected ? <>Hi, <span className="gold-text italic">{selected.name}</span></> : 'Who\'s here?'}
        </h1>
        <p className="text-ink-muted text-sm mt-1">Welcome back to your LifeOS</p>
      </div>

      {/* Profile picker */}
      <div className="flex justify-center gap-5 flex-wrap" role="radiogroup" aria-label="Profile">
        {profiles.map(profile => {
          const isSelected = profile.id === selectedId;
          return (
            <button
              key={profile.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => { setSelectedId(profile.id); setPassword(''); clearError(); }}
              className={`flex flex-col items-center gap-2 transition-all duration-300
                ${isSelected ? 'scale-105' : 'opacity-55 hover:opacity-90 scale-95'}`}
            >
              <ProfileAvatar profile={profile} size="lg" ring={isSelected} />
              <span className={`text-sm font-bold ${isSelected ? 'text-ink' : 'text-ink-muted'}`}>{profile.name}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className={`space-y-4 ${shaking ? 'animate-shake' : ''}`}>
        <PasswordField
          id="password-input" label="Password" value={password} inputRef={inputRef}
          onChange={e => { setPassword(e.target.value); clearError(); }}
          show={showPassword} onToggleShow={() => setShowPassword(v => !v)}
          disabled={isLocked || loading} autoComplete="current-password"
          placeholder={selected ? `${selected.name}'s password…` : 'Password…'}
        />

        {(error || isLocked) && (
          <ErrorNote>{isLocked ? `Too many tries. Try again in ${formatTime(lockoutSeconds)}` : error}</ErrorNote>
        )}

        {!isLocked && failedAttempts > 0 && failedAttempts < 5 && (
          <div className="flex justify-center gap-1.5" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full transition-all ${i < failedAttempts ? 'bg-red-400' : 'bg-surface-hover'}`} />
            ))}
          </div>
        )}

        <SubmitButton loading={loading} loadingLabel="Unlocking…" disabled={isLocked || !password}>
          Unlock <ArrowRight className="w-4 h-4" />
        </SubmitButton>
      </form>
    </div>
  );
}

export default function PasswordGate() {
  const { isNewUser } = useAuthStore();

  return (
    <div className="geometric-bg min-h-screen h-full overflow-y-auto flex items-center justify-center relative px-4 py-10">
      {/* Floating pastel blooms */}
      <div className="lock-screen-orb absolute w-72 h-72 rounded-full bg-accent-200/50 blur-3xl top-[8%] left-[10%] pointer-events-none" />
      <div className="lock-screen-orb absolute w-64 h-64 rounded-full bg-lavender/40 blur-3xl bottom-[10%] right-[12%] pointer-events-none" style={{ animationDelay: '2s' }} />
      <div className="lock-screen-orb absolute w-48 h-48 rounded-full bg-mint/40 blur-3xl top-[55%] left-[22%] pointer-events-none" style={{ animationDelay: '4s' }} />

      <div className="animate-pop w-full max-w-md relative z-10">
        <div className="bg-surface/85 backdrop-blur-xl rounded-[28px] border border-paper shadow-lift gold-glow p-8">
          {isNewUser ? <SetupForm /> : <UnlockForm />}
        </div>
        <p className="text-center text-xs text-ink-faint mt-5">
          <span className="font-arabic text-sm text-accent-400/70 mr-1.5">بِسْمِ اللَّهِ</span>
          Your data stays in your own private LifeOS.
        </p>
      </div>
    </div>
  );
}
