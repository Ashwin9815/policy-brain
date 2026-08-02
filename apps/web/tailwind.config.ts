/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#0f2744", light: "#1e3a5f" },
        accent: { DEFAULT: "#2b8fd9", dark: "#1e5a8a" },
      },
    },
  },
  plugins: [],
};
