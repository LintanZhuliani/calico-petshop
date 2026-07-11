/* eslint-env node */
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      "colors": {
        "on-primary-fixed": "#390c00",
        "on-tertiary-fixed-variant": "#004e5f",
        "on-secondary-container": "#5f6368",
        "tertiary-fixed-dim": "#5dd5f8",
        "outline": "#8c7169",
        "primary": "#a93705",
        "surface-variant": "#e1e3e4",
        "secondary": "#5b5f64",
        "background": "#f8f9fa",
        "primary-container": "#f26b3a",
        "on-surface": "#191c1d",
        "on-tertiary-container": "#00323e",
        "surface-container": "#edeeef",
        "inverse-surface": "#2e3132",
        "on-secondary": "#ffffff",
        "surface-container-low": "#f3f4f5",
        "error-container": "#ffdad6",
        "outline-variant": "#e0c0b6",
        "tertiary-container": "#00a2c3",
        "secondary-fixed": "#dfe3e8",
        "inverse-primary": "#ffb59c",
        "on-primary-container": "#571700",
        "on-primary": "#ffffff",
        "secondary-fixed-dim": "#c3c7cc",
        "tertiary-fixed": "#b3ebff",
        "inverse-on-surface": "#f0f1f2",
        "tertiary": "#00677d",
        "secondary-container": "#dde0e6",
        "surface-tint": "#a93705",
        "surface-container-high": "#e7e8e9",
        "surface-container-lowest": "#ffffff",
        "surface-bright": "#f8f9fa",
        "on-secondary-fixed-variant": "#43474c",
        "surface": "#f8f9fa",
        "on-primary-fixed-variant": "#832700",
        "on-tertiary": "#ffffff",
        "primary-fixed-dim": "#ffb59c",
        "surface-dim": "#d9dadb",
        "on-error-container": "#93000a",
        "on-background": "#191c1d",
        "error": "#ba1a1a",
        "on-surface-variant": "#58413a",
        "on-tertiary-fixed": "#001f27",
        "surface-container-highest": "#e1e3e4",
        "on-error": "#ffffff",
        "on-secondary-fixed": "#181c20",
        "primary-fixed": "#ffdbd0"
      },
      "borderRadius": {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        "full": "9999px"
      },
      "fontFamily": {
        "headline": ["Manrope"],
        "body": ["Inter"],
        "label": ["Inter"]
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries')
  ],
}
