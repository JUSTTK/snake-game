/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'snake-green': '#4ade80',
        'snake-dark': '#166534',
        'snake-red': '#ef4444',
        'game-bg': '#1f2937',
      },
    },
  },
  plugins: [],
}