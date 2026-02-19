/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2563EB",
          foreground: "#FFFFFF",
        },
        background: "#F8FAFC",
        'app-bg': '#F1F5F9',
        textMain: "#0F172A",
        textMuted: "#64748B",
        danger: "#EF4444",
        success: "#22C55E",
        warning: "#F59E0B",
        'card-blue': '#3B82F6',
        'card-green': '#10B981',
        'card-orange': '#F97316',
        'card-purple': '#8B5CF6',
      },
      borderRadius: {
        lg: "0.5rem",
        xl: "0.75rem",
        '2xl': "1rem",
      },
      boxShadow: {
        soft: "0 10px 30px rgba(15,23,42,0.08)",
      },
    },
  },
  plugins: [],
}
