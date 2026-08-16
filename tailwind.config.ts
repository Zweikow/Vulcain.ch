import type { Config } from 'tailwindcss'

// Palette Cidrerie du Vulcain — Sprint 1
// #153243 Deep Space Blue  → sidebar, header
// #284B63 Yale Blue        → éléments secondaires nav
// #E5C1BD Cotton Rose      → accent chaud, cartes stat
// #80ED99 Light Green      → couleur principale, succès
// #977390 Dusty Mauve      → accent secondaire, cartes stat

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#80ED99',
          hover: '#5ed97f',
          light: '#80ED9925',
          'light-dark': '#80ED9920',
        },
        secondary: {
          DEFAULT: '#284B63',
          hover: '#1e3a4f',
          light: '#284B6315',
        },
        accent: {
          rose: '#E5C1BD',
          'rose-dark': '#B8837E',
          mauve: '#977390',
          'mauve-dark': '#6B4F68',
          navy: '#153243',
          blue: '#284B63',
        },
        bg: {
          page: '#F7F6F0',
          'page-dark': '#0D1B2A',
          card: '#FFFFFF',
          'card-dark': '#152232',
          header: '#153243',
          'header-dark': '#0A1520',
          sidebar: '#153243',
          'sidebar-dark': '#0D1B2A',
          input: '#FFFFFF',
          'input-dark': '#1C2E40',
        },
        border: {
          DEFAULT: '#E2E8EF',
          dark: '#1E3248',
          light: '#EEF1F5',
          'light-dark': '#162840',
        },
        text: {
          primary: '#153243',
          'primary-dark': '#D6E8F5',
          secondary: '#4A6278',
          'secondary-dark': '#7AAFC7',
          tertiary: '#7A95A5',
          'tertiary-dark': '#4D7A96',
          'on-primary': '#153243',
          'on-header': '#FFFFFF',
          success: '#28a745',
          'success-dark': '#80ED99',
          error: '#C62828',
          'error-dark': '#EF5350',
          warning: '#E65100',
          'warning-dark': '#FF9800',
        },
      },
      fontFamily: {
        body: ['Plus Jakarta Sans', 'sans-serif'],
        display: ['Fraunces', 'serif'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
        pill: '999px',
      },
    },
  },
  plugins: [],
}
export default config
