import React, { useState } from 'react';
import { usePluginStore, ALL_PLUGINS } from '../../store/pluginStore';
import { useAuthStore } from '../../store/authStore';

const ChevronLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);
const ChevronRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);
const StoreIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
  </svg>
);
const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

export default function Sidebar({ collapsed, onToggle }) {
  const { activePlugins, currentPluginId, setCurrentPlugin, toggleStore, isStoreOpen } = usePluginStore();
  const { lock } = useAuthStore();
  const activePluginDefs = activePlugins.map(id => ALL_PLUGINS.find(p => p.id === id)).filter(Boolean);

  return (
    <aside
      className={`sidebar ${collapsed ? 'collapsed' : ''} flex flex-col h-full bg-navy-900 border-r border-white/5 relative z-20`}
      style={{ minWidth: collapsed ? 64 : 240 }}
    >
      {/* Logo area */}
      <div className={`flex items-center h-16 px-4 border-b border-white/5 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <div className="flex items-center gap-2 animate-fade-in">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-navy-900 font-display font-bold text-xs">L</div>
            <span className="font-display text-gold-400 font-semibold text-base tracking-wide">LifeOS</span>
          </div>
        )}
        {collapsed && (
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-navy-900 font-display font-bold text-xs">L</div>
        )}
      </div>

      {/* Toggle collapse button */}
      <button
        id="sidebar-toggle"
        onClick={onToggle}
        className="absolute -right-3 top-[72px] w-6 h-6 rounded-full bg-navy-700 border border-white/10 flex items-center justify-center text-slate-400 hover:text-gold-400 hover:border-gold-400/30 transition-all z-30 shadow-lg"
      >
        {collapsed ? <ChevronRight /> : <ChevronLeft />}
      </button>

      {/* Nav items */}
      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        {activePluginDefs.length === 0 && !collapsed && (
          <div className="px-4 py-8 text-center">
            <p className="text-slate-600 text-xs leading-relaxed">No plugins active yet.<br />Open the Plugin Store to get started.</p>
          </div>
        )}

        {activePluginDefs.map(plugin => {
          const isActive = currentPluginId === plugin.id;
          return (
            <button
              key={plugin.id}
              id={`nav-${plugin.id}`}
              onClick={() => setCurrentPlugin(plugin.id)}
              className={`nav-item w-full flex items-center gap-3 px-4 py-3 text-left transition-all
                ${isActive
                  ? 'active bg-gold-400/8 text-gold-300'
                  : 'text-slate-400 hover:bg-white/4 hover:text-slate-200'
                }`}
              title={collapsed ? plugin.name : undefined}
            >
              <span className="text-xl flex-shrink-0 w-5 flex items-center justify-center leading-none">
                {plugin.emoji}
              </span>
              <span className={`sidebar-label text-sm font-medium ${collapsed ? 'hidden' : ''}`}>
                {plugin.name}
              </span>
              {isActive && !collapsed && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-gold-400 flex-shrink-0" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-white/5 py-3 space-y-1">
        {/* Plugin Store */}
        <button
          id="open-plugin-store"
          onClick={toggleStore}
          className={`nav-item w-full flex items-center gap-3 px-4 py-3 text-left transition-all
            ${isStoreOpen
              ? 'bg-gold-400/10 text-gold-400'
              : 'text-slate-400 hover:bg-white/4 hover:text-slate-200'
            }`}
          title={collapsed ? 'Plugin Store' : undefined}
        >
          <span className="flex-shrink-0 w-5 flex items-center justify-center text-current">
            <StoreIcon />
          </span>
          <span className={`sidebar-label text-sm font-medium ${collapsed ? 'hidden' : ''}`}>
            Plugins
          </span>
          {!collapsed && activePlugins.length > 0 && (
            <span className="ml-auto text-xs bg-gold-400/20 text-gold-400 rounded-full px-1.5 py-0.5 font-medium">
              {activePlugins.length}
            </span>
          )}
        </button>

        {/* Lock */}
        <button
          id="lock-app"
          onClick={lock}
          className="nav-item w-full flex items-center gap-3 px-4 py-3 text-left text-slate-500 hover:bg-red-500/8 hover:text-red-400 transition-all"
          title={collapsed ? 'Lock LifeOS' : undefined}
        >
          <span className="flex-shrink-0 w-5 flex items-center justify-center text-current">
            <LockIcon />
          </span>
          <span className={`sidebar-label text-sm font-medium ${collapsed ? 'hidden' : ''}`}>
            Lock
          </span>
        </button>
      </div>
    </aside>
  );
}
