import React, { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import PasswordGate from './components/auth/PasswordGate';
import AppShell from './components/shell/AppShell';
import Toast from './components/ui/Toast';

export default function App() {
  const { isAuthenticated, isLoading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return (
      <div className="geometric-bg min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-[3px] border-accent-100 border-t-accent-400 animate-spin" />
          <p className="font-display italic text-ink-muted">LifeOS</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {!isAuthenticated ? <PasswordGate /> : <AppShell />}
      <Toast />
    </>
  );
}
