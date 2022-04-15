module.exports = {
  darkMode: "media",
  content: ["./pages/**/*.{js,ts,jsx,tsx}", "./frontend/**/*.{js,ts,jsx,tsx}"],
  theme: {
    screens: {
      sm: "640px",
      // => @media (min-width: 640px) { ... }

      md: "768px",
      // => @media (min-width: 768px) { ... }

      lg: "1024px",
      // => @media (min-width: 1024px) { ... }

      xl: "1280px",
      // => @media (min-width: 1280px) { ... }

      "2xl": "1536px",
      // => @media (min-width: 1536px) { ... }
    },
    colors: {
      white: "#f7f8f8",
      gray: {
        DEFAULT: "#1F2023",
        1: "#425563",
        2: "#f3f4f6",
        3: "#46484E",
        50: "#757984",
        100: "#6C6F7A",
        200: "#585B64",
        300: "#45484E",
        400: "#323439",
        450: "#2d2f36",
        500: "#1F2023",
        600: "#050505",
        700: "#000000",
        800: "#000000",
        900: "#000000",
      },
    },
    fontFamily: {
      sans: [
        "Inter\\ UI",
        "SF\\ Pro\\ Display",
        "-apple-system",
        "BlinkMacSystemFont",
        "Segoe\\ UI",
        "Roboto",
        "Oxygen",
        "Ubuntu",
        "Cantarell",
        "Open\\ Sans",
        "Helvetica\\ Neue",
        "sans-serif",
      ],
    },
    borderWidth: {
      DEFAULT: "1px",
      0: "0",
      2: "2px",
      3: "3px",
      4: "4px",
      6: "6px",
      8: "8px",
    },
    extend: {
      boxShadow: {
        modal: "rgb(0 0 0 / 9%) 0px 3px 12px",
        "large-modal": "rgb(0 0 0 / 50%) 0px 16px 70px",
      },
      spacing: {
        2.5: "10px",
        4.5: "18px",
        3.5: "14px",
        34: "136px",

        70: "280px",
        140: "560px",
        100: "400px",
        175: "700px",
        53: "212px",
        90: "360px",
      },
      fontSize: {
        xxs: "0.5rem",
        xs: "0.75rem", // 12px
        sm: "0.8125rem", // 13px
        md: "0.9357rem", //15px
        14: "0.875rem",
        base: "1.0rem", // 16px
      },
      zIndex: {
        100: 100,
        50: 50,
      },
    },
  },
  variants: {
    extend: {
      backgroundColor: ["checked"],
      borderColor: ["checked"],
    },
  },
  plugins: [require("@tailwindcss/line-clamp"), require("@tailwindcss/forms")],
};
