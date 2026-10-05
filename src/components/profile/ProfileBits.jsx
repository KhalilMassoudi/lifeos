import React from 'react';
import { Check } from 'lucide-react';
import { ACCENT_PALETTES, AVATARS, getPalette } from '../../theme/palettes';

// Emoji avatar on a pastel disc in the profile's own color
export function ProfileAvatar({ profile, size = 'md', ring = false }) {
  const { shades } = getPalette(profile?.color);
  const sizes = {
    sm: 'w-8 h-8 text-base',
    md: 'w-11 h-11 text-xl',
    lg: 'w-20 h-20 text-4xl',
  };
  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center flex-shrink-0 select-none transition-shadow`}
      style={{
        background: `linear-gradient(140deg, ${shades[100]}, ${shades[300]})`,
        boxShadow: ring ? `0 0 0 3px #fff, 0 0 0 6px ${shades[300]}` : undefined,
      }}
      aria-hidden="true"
    >
      {profile?.avatar || (profile?.name?.[0] ?? '?').toUpperCase()}
    </div>
  );
}

export function AvatarPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-8 gap-1.5" role="radiogroup" aria-label="Avatar">
      {AVATARS.map(emoji => (
        <button
          key={emoji}
          type="button"
          role="radio"
          aria-checked={value === emoji}
          onClick={() => onChange(emoji)}
          className={`aspect-square rounded-xl text-xl flex items-center justify-center transition-all
            ${value === emoji
              ? 'bg-accent-100 ring-2 ring-accent-300 scale-105'
              : 'bg-surface-sunken hover:bg-surface-hover hover:scale-105'}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

export function ColorPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Color">
      {Object.entries(ACCENT_PALETTES).map(([key, palette]) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={value === key}
          title={palette.label}
          onClick={() => onChange(key)}
          className="group flex flex-col items-center gap-1"
        >
          <span
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform group-hover:scale-110
              ${value === key ? 'scale-110' : ''}`}
            style={{
              background: `linear-gradient(140deg, ${palette.shades[200]}, ${palette.shades[400]})`,
              boxShadow: value === key ? `0 0 0 3px #fff, 0 0 0 5px ${palette.shades[400]}` : undefined,
            }}
          >
            {value === key && <Check className="w-4 h-4 text-paper" strokeWidth={3} />}
          </span>
          <span className={`text-[11px] font-semibold ${value === key ? 'text-ink' : 'text-ink-muted'}`}>{palette.label}</span>
        </button>
      ))}
    </div>
  );
}
