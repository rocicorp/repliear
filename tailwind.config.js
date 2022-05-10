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
      yellow: "#f2c94c",
      blue: "#5e6ad2",
      white: "#F7F8F8",
      gray: {
        DEFAULT: "#1F2023",
        50: "#f3f4f6",
        100: "#D7D8DB",
        200: "#757984",
        300: "#6C6F7A",
        400: "#646870",
        500: "#585B64",
        600: "#46484E",
        700: "#45484E",
        750: "#27282B",
        800: "#303236",
        850: "#323439",
        900: "#2D2F36",
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
        185: "800px",
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
