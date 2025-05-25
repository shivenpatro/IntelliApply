/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'theme-bg': '#0A192F', // Primary Dark Background (Space Blue)
        'theme-surface': '#112240', // Slightly lighter for cards, modals (Midnight Surface)
        'theme-text-primary': '#CCD6F6', // Primary text (Light Slate)
        'theme-text-secondary': '#8892B0', // Secondary text (Slate Text)
        'theme-accent-cyan': '#64FFDA', // Primary Accent (Vibrant Cyan/Mint)
        'theme-accent-amber': '#FFCA28', // Secondary Accent (Vibrant Amber)
        // You can add more shades if needed, e.g., for hover states
        'theme-accent-cyan-darker': '#00C7B1', // Example for hover
        'theme-accent-amber-darker': '#FBC02D', // Example for hover
        // Keeping existing 'dark' palette for now if it's used for other UI elements,
        // or we can phase it out. For a full revamp, we'd replace it.
        // For now, let's assume we add new theme colors and can gradually replace old ones.
        // If you want to completely replace, we'd remove the old primary, secondary, accent, dark.
        // Let's add them for now:
        primary: { // This is from your old config, can be removed if not used
          50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8',
          500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81', 950: '#1e1b4b',
        },
         dark: { // This is from your old config
          50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8',
          500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#020617',
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', '"Noto Sans"', 'sans-serif', '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"', '"Noto Color Emoji"'],
        display: ['Manrope', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'], // Manrope for headings, Inter as fallback
      },
      boxShadow: {
        'glow': '0 0 15px rgba(99, 102, 241, 0.5)',
        'glow-lg': '0 0 25px rgba(99, 102, 241, 0.5)',
        'glow-xl': '0 0 35px rgba(99, 102, 241, 0.5)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 3s infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-mesh': 'linear-gradient(to right, rgba(99, 102, 241, 0.1), rgba(14, 165, 233, 0.1), rgba(20, 184, 166, 0.1))',
      },
    },
  },
  plugins: [],
}
