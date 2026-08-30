
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand:   { 400: '#22d3ee', 500: '#06b6d4' },
        surface: { 900: '#0a0a0f', 800: '#12121a', 700: '#1a1a26', 600: '#22223a' },
      },
      animation: {
        'fade-in':   'fadeIn 0.4s ease-out',
        'slide-up':  'slideUp 0.4s ease-out',
        'scale-in':  'scaleIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 },                          to: { opacity: 1 } },
        slideUp: { from: { transform: 'translateY(24px)', opacity: 0 }, to: { transform: 'translateY(0)', opacity: 1 } },
        scaleIn: { from: { transform: 'scale(0.95)', opacity: 0 }, to: { transform: 'scale(1)',    opacity: 1 } },
      },
    },
  },
  plugins: [],
}
