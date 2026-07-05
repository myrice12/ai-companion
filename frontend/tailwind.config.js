/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        cute: {
          pink: "#fce7f3",
          rose: "#fda4af",
          lavender: "#e9d5ff",
          cream: "#fff7ed",
          text: "#881337",
          muted: "#be185d",
        },
      },
    },
  },
  plugins: [],
};
