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
          'light-dark': '#80ED9915',
        },
        secondary: {
          DEFAULT: '#284B63',
          hover: '#1e3a4f',
          light: '#284B6315',
        },
        accent: {
          rose: '#E5C1BD',
          'rose-dark': '#c9a09b',
          mauve: '#977390',
          'mauve-dark': '#7a5c73',
          navy: '#153243',
          blue: '#284B63',
        },
        bg: {
          page: '#F4F6F8',
          'page-dark': '#0f1923',
          card: '#FFFFFF',
          'card-dark': '#1a2633',
          header: '#153243',
          'header-dark': '#0d1f2d',
          sidebar: '#153243',
          'sidebar-dark': '#0d1f2d',
          input: '#FFFFFF',
          'input-dark': '#1a2633',
        },
        border: {
          DEFAULT: '#E2E8EF',
          dark: '#1e3045',
          light: '#EEF1F5',
          'light-dark': '#182838',
        },
        text: {
          primary: '#153243',
          'primary-dark': '#E8F0F7',
          secondary: '#4A6278',
          'secondary-dark': '#8AABB8',
          tertiary: '#7A95A5',
          'tertiary-dark': '#5C7A8A',
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
