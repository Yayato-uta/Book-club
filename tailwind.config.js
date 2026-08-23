/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#faf7f2',
        ink: '#1c1917',
        muted: '#78716c',
        rule: '#e7e2d9',
        card: '#ffffff',
        accent: '#7c5cff',
        thriving: '#3f9e6b',
        content: '#7aa64a',
        restless: '#d9a13b',
        unwell: '#d4703a',
        fading: '#b8443c',
      },
      fontFamily: {
        serif: ['Iowan Old Style', 'Palatino', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(28,25,23,0.05), 0 4px 16px rgba(28,25,23,0.06)',
      },
    },
  },
  plugins: [],
};
