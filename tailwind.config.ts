import type { Config } from 'tailwindcss'

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
          DEFAULT: '#4a7c59',
          hover: '#3d6b4a',
          light: '#E8F5E9',
          'light-dark': '#4a7c5940',
        },
        secondary: {
          DEFAULT: '#8b4513',
          hover: '#a0592a',
          light: '#8b451320',
        },
        bg: {
          page: '#F8FAF5',
          'page-dark': '#1a1a14',
          card: '#FFFFFF',
          'card-dark': '#2a2a1e',
          header: '#4a7c59',
          'header-dark': '#2d4a35',
          sidebar: '#3d6b4a',
          'sidebar-dark': '#1e3326',
          input: '#FFFFFF',
          'input-dark': '#222218',
        },
        border: {
          DEFAULT: '#D8E4D0',
          dark: '#3d3d2e',
          light: '#E8F0E4',
          'light-dark': '#333328',
        },
        text: {
          primary: '#1A2E1A',
          'primary-dark': '#F5F5DC',
          secondary: '#5A6E5A',
          'secondary-dark': '#B8B8A0',
          tertiary: '#8A9A8A',
          'tertiary-dark': '#8E8E80',
          'on-primary': '#FFFFFF',
          'on-header': '#FFFFFF',
          success: '#2E7D32',
          'success-dark': '#81C784',
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
