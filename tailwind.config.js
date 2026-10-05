import colors from 'tailwindcss/colors';

/*
 * LifeOS "love-letter stationery" light theme.
 *
 * The app was first written for a dark navy/gold theme. Instead of rewriting
 * every class, the legacy color names are remapped onto light-theme tokens:
 *   navy-*   → surfaces (950 page cream … 800 white cards … 500 borders)
 *   slate-*  → ink scale (100–300 main text, 400–500 secondary, 600–700 faint)
 *   white    → ink (so text-white / bg-white/5 / border-white/10 read on cream)
 *   gold-*   → the active profile's accent (CSS variables, see src/theme/palettes.js)
 *   sage-*   → mint
 *   other hues (amber, cyan, …) → re-shaded: 200–400 deep enough for text on
 *     cream, 500 the true hue, 600–800 soft pastel fills, 900 pale tint.
 *
 * For NEW code prefer the semantic tokens: surface, ink, muted, line, accent,
 * blush, lavender, mint, peach.
 */

const cssVar = (name) => `rgb(var(--${name}) / <alpha-value>)`;
const varScale = (prefix, shades) =>
  Object.fromEntries(shades.map((s) => [s, cssVar(`${prefix}-${s}`)]));

// Light-theme reshading of a default Tailwind hue (see note above)
const lightHue = (c) => ({
  50: c[50], 100: c[100],
  200: c[800], 300: c[700], 400: c[700],
  500: c[500],
  600: c[300], 700: c[200], 800: c[200],
  900: c[100], 950: c[900],
});

const HUES = ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan',
  'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ...Object.fromEntries(HUES.map((hue) => [hue, lightHue(colors[hue])])),

        white: cssVar('ink'),
        black: cssVar('plum'),
        paper: '#FFFFFF', // a real white, when one is needed

        navy: varScale('surface', [500, 600, 700, 800, 900, 950]),
        slate: varScale('ink', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]),
        gold: {
          50: cssVar('accent-50'), 100: cssVar('accent-100'),
          200: cssVar('accent-500'), 300: cssVar('accent-500'),
          400: cssVar('accent-400'), 500: cssVar('accent-500'), 600: cssVar('accent-600'),
        },
        sage: {
          50: '#F1FBF6', 100: '#DDF5E9', 200: '#246B4F', 300: '#2F8865',
          400: '#3FA37C', 500: '#2F8865', 600: '#246B4F',
        },

        // Semantic tokens for new code
        surface: {
          DEFAULT: cssVar('surface-800'), // cards
          page: cssVar('surface-950'),
          sunken: cssVar('surface-700'),
          hover: cssVar('surface-600'),
        },
        ink: {
          DEFAULT: cssVar('ink-200'),
          soft: cssVar('ink-400'),
          muted: cssVar('ink-500'),
          faint: cssVar('ink-600'),
        },
        line: cssVar('surface-500'),
        accent: varScale('accent', [50, 100, 200, 300, 400, 500, 600]),
        blush: { light: '#FFE8EE', DEFAULT: '#F7A8B8', deep: '#C24D70' },
        lavender: { light: '#EFE8FA', DEFAULT: '#C3B1E1', deep: '#7459AE' },
        mint: { light: '#DDF5E9', DEFAULT: '#A8E6CF', deep: '#2F8865' },
        peach: { light: '#FFEBDD', DEFAULT: '#FFBE98', deep: '#C4643A' },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body: ['Nunito', 'system-ui', 'sans-serif'],
        arabic: ['Amiri', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgb(var(--plum) / 0.04), 0 4px 16px -4px rgb(var(--plum) / 0.08)',
        lift: '0 2px 4px rgb(var(--plum) / 0.04), 0 12px 32px -8px rgb(var(--plum) / 0.14)',
        glow: '0 6px 20px -6px rgb(var(--accent-400) / 0.55)',
      },
      animation: {
        'shake': 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'pop': 'pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        shake: {
          '10%, 90%': { transform: 'translate3d(-2px, 0, 0)' },
          '20%, 80%': { transform: 'translate3d(4px, 0, 0)' },
          '30%, 50%, 70%': { transform: 'translate3d(-8px, 0, 0)' },
          '40%, 60%': { transform: 'translate3d(8px, 0, 0)' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          from: { opacity: '0', transform: 'translateX(-20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgb(var(--accent-400) / 0.35)' },
          '50%': { boxShadow: '0 0 0 8px rgb(var(--accent-400) / 0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pop: {
          from: { opacity: '0', transform: 'scale(0.92)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
