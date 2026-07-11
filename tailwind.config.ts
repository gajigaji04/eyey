import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // 안약별 고정 색상 (요구사항의 색상 구분)
        moxi: '#f8fafc', // 목시아인 - 흰색
        lotemax: '#f9c9d6', // 로테맥스 - 연분홍
        dequs: '#8ecae6', // 디쿠스 - 하늘색
        cica: '#52b788', // 시카플루이드겔 - 초록
        serum: '#f4d35e', // 혈청 - 노랑
        brand: {
          50: '#eef7ff',
          100: '#d9edff',
          500: '#2f7ff5',
          600: '#1f65d6',
          700: '#184fab',
        },
      },
      keyframes: {
        pulseRing: {
          '0%': { boxShadow: '0 0 0 0 rgba(47,127,245,0.5)' },
          '70%': { boxShadow: '0 0 0 12px rgba(47,127,245,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(47,127,245,0)' },
        },
      },
      animation: {
        pulseRing: 'pulseRing 2s infinite',
      },
    },
  },
  plugins: [],
};

export default config;
