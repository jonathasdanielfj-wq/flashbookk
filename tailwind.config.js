/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        'black-studio': '#0a0a0a',
        'gray-card': '#1a1a1a',
        'accent-red': '#e11d48',
        'text-gray': '#a1a1aa',
      },
      borderRadius: {
        'studio': '20px',
      }
    },
  },
  plugins: [],
}