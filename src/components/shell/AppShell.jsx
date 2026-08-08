import React, { useState, lazy, Suspense, useEffect } from 'react';
import Sidebar from './Sidebar';
import PluginStore from './PluginStore';
import { usePluginStore } from '../../store/pluginStore';

// Lazy load plugins

const PLUGIN_COMPONENTS = {
  'salah-quran': lazy(() => import('../../plugins/salah-quran')),
  'movies': lazy(() => import('../../plugins/movies')),
  'books': lazy(() => import('../../plugins/books')),
  'habits': lazy(() => import('../../plugins/habits')),
  'routine': lazy(() => import('../../plugins/routine')),
  'period': lazy(() => import('../../plugins/period')),
  'meals':  lazy(() => import('../../plugins/meals')),
};

const LoadingSpinner = () => (
  <div className="flex-1 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-full border-2 border-gold-400/30 border-t-gold-400 animate-spin" />
      <p className="text-slate-500 text-sm font-body">Loading plugin…</p>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="flex-1 flex items-center justify-center">
    <div className="text-center animate-fade-in max-w-sm mx-auto px-6">
      <div className="text-6xl mb-6 animate-float inline-block">✦</div>
      <h2 className="font-display text-2xl gold-text font-semibold mb-3">Welcome to LifeOS</h2>
      <p className="text-slate-500 text-sm leading-relaxed mb-6">
        Your personal life operating system. Activate a plugin from the store to get started.
      </p>
      <p className="font-arabic text-gold-400/40 text-xl">بِسْمِ اللَّهِ</p>
    </div>
  </div>
);

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const { currentPluginId, isStoreOpen, fetchPlugins, isLoaded } = usePluginStore();

  useEffect(() => {
    fetchPlugins();
  }, [fetchPlugins]);

  if (!isLoaded) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-navy-900">
        <LoadingSpinner />
      </div>
    );
  }

  const ActivePlugin = currentPluginId ? PLUGIN_COMPONENTS[currentPluginId] : null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-navy-900">
      {/* Sidebar */}
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} />

      {/* Plugin Store panel (slides in next to sidebar) */}
      {isStoreOpen && <PluginStore />}

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Subtle top gradient */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-400/20 to-transparent" />

        <Suspense fallback={<LoadingSpinner />}>
          {ActivePlugin ? <ActivePlugin /> : <EmptyState />}
        </Suspense>
      </main>
    </div>
  );
}
