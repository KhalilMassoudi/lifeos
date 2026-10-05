import React, { useState, lazy, Suspense, useEffect } from 'react';
import Sidebar from './Sidebar';
import PluginStore from './PluginStore';
import { usePluginStore } from '../../store/pluginStore';
import { useAuthStore } from '../../store/authStore';

// Lazy load plugins

const PLUGIN_COMPONENTS = {
  'salah-quran': lazy(() => import('../../plugins/salah-quran')),
  'movies': lazy(() => import('../../plugins/movies')),
  'books': lazy(() => import('../../plugins/books')),
  'habits': lazy(() => import('../../plugins/habits')),
  'routine': lazy(() => import('../../plugins/routine')),
  'period': lazy(() => import('../../plugins/period')),
  'meals':  lazy(() => import('../../plugins/meals')),
  'journal': lazy(() => import('../../plugins/journal')),
};

const LoadingSpinner = () => (
  <div className="flex-1 flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 rounded-full border-[3px] border-accent-100 border-t-accent-400 animate-spin" />
      <p className="text-ink-muted text-sm font-semibold">Loading…</p>
    </div>
  </div>
);

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

function EmptyState() {
  const { currentUser } = useAuthStore();
  const { openStore } = usePluginStore();
  return (
    <div className="flex-1 flex items-center justify-center px-6">
      <div className="text-center animate-fade-in max-w-md">
        <div className="mx-auto mb-6 w-24 h-24 rounded-[32px] bg-gradient-to-br from-accent-100 via-lavender-light to-mint-light flex items-center justify-center text-5xl animate-float shadow-soft">
          {currentUser?.avatar || '✨'}
        </div>
        <h2 className="font-display text-4xl text-ink font-semibold mb-2">
          {greeting()}, <span className="gold-text italic">{currentUser?.name}</span>
        </h2>
        <p className="text-ink-muted leading-relaxed mb-7">
          This is your little corner of LifeOS. Add the spaces you want — prayers, habits, books, meals and more.
        </p>
        <button
          onClick={openStore}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm text-paper bg-gradient-to-r from-accent-400 to-accent-500 shadow-glow hover:-translate-y-0.5 transition-transform"
        >
          ✨ Browse plugins
        </button>
        <p className="font-arabic text-accent-400/60 text-xl mt-8">بِسْمِ اللَّهِ</p>
      </div>
    </div>
  );
}

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const { currentPluginId, isStoreOpen, fetchPlugins, isLoaded } = usePluginStore();

  useEffect(() => {
    fetchPlugins();
  }, [fetchPlugins]);

  if (!isLoaded) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-surface-page">
        <LoadingSpinner />
      </div>
    );
  }

  const ActivePlugin = currentPluginId ? PLUGIN_COMPONENTS[currentPluginId] : null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface-page">
      {/* Sidebar */}
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} />

      {/* Plugin Store panel (slides in next to sidebar) */}
      {isStoreOpen && <PluginStore />}

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <Suspense fallback={<LoadingSpinner />}>
          {ActivePlugin ? <ActivePlugin /> : <EmptyState />}
        </Suspense>
      </main>
    </div>
  );
}
