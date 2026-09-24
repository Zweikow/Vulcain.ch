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
        // shadcn/ui semantic tokens (HSL variables)
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          hover: 'hsl(var(--primary-hover, var(--primary)))',
          light: '#80ED9925',
          'light-dark': '#80ED9920',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
          hover: '#1e3a4f',
          light: '#284B6315',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
          rose: '#E5C1BD',
          'rose-dark': '#B8837E',
          mauve: '#977390',
          'mauve-dark': '#6B4F68',
          navy: '#153243',
          blue: '#284B63',
          amber: '#D0871E',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },

        // Legacy brand palette compatibility
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
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        pill: '999px',
      },
      animation: {
        spotlight: 'spotlight 2s ease .75s 1 forwards',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        shimmer: 'shimmer 2s linear infinite',
      },
      keyframes: {
        spotlight: {
          '0%': {
            opacity: '0',
            transform: 'translate(-72%, -62%) scale(0.5)',
          },
          '100%': {
            opacity: '1',
            transform: 'translate(-50%,-40%) scale(1)',
          },
        },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        shimmer: {
          from: {
            backgroundPosition: '0 0',
          },
          to: {
            backgroundPosition: '-200% 0',
          },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
export default config
