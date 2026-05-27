/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FDFBF7',
          100: '#F6F1E9',
          200: '#EAE0D5',
          800: '#5C5446',
        }
      }
    },
  },
  plugins: [],
}