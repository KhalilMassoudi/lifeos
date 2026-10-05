import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';

const LOCK_ICON = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

const EYE_ICON = ({ open }) => open ? (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
) : (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
);

export default function PasswordGate() {
  const { isNewUser, error, failedAttempts, lockoutUntil, login, setPassword, clearError } = useAuthStore();
  const [password, setPasswordInput] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const inputRef = useRef(null);

  // Lockout countdown
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

  // Shake on error
  useEffect(() => {
    if (error) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);
    }
  }, [error, failedAttempts]);

  // Auto-focus
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const isLocked = lockoutSeconds > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading || isLocked) return;
    clearError();

    if (isNewUser) {
      if (password !== confirmPassword) {
        useAuthStore.setState({ error: 'Passwords do not match.' });
        return;
      }
      setIsLoading(true);
      await setPassword(password);
      setIsLoading(false);
    } else {
      setIsLoading(true);
      const success = await login(password);
      setIsLoading(false);
      if (!success) setPasswordInput('');
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="geometric-bg min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Ambient orbs */}
      <div className="lock-screen-orb absolute w-96 h-96 rounded-full bg-gold-400/5 blur-3xl top-[-10%] left-[-10%] pointer-events-none" />
      <div className="lock-screen-orb absolute w-80 h-80 rounded-full bg-sage-400/6 blur-3xl bottom-[-10%] right-[-10%] pointer-events-none" style={{ animationDelay: '2s' }} />
      <div className="lock-screen-orb absolute w-64 h-64 rounded-full bg-gold-400/4 blur-2xl top-1/2 right-1/4 pointer-events-none" style={{ animationDelay: '1s' }} />

      {/* Main card */}
      <div className="animate-fade-in glass-card gold-glow w-full max-w-md mx-4 p-8 relative z-10">
        {/* Logo / Icon */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-navy-800 border border-gold-400/20 flex items-center justify-center mb-4 animate-float text-gold-400">
            <LOCK_ICON />
          </div>
          <h1 className="font-display text-3xl font-semibold gold-text mb-1">LifeOS</h1>
          <p className="text-slate-400 text-sm font-body">
            {isNewUser ? 'Create your private sanctuary' : 'Welcome back — unlock your OS'}
          </p>
        </div>

        {/* Arabic decorative text */}
        <div className="text-center mb-6">
          <span className="font-arabic text-gold-400/50 text-lg tracking-wider">
            {isNewUser ? 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ' : '﷽'}
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={isShaking ? 'animate-shake' : ''}>
          {/* Password input */}
          <div className="mb-4 relative">
            <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
              {isNewUser ? 'Create Password' : 'Password'}
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPasswordInput(e.target.value); clearError(); }}
                placeholder={isNewUser ? 'Choose a strong password…' : 'Enter your password…'}
                className="lifeos-input pr-12"
                disabled={isLocked || isLoading}
                autoComplete={isNewUser ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-gold-400 transition-colors"
                tabIndex={-1}
              >
                <EYE_ICON open={showPassword} />
              </button>
            </div>
          </div>

          {/* Confirm password (new user only) */}
          {isNewUser && (
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); clearError(); }}
                placeholder="Confirm your password…"
                className="lifeos-input"
                autoComplete="new-password"
              />
            </div>
          )}

          {/* Error / Lockout message */}
          {(error || isLocked) && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
              <span>⚠</span>
              <span>{isLocked ? `App locked. Try again in ${formatTime(lockoutSeconds)}` : error}</span>
            </div>
          )}

          {/* Failed attempts indicator */}
          {!isLocked && failedAttempts > 0 && failedAttempts < 5 && (
            <div className="mb-4 flex justify-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i < failedAttempts ? 'bg-red-500' : 'bg-navy-600'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Submit button */}
          <button
            id="auth-submit-btn"
            type="submit"
            disabled={isLoading || isLocked || !password || (isNewUser && !confirmPassword)}
            className="w-full py-3 px-6 rounded-xl font-semibold text-navy-900 text-sm transition-all duration-200
              bg-gradient-to-r from-gold-400 to-gold-300 hover:from-gold-300 hover:to-gold-200
              disabled:opacity-40 disabled:cursor-not-allowed
              shadow-lg shadow-gold-400/20 hover:shadow-gold-400/30
              active:scale-[0.98]"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {isNewUser ? 'Creating…' : 'Unlocking…'}
              </span>
            ) : (
              isNewUser ? '✦ Create My LifeOS' : '→ Unlock'
            )}
          </button>
        </form>

        {/* Footer hint */}
        <p className="text-center text-xs text-slate-600 mt-6">
          Your data is stored privately in your own LifeOS database.
        </p>
      </div>
    </div>
  );
}
