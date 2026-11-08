/**
 * nexxacrafts design tokens — "Precision Craft".
 * Source of truth for values: docs/DESIGN_SYSTEM.md (section 2–4).
 *
 * @type {import('tailwindcss').Config}
 */

/** Electric Blue — primary actions, links, focus, active navigation. 600 is the brand colour. */
const brand = {
  50: '#EEF3FF',
  100: '#DCE6FF',
  200: '#BFD0FF',
  300: '#93AEFF',
  400: '#5F83FF',
  500: '#2F5BFE',
  600: '#0341FC',
  700: '#0234D0',
  800: '#062BA6',
  900: '#0B2783',
  950: '#0A1A50',
};

/** Signal Red — logo and tiny brand markers only (index ticks, notification dots). */
const accent = {
  50: '#FEF2F2',
  100: '#FEE2E2',
  200: '#FECACA',
  300: '#FCA5A5',
  400: '#F87171',
  500: '#EF4444',
  600: '#DC2626',
  700: '#B91C1C',
  800: '#991B1B',
  900: '#7F1D1D',
};

/** Semantic scales (Tailwind emerald / amber / red / sky). */
const success = {
  50: '#ECFDF5',
  100: '#D1FAE5',
  200: '#A7F3D0',
  300: '#6EE7B7',
  400: '#34D399',
  500: '#10B981',
  600: '#059669',
  700: '#047857',
  800: '#065F46',
  900: '#064E3B',
  950: '#022C22',
};

const warning = {
  50: '#FFFBEB',
  100: '#FEF3C7',
  200: '#FDE68A',
  300: '#FCD34D',
  400: '#FBBF24',
  500: '#F59E0B',
  600: '#D97706',
  700: '#B45309',
  800: '#92400E',
  900: '#78350F',
  950: '#451A03',
};

const danger = {
  50: '#FEF2F2',
  100: '#FEE2E2',
  200: '#FECACA',
  300: '#FCA5A5',
  400: '#F87171',
  500: '#EF4444',
  600: '#DC2626',
  700: '#B91C1C',
  800: '#991B1B',
  900: '#7F1D1D',
  950: '#450A0A',
};

const info = {
  50: '#F0F9FF',
  100: '#E0F2FE',
  200: '#BAE6FD',
  300: '#7DD3FC',
  400: '#38BDF8',
  500: '#0EA5E9',
  600: '#0284C7',
  700: '#0369A1',
  800: '#075985',
  900: '#0C4A6E',
  950: '#082F49',
};

const systemSans = [
  'ui-sans-serif',
  'system-ui',
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'Roboto',
  '"Helvetica Neue"',
  'Arial',
  'sans-serif',
];

const systemMono = [
  'ui-monospace',
  'SFMono-Regular',
  'Menlo',
  'Monaco',
  'Consolas',
  '"Liberation Mono"',
  '"Courier New"',
  'monospace',
];

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand,
        accent,
        ink: {
          DEFAULT: '#0B1220',
          600: '#2A3552',
          700: '#1D2740',
          800: '#131B2E',
          900: '#0B1220',
          950: '#070B16',
        },
        paper: {
          DEFAULT: '#F7F7F4',
          2: '#EFEEE9',
        },
        canvas: '#F4F6F9',
        line: {
          DEFAULT: '#E3E7EE',
          strong: '#CBD3DF',
        },
        success,
        warning,
        danger,
        info,
        // Backwards-compatible aliases used by pages that predate the design system.
        primary: brand,
        secondary: accent,
      },
      fontFamily: {
        sans: ['Inter', ...systemSans],
        display: ['Manrope', 'Inter', ...systemSans],
        mono: ['"JetBrains Mono"', ...systemMono],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(11, 18, 32, 0.05)',
        sm: '0 1px 2px 0 rgba(11, 18, 32, 0.06), 0 1px 3px 0 rgba(11, 18, 32, 0.06)',
        md: '0 4px 12px -2px rgba(11, 18, 32, 0.08), 0 2px 4px -2px rgba(11, 18, 32, 0.05)',
        lg: '0 16px 32px -8px rgba(11, 18, 32, 0.14), 0 4px 10px -4px rgba(11, 18, 32, 0.06)',
        xl: '0 24px 56px -12px rgba(11, 18, 32, 0.2), 0 8px 18px -8px rgba(11, 18, 32, 0.08)',
      },
      zIndex: {
        60: '60',
        65: '65',
        70: '70',
      },
      spacing: {
        128: '32rem',
      },
      transitionProperty: {
        height: 'height',
        spacing: 'margin, padding',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'translateY(4px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'slide-in-left': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        'slide-in-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'scale-in': 'scale-in 160ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slide-in-right 220ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-left': 'slide-in-left 220ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-up': 'slide-in-up 200ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
