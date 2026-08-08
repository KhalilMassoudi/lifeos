import React from 'react';
import { usePluginStore, ALL_PLUGINS } from '../../store/pluginStore';

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);
const SparkleIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
    <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
  </svg>
);

export default function PluginStore() {
  const { activePlugins, activatePlugin, deactivatePlugin, closeStore } = usePluginStore();

  const available = ALL_PLUGINS.filter(p => p.available);
  const comingSoon = ALL_PLUGINS.filter(p => !p.available);

  return (
    <div className="animate-slide-in w-80 h-full bg-navy-800 border-r border-white/5 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div>
          <h2 className="font-display text-gold-400 font-semibold text-base">Plugin Store</h2>
          <p className="text-slate-500 text-xs mt-0.5">Activate features for your OS</p>
        </div>
        <button
          id="close-plugin-store"
          onClick={closeStore}
          className="w-8 h-8 rounded-lg bg-navy-700 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-navy-600 transition-all"
        >
          <XIcon />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Available plugins */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3 px-1">
            Available
          </p>
          <div className="space-y-3">
            {available.map(plugin => {
              const isActive = activePlugins.includes(plugin.id);
              return (
                <div
                  key={plugin.id}
                  className={`plugin-card glass-card-sm p-4 relative ${isActive ? 'border-gold-400/25' : ''}`}
                >
                  {isActive && (
                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-sage-400/20 border border-sage-400/40 flex items-center justify-center text-sage-300">
                      <CheckIcon />
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plugin.color} flex items-center justify-center text-xl flex-shrink-0`}>
                      {plugin.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-slate-200 leading-tight">{plugin.name}</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{plugin.description}</p>
                    </div>
                  </div>
                  <button
                    id={`plugin-toggle-${plugin.id}`}
                    onClick={() => isActive ? deactivatePlugin(plugin.id) : activatePlugin(plugin.id)}
                    className={`mt-3 w-full py-2 px-3 rounded-lg text-xs font-semibold transition-all
                      ${isActive
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                        : 'bg-gold-400/15 text-gold-300 border border-gold-400/25 hover:bg-gold-400/25'
                      }`}
                  >
                    {isActive ? '✕ Deactivate' : '✦ Activate'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coming Soon */}
        <div>
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-3 px-1 flex items-center gap-2">
            <SparkleIcon /> Coming Soon
          </p>
          <div className="space-y-2">
            {comingSoon.map(plugin => (
              <div
                key={plugin.id}
                className="plugin-card rounded-xl border border-white/5 bg-navy-900/50 p-3 opacity-60"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-navy-700 flex items-center justify-center text-lg flex-shrink-0 grayscale opacity-60">
                    {plugin.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-semibold text-slate-400">{plugin.name}</h3>
                    <p className="text-xs text-slate-600 mt-0.5 truncate">{plugin.description}</p>
                  </div>
                  <span className="text-xs bg-navy-700 text-slate-600 rounded-full px-2 py-0.5 flex-shrink-0">Soon</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/5">
        <p className="text-xs text-slate-600 text-center">
          {activePlugins.length} plugin{activePlugins.length !== 1 ? 's' : ''} active
        </p>
      </div>
    </div>
  );
}
