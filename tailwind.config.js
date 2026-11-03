/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        pw: {
          bg: '#F5F7F3',
          surface: '#EBF0E9',
          card: '#FFFFFF',
          dark: '#202320',
          charcoal: '#191B19',
          muted: '#777F77',
          lime: '#DFFF52',
          'lime-hover': '#D4F838',
          sage: '#B9D99B',
          border: '#E7EBE5',
          'border-strong': '#D8DFD4',
          danger: '#E5484D',
          'danger-soft': '#FFEFEF',
          success: '#2E7D32',
          'success-soft': '#E8F5E9',
          warning: '#E67E22',
          'warning-soft': '#FFF6ED',
        },
      },
      borderRadius: {
        '2xl': '1.125rem',
        '3xl': '1.5rem',
        '4xl': '1.875rem',
      },
      boxShadow: {
        'pw-card': '0 4px 20px -4px rgba(25, 27, 25, 0.04), 0 1px 3px 0 rgba(25, 27, 25, 0.02)',
        'pw-elevated': '0 12px 32px -8px rgba(25, 27, 25, 0.08), 0 2px 6px 0 rgba(25, 27, 25, 0.04)',
        'pw-nav': '0 -4px 24px -4px rgba(25, 27, 25, 0.06)',
        'pw-lime': '0 6px 20px -4px rgba(185, 217, 155, 0.45)',
      },
      fontFamily: {
        sans: ['var(--font-plus-jakarta)', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

