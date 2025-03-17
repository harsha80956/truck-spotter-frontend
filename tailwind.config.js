/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1a73e8",
        secondary: "#5f6368",
        background: "#f8f9fa",
        offDuty: "#f0f0f0",
        sleeper: "#d1e7dd",
        driving: "#cfe2ff",
        onDuty: "#fff3cd",
      },
    },
  },
  plugins: [],
} 