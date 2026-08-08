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
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-gold-400/30 border-t-gold-400 animate-spin" />
          <p className="font-display text-gold-400/60 text-sm tracking-widest">LOADING</p>
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
