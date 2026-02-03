/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Tankuy brand colors - fuel/eco theme
        primary: {
          50: "#eefbf3",
          100: "#d5f6e0",
          200: "#aeecc6",
          300: "#79dba3",
          400: "#41c479",
          500: "#1fa85c", // Main brand green
          600: "#128a4a",
          700: "#106f3e",
          800: "#105833",
          900: "#0e482b",
        },
        secondary: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#b9e5fe",
          300: "#7cd1fd",
          400: "#36bafa",
          500: "#0ca0eb", // Accent blue
          600: "#0080c9",
          700: "#0166a3",
          800: "#065686",
          900: "#0b486f",
        },
        dark: {
          50: "#f6f6f6",
          100: "#e7e7e7",
          200: "#d1d1d1",
          300: "#b0b0b0",
          400: "#888888",
          500: "#6d6d6d",
          600: "#5d5d5d",
          700: "#4f4f4f",
          800: "#1a1a1a", // Main dark bg
          900: "#0d0d0d",
        },
      },
    },
  },
  plugins: [],
};
