const defaultTheme = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './*.html',
    './scripts/**/*.{js,ts}',
    './styles/**/*.{css,scss}',
    './src/**/*.{html,js,ts,css}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4285f4',
        secondary: '#34a853',
        danger: '#ea4335',
        surface: '#ffffff',
        surfaceMuted: '#f5f5f5',
        surfaceAlt: '#1a1a1a'
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Microsoft YaHei',
          'Arial',
          ...defaultTheme.fontFamily.sans
        ]
      },
      boxShadow: {
        card: '0 10px 30px rgba(15, 23, 42, 0.1)'
      }
    }
  },
  plugins: []
};
