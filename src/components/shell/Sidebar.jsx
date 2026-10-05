import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid, Lock, Settings } from 'lucide-react';
import { usePluginStore, ALL_PLUGINS } from '../../store/pluginStore';
import { useAuthStore } from '../../store/authStore';
import { ProfileAvatar } from '../profile/ProfileBits';
import ProfileSettings from '../profile/ProfileSettings';

function NavButton({ id, active, collapsed, title, onClick, icon, label, trailing, danger }) {
  return (
    <button
      id={id}
      onClick={onClick}
      title={collapsed ? title : undefined}
      aria-current={active ? 'page' : undefined}
      className={`nav-item ${active ? 'active' : ''} w-full flex items-center gap-3 rounded-2xl px-2.5 py-2 text-left
        ${active
          ? 'bg-accent-50 text-ink'
          : danger
            ? 'text-ink-muted hover:bg-red-50 hover:text-red-400'
            : 'text-ink-soft hover:bg-surface-sunken hover:text-ink'}`}
    >
      {icon}
      <span className={`sidebar-label text-sm font-bold flex-1 truncate ${collapsed ? 'hidden' : ''}`}>{label}</span>
      {!collapsed && trailing}
    </button>
  );
}

export default function Sidebar({ collapsed, onToggle }) {
  const { activePlugins, currentPluginId, setCurrentPlugin, toggleStore, isStoreOpen } = usePluginStore();
  const { lock, currentUser } = useAuthStore();
  const [showSettings, setShowSettings] = useState(false);
  const activePluginDefs = activePlugins.map(id => ALL_PLUGINS.find(p => p.id === id)).filter(Boolean);

  return (
    <aside
      className={`sidebar ${collapsed ? 'collapsed' : ''} flex flex-col h-full bg-navy-900 border-r border-line/70 relative z-20`}
      style={{ minWidth: collapsed ? 68 : 248 }}
    >
      {/* Logo */}
      <div className={`flex items-center h-16 px-4 ${collapsed ? 'justify-center' : ''}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-accent-300 to-lavender flex items-center justify-center shadow-glow">
            <span className="font-display text-paper font-bold text-base italic">L</span>
          </div>
          {!collapsed && (
            <span className="font-display text-ink font-semibold text-xl animate-fade-in">
              Life<span className="gold-text italic">OS</span>
            </span>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        id="sidebar-toggle"
        onClick={onToggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute -right-3 top-[70px] w-6 h-6 rounded-full bg-surface border border-line flex items-center justify-center text-ink-muted hover:text-accent-500 hover:border-accent-300 transition-all z-30 shadow-soft"
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Plugins */}
      <nav className="flex-1 py-3 px-2.5 space-y-1 overflow-y-auto overflow-x-hidden" aria-label="Plugins">
        {!collapsed && (
          <p className="px-2.5 pb-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-faint">Your spaces</p>
        )}

        {activePluginDefs.length === 0 && !collapsed && (
          <div className="mx-1 my-3 px-4 py-5 text-center rounded-2xl border-2 border-dashed border-line">
            <p className="text-ink-muted text-xs leading-relaxed">Nothing here yet.<br />Open <b>Plugins</b> to add your first space ✨</p>
          </div>
        )}

        {activePluginDefs.map(plugin => (
          <NavButton
            key={plugin.id}
            id={`nav-${plugin.id}`}
            active={currentPluginId === plugin.id}
            collapsed={collapsed}
            title={plugin.name}
            onClick={() => setCurrentPlugin(plugin.id)}
            icon={
              <span
                className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: plugin.tint }}
              >
                {plugin.emoji}
              </span>
            }
            label={plugin.name}
          />
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-2.5 py-3 space-y-1 border-t border-line/70">
        <NavButton
          id="open-plugin-store"
          active={isStoreOpen}
          collapsed={collapsed}
          title="Plugin Store"
          onClick={toggleStore}
          icon={<span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-surface-sunken"><LayoutGrid className="w-[18px] h-[18px]" /></span>}
          label="Plugins"
          trailing={activePlugins.length > 0 && (
            <span className="text-[11px] bg-accent-100 text-accent-600 rounded-full px-2 py-0.5 font-extrabold">{activePlugins.length}</span>
          )}
        />

        {/* Current profile → settings */}
        {currentUser && (
          <button
            onClick={() => setShowSettings(true)}
            title={collapsed ? `${currentUser.name} · Settings` : undefined}
            className="w-full flex items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-surface-sunken transition-colors group"
          >
            <ProfileAvatar profile={currentUser} size="sm" />
            {!collapsed && (
              <>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-extrabold text-ink truncate">{currentUser.name}</span>
                  <span className="block text-[11px] text-ink-muted">Profile & settings</span>
                </span>
                <Settings className="w-4 h-4 text-ink-faint group-hover:text-accent-500 group-hover:rotate-45 transition-all" />
              </>
            )}
          </button>
        )}

        <NavButton
          id="lock-app"
          collapsed={collapsed}
          title="Lock LifeOS"
          onClick={lock}
          danger
          icon={<span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"><Lock className="w-[18px] h-[18px]" /></span>}
          label="Lock"
        />
      </div>

      {showSettings && <ProfileSettings onClose={() => setShowSettings(false)} />}
    </aside>
  );
}
