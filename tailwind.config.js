/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  // darkMode: 'class' — toggle dengan menambah class 'dark' di <html>
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Custom token agar konsisten antara light & dark
        surface: {
          DEFAULT: '#f8fafc',
          dark: '#0f172a',
        },
      },
    },
  },
  plugins: [],
}
