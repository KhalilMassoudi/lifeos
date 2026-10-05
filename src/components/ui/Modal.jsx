import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// Centered dialog rendered at <body> level (never clipped by scroll areas or
// transformed parents). Closes on Escape and on backdrop click.
export default function Modal({ title, subtitle, icon, onClose, children, footer, size = 'md' }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };

  return createPortal(
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/25 backdrop-blur-[3px]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`modal-content w-full ${widths[size]} bg-surface rounded-t-[28px] sm:rounded-[28px] shadow-lift border border-paper flex flex-col max-h-[92vh]`}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-line/60">
          <div className="flex items-center gap-3 min-w-0">
            {icon && <div className="w-10 h-10 rounded-2xl bg-accent-50 text-accent-500 flex items-center justify-center flex-shrink-0">{icon}</div>}
            <div className="min-w-0">
              <h2 className="font-display text-xl font-semibold text-ink truncate">{title}</h2>
              {subtitle && <p className="text-xs text-ink-muted mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-surface-sunken transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && <div className="px-6 py-4 border-t border-line/60 flex gap-2 justify-end">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

// Shared button styles for new screens
export const btn = {
  primary: 'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm text-paper bg-gradient-to-r from-accent-400 to-accent-500 shadow-glow hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-none',
  secondary: 'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm text-ink-soft bg-surface-sunken hover:bg-surface-hover active:scale-[0.98] transition-all disabled:opacity-45',
  ghost: 'inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-bold text-sm text-ink-muted hover:text-ink hover:bg-surface-sunken transition-colors',
  danger: 'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl font-bold text-sm text-red-400 bg-red-50 hover:bg-red-100 transition-colors',
};
