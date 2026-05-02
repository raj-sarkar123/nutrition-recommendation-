/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#00694b',
          dim: '#005b41',
          container: '#8cfece',
          fixed: '#8cfece',
          'fixed-dim': '#7defc0',
        },
        'on-primary': {
          DEFAULT: '#c7ffe3',
          container: '#006146',
          fixed: '#004d36',
          'fixed-variant': '#006d4e',
        },
        secondary: {
          DEFAULT: '#266658',
          dim: '#16594c',
          container: '#afefdd',
          fixed: '#afefdd',
          'fixed-dim': '#a1e1cf',
        },
        'on-secondary': {
          DEFAULT: '#c3ffed',
          container: '#195c4e',
          fixed: '#00483c',
          'fixed-variant': '#266658',
        },
        tertiary: {
          DEFAULT: '#006859',
          dim: '#005a4e',
          container: '#a6feea',
          fixed: '#a6feea',
          'fixed-dim': '#98f0dc',
        },
        'on-tertiary': {
          DEFAULT: '#c2fff0',
          container: '#006456',
          fixed: '#005045',
          'fixed-variant': '#007060',
        },
        error: {
          DEFAULT: '#b31b25',
          dim: '#9f0519',
          container: '#fb5151',
        },
        'on-error': {
          DEFAULT: '#ffefee',
          container: '#570008',
        },
        surface: {
          DEFAULT: '#f5f7f8',
          bright: '#f5f7f8',
          dim: '#d0d5d7',
          container: '#e5e9ea',
          'container-low': '#eef1f2',
          'container-high': '#dfe3e4',
          'container-highest': '#d9dddf',
          'container-lowest': '#ffffff',
          variant: '#d9dddf',
          tint: '#00694b',
        },
        'on-surface': {
          DEFAULT: '#2c2f30',
          variant: '#595c5d',
        },
        'on-background': '#2c2f30',
        background: '#f5f7f8',
        outline: {
          DEFAULT: '#747778',
          variant: '#abadae',
        },
        'inverse-surface': '#0b0f10',
        'inverse-on-surface': '#9a9d9e',
        'inverse-primary': '#8cfece',
      },
      fontFamily: {
        headline: ['"Manrope"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        label: ['"Inter"', 'sans-serif'],
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
