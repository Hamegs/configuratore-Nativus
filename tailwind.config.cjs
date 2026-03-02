/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef3f6',
          100: '#d6e4ea',
          200: '#adc8d5',
          300: '#7fa7ba',
          400: '#5685a0',
          500: '#3d6882',
          600: '#345266',
          700: '#2b4455',
          800: '#2f3d4c',
          900: '#1e2a35',
        },
        sand: {
          50:  '#faf8f5',
          100: '#f0ebe2',
          200: '#e2d9cb',
          300: '#cab8a1',
          400: '#b5a088',
          500: '#9c8570',
          600: '#826b58',
          700: '#5a432a',
        },
        accent: {
          DEFAULT: '#b82a3a',
          50:  '#fdf0f1',
          100: '#fad7da',
          200: '#f4a0a8',
          300: '#ec6674',
          400: '#e03a4e',
          500: '#b82a3a',
          600: '#9a2231',
          700: '#7a1926',
        },
        gold: {
          DEFAULT: '#fdab09',
          100: '#fef0cc',
          500: '#fdab09',
          600: '#d48e00',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Helvetica Neue', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
