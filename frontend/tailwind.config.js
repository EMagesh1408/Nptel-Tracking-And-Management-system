/** @type {import('tailwindcss').Config} */
export default {
  // hover: styles apply only on devices with a real pointer, so a tapped button on a phone
  // does not stay highlighted afterwards.
  future: { hoverOnlyWhenSupported: true },
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F3F1EC",
        ink: "#16213E",
        navy: {
          deep: "#0F1729",
          DEFAULT: "#16213E",
          light: "#2C3B62",
        },
        brass: {
          DEFAULT: "#B98B34",
          light: "#D9AE5E",
          dark: "#8C6A24",
        },
        teal: {
          DEFAULT: "#2E6F63",
          light: "#4C9186",
        },
        brick: "#A6432F",
        line: "#DAD5C8",
      },
      fontFamily: {
        serif: ["'Source Serif 4'", "Georgia", "serif"],
        sans: ["'IBM Plex Sans'", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "2px",
        DEFAULT: "3px",
      },
    },
  },
  plugins: [],
};
