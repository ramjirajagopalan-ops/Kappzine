import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Iowan Old Style"', '"Palatino Linotype"', 'Georgia', 'serif'],
      },
      colors: {
        brass: '#b98d4a',
      },
    },
  },
  plugins: [],
};

export default config;
