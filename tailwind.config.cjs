/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f8f5f0',
          100: '#ede5d8',
          200: '#d9c9b0',
          300: '#c0a87e',
          400: '#a8885a',
          500: '#8c6d42',
          600: '#725636',
          700: '#5a432a',
          800: '#3d2e1d',
          900: '#241a0f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
