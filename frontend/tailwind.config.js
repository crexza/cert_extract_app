/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "../index.html",
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enables class-driven dark mode parsing seamlessly
  theme: {
    extend: {},
  },
  plugins: [],
}