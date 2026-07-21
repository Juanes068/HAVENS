/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: '#F4EEE2', // Updated to warm beige per user request
        sand: '#F0EAE0',
        forest: {
          DEFAULT: '#2D5A3D',
          light: '#3d7a55',
        },
        sage: '#7aaa8a',
        terracotta: '#C47B5A',
        charcoal: '#2C2C2C',
        muted: '#8a8278',
        border: '#E2DBD0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
