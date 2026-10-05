import React from 'react';
import { X, Check, Plus, Sparkles } from 'lucide-react';
import { usePluginStore, ALL_PLUGINS } from '../../store/pluginStore';

export default function PluginStore() {
  const { activePlugins, activatePlugin, deactivatePlugin, closeStore } = usePluginStore();

  const available = ALL_PLUGINS.filter(p => p.available);
  const comingSoon = ALL_PLUGINS.filter(p => !p.available);

  return (
    <div className="animate-slide-in-left w-[340px] h-full bg-navy-900 border-r border-line/70 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <div>
          <h2 className="font-display text-ink font-semibold text-2xl">Plugins</h2>
          <p className="text-ink-muted text-xs mt-0.5">Pick the spaces you want in your LifeOS</p>
        </div>
        <button
          id="close-plugin-store"
          onClick={closeStore}
          aria-label="Close plugin store"
          className="w-9 h-9 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-surface-sunken transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-6">
        <div className="space-y-2.5">
          {available.map(plugin => {
            const isActive = activePlugins.includes(plugin.id);
            return (
              <div
                key={plugin.id}
                className={`plugin-card rounded-3xl p-3.5 border bg-surface ${isActive ? 'border-accent-200' : 'border-line/60'}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: plugin.tint }}>
                    {plugin.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-extrabold text-ink leading-tight">{plugin.name}</h3>
                    <p className="text-xs text-ink-muted mt-1 leading-relaxed">{plugin.description}</p>
                  </div>
                </div>
                <button
                  id={`plugin-toggle-${plugin.id}`}
                  onClick={() => isActive ? deactivatePlugin(plugin.id) : activatePlugin(plugin.id)}
                  className={`mt-3 w-full py-2 px-3 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5
                    ${isActive
                      ? 'bg-mint-light text-mint-deep hover:bg-red-50 hover:text-red-400 group'
                      : 'bg-accent-50 text-accent-500 hover:bg-accent-100'}`}
                >
                  {isActive
                    ? <><Check className="w-3.5 h-3.5" /> Added — click to remove</>
                    : <><Plus className="w-3.5 h-3.5" /> Add to my space</>}
                </button>
              </div>
            );
          })}
        </div>

        {comingSoon.length > 0 && (
          <div>
            <p className="text-[11px] font-extrabold text-ink-faint uppercase tracking-[0.14em] mb-2.5 px-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Coming soon
            </p>
            <div className="space-y-2">
              {comingSoon.map(plugin => (
                <div key={plugin.id} className="flex items-center gap-3 rounded-2xl border border-dashed border-line p-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 opacity-70" style={{ background: plugin.tint }}>
                    {plugin.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-extrabold text-ink-soft">{plugin.name}</h3>
                    <p className="text-[11px] text-ink-faint mt-0.5 truncate">{plugin.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-5 py-3 border-t border-line/70">
        <p className="text-xs text-ink-muted text-center font-semibold">
          {activePlugins.length} space{activePlugins.length !== 1 ? 's' : ''} added
        </p>
      </div>
    </div>
  );
}
