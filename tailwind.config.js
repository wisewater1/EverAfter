/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        'xs': '375px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1440px',
        '2xl': '1920px',
        'compact': '360px',
        'iphone-se': '375px',
        'iphone-pro': '430px',
        'ipad-mini': '768px',
        'ipad-pro': '1024px',
      },
      spacing: {
        '4.5': '1.125rem',
        '18': '4.5rem',
        '88': '22rem',
        '104': '26rem',
        '120': '30rem',
      },
      fontSize: {
        'xxs': ['0.625rem', { lineHeight: '0.875rem' }],
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.6' }],
        'lg': ['1.125rem', { lineHeight: '1.6' }],
        'xl': ['1.25rem', { lineHeight: '1.4' }],
        '2xl': ['1.5rem', { lineHeight: '1.3' }],
        '3xl': ['1.875rem', { lineHeight: '1.2' }],
        '4xl': ['2.25rem', { lineHeight: '1.2' }],
        '5xl': ['3rem', { lineHeight: '1.2' }],
        '6xl': ['3.75rem', { lineHeight: '1.1' }],
      },
      minHeight: {
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      },
      maxWidth: {
        'container-primary': '1280px',
        'container-secondary': '1152px',
        'content': '896px',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'glow-emerald': '0 0 20px rgba(52, 211, 153, 0.3)',
        'glow-emerald-sm': '0 0 10px rgba(52, 211, 153, 0.2)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.15)',
        'card-hover': '0 8px 32px rgba(0, 0, 0, 0.2)',
      },
      transitionDuration: {
        'fast': '100ms',
        'normal': '200ms',
        'smooth': '300ms',
        'slow': '500ms',
      },
    },
  },
  plugins: [],
};
