/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1B2A4A',
          50: '#E8EBF0',
          100: '#C5CCD9',
          200: '#8B9AB3',
          300: '#51698D',
          400: '#2D4470',
          500: '#1B2A4A',
          600: '#15213A',
          700: '#10182B',
          800: '#0B101D',
          900: '#06080E',
        },
        accent: {
          DEFAULT: '#F59E0B',
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
      },
      fontFamily: {
        display: ['DM Sans', 'Noto Sans SC', 'sans-serif'],
        body: ['Noto Sans SC', 'DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
