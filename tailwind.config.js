/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/modules/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#111014',
        sidebar: '#17151D',
        card: {
          DEFAULT: '#1C1923',
          secondary: '#211E2A',
          tertiary: '#292534',
        },
        accent: {
          primary: '#A99BFF',
          secondary: '#8A7CF5',
          glow: 'rgba(169, 155, 255, 0.15)',
        },
        indicator: {
          positive: '#65D6A1',
          negative: '#F17D8B',
        },
        text: {
          primary: '#F5F3FA',
          secondary: '#A09BAE',
          muted: '#6E687E',
        },
        border: 'rgba(255, 255, 255, 0.08)',
        'border-subtle': 'rgba(255, 255, 255, 0.05)',
        'border-accent': 'rgba(169, 155, 255, 0.25)',
        foreground: '#F5F3FA',
        'muted-foreground': '#A09BAE',
        'chart-label': 'var(--chart-label)',
        'chart-tooltip-background': 'var(--chart-tooltip-background)',
        'chart-tooltip-foreground': 'var(--chart-tooltip-foreground)',
        'chart-tooltip-muted': 'var(--chart-tooltip-muted)',
        'chart-line-primary': 'var(--chart-line-primary)',
        'chart-line-secondary': 'var(--chart-line-secondary)',
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
        '4xl': '2.25rem',
      },
      boxShadow: {
        'card-glow': '0 0 35px -5px rgba(138, 124, 245, 0.12)',
        'inner-bevel': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.08)',
        'subtle-elevation': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      backgroundImage: {
        'card-lavender': 'linear-gradient(135deg, #7A6CF0 0%, #B8ACFF 50%, #8C7BFF 100%)',
        'card-glass': 'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)',
        'spotlight-radial': 'radial-gradient(circle at center, rgba(169, 155, 255, 0.18) 0%, transparent 70%)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

