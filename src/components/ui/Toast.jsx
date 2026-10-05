import React from 'react';
import { useToastStore } from '../../store/toastStore';

const TOAST_STYLES = {
  error: 'bg-red-500/10 text-red-400 border-red-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  success: 'bg-sage-400/10 text-sage-300 border-sage-400/20',
};

export default function Toast() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(toast => (
        <div 
          key={toast.id} 
          className={`animate-slide-in flex items-center justify-between min-w-[280px] p-3 rounded-lg shadow-lg shadow-black/20 text-sm font-medium border
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
