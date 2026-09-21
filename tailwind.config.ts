import type { Config } from 'tailwindcss'
import { heroui } from '@heroui/react'

// Palette Drinkcider — Sprint 1
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
    './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
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
        // Tokens Sémantiques HeroUI (ex-NextUI)
        content1: {
          DEFAULT: 'var(--heroui-content1, #FFFFFF)',
          foreground: 'var(--heroui-content1-foreground, #153243)',
        },
        content2: {
          DEFAULT: 'var(--heroui-content2, #F4F4F6)',
          foreground: 'var(--heroui-content2-foreground, #153243)',
        },
        content3: {
          DEFAULT: 'var(--heroui-content3, #EAEAEF)',
          foreground: 'var(--heroui-content3-foreground, #153243)',
        },
        divider: 'var(--heroui-divider, rgba(21, 50, 67, 0.08))',
        default: {
          50: 'var(--heroui-default-50, #FAFAF9)',
          100: 'var(--heroui-default-100, #F4F4F5)',
          200: 'var(--heroui-default-200, #E4E4E7)',
          300: 'var(--heroui-default-300, #D4D4D8)',
          400: 'var(--heroui-default-400, #A1A1AA)',
          500: 'var(--heroui-default-500, #71717A)',
          600: 'var(--heroui-default-600, #52525B)',
          700: 'var(--heroui-default-700, #3F3F46)',
          800: 'var(--heroui-default-800, #27272A)',
          900: 'var(--heroui-default-900, #18181B)',
        },
      },
      fontFamily: {
        body: ['Plus Jakarta Sans', 'sans-serif'],
        display: ['Fraunces', 'serif'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '18px',
        '2xl': '22px',
        '3xl': '28px',
        pill: '999px',
      },
      boxShadow: {
        'heroui-sm': '0 2px 8px -2px rgba(0, 0, 0, 0.05)',
        'heroui-md': '0 8px 24px -4px rgba(0, 0, 0, 0.08)',
        'heroui-lg': '0 16px 36px -6px rgba(0, 0, 0, 0.12)',
        'heroui-primary': '0 8px 24px -4px rgba(128, 237, 153, 0.35)',
      },
    },
  },
  plugins: [
    heroui({
      themes: {
        light: {
          colors: {
            primary: {
              DEFAULT: '#80ED99',
              foreground: '#153243',
            },
            focus: '#80ED99',
          },
        },
        dark: {
          colors: {
            primary: {
              DEFAULT: '#80ED99',
              foreground: '#153243',
            },
            focus: '#80ED99',
          },
        },
      },
    }),
  ],
}
export default config
