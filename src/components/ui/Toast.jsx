import React from 'react';
import { useToastStore } from '../../store/toastStore';

const TOAST_STYLES = {
  error: 'bg-red-50 text-red-400 border-red-100',
  warning: 'bg-amber-50 text-amber-400 border-amber-100',
  success: 'bg-mint-light text-mint-deep border-mint/60',
};

export default function Toast() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2" role="status" aria-live="polite">
      {toasts.map(toast => (
        <div 
          key={toast.id} 
          className={`animate-slide-in flex items-center justify-between min-w-[280px] max-w-sm px-4 py-3 rounded-2xl shadow-lift text-sm font-bold border
            ${TOAST_STYLES[toast.type] || TOAST_STYLES.success}`}
        >
          <span>{toast.message}</span>
          <button 
            onClick={() => removeToast(toast.id)}
            className="ml-4 opacity-60 hover:opacity-100 transition-opacity"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
