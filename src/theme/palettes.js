// Accent palettes a profile can choose. The whole app picks up the active
// profile's accent through the --accent-* CSS variables (Tailwind: `accent-*`,
// and the legacy `gold-*` classes, which map onto the same variables).
//
// Shades: 50–100 washes, 200–300 the pastel itself, 400 main accent (buttons,
// highlights — dark enough for light text), 500–600 deeper tones for text.
export const ACCENT_PALETTES = {
  blush: {
    label: 'Blush',
    shades: { 50: '#FFF5F7', 100: '#FFE8EE', 200: '#FBD0DB', 300: '#F7A8B8', 400: '#DD6687', 500: '#C24D70', 600: '#9E3A59' },
  },
  lavender: {
    label: 'Lavender',
    shades: { 50: '#F8F5FD', 100: '#EFE8FA', 200: '#DFD2F3', 300: '#C3B1E1', 400: '#8C70C4', 500: '#7459AE', 600: '#5A438C' },
  },
  mint: {
    label: 'Mint',
    shades: { 50: '#F1FBF6', 100: '#DDF5E9', 200: '#C3EDD8', 300: '#A8E6CF', 400: '#3FA37C', 500: '#2F8865', 600: '#246B4F' },
  },
  peach: {
    label: 'Peach',
    shades: { 50: '#FFF7F1', 100: '#FFEBDD', 200: '#FFD7BD', 300: '#FFBE98', 400: '#E07D4C', 500: '#C4643A', 600: '#9E4E2C' },
  },
  sky: {
    label: 'Sky',
    shades: { 50: '#F2F8FE', 100: '#E1EFFC', 200: '#C6E0F8', 300: '#A6CFF2', 400: '#4F8FCC', 500: '#3A77B4', 600: '#2D5E90' },
  },
};

export const DEFAULT_ACCENT = 'blush';

// Emoji avatars offered when creating/editing a profile
export const AVATARS = ['🌸', '🌷', '🦋', '🐰', '🐱', '🦊', '🐻', '🐼', '🌙', '⭐', '🍓', '🍑', '🌻', '🍀', '☁️', '💜'];

const hexToTriplet = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

export function getPalette(name) {
  return ACCENT_PALETTES[name] || ACCENT_PALETTES[DEFAULT_ACCENT];
}

// Recolor the app: write the palette into the --accent-* variables on <html>
export function applyAccent(name) {
  const { shades } = getPalette(name);
  const root = document.documentElement;
  for (const [shade, hex] of Object.entries(shades)) {
    root.style.setProperty(`--accent-${shade}`, hexToTriplet(hex));
  }
}
