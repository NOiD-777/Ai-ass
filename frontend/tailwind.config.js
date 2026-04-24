/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"IBM Plex Serif"', 'serif'],
      },
      colors: {
        dawn: '#f5f2e8',
        clay: '#c55d34',
        pine: '#1f4f46',
        ink: '#1f2328',
      },
    },
  },
  plugins: [],
};
