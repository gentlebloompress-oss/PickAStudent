/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        canvas: {
          DEFAULT: '#f6f8fb',
          dark: '#0b1220',
          contrast: '#000000',
        },
        ink: {
          DEFAULT: '#0f172a',
          dark: '#e6eefc',
          contrast: '#ffffff',
        },
        brand: {
          50: '#eff8ff',
          100: '#dbeefe',
          200: '#bee0fd',
          300: '#92cdfb',
          400: '#5fb1f7',
          500: '#3a93f0',
          600: '#2576dc',
          700: '#1d5fbb',
          800: '#1d4f96',
          900: '#1f4378',
        },
        sage: {
          400: '#7cc7a3',
          500: '#56b389',
          600: '#3e9b71',
        },
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'pop': {
          '0%': { transform: 'scale(0.85)', opacity: '0' },
          '60%': { transform: 'scale(1.05)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'pop': 'pop 280ms cubic-bezier(.2,.8,.2,1)',
      },
    },
  },
  plugins: [],
};
