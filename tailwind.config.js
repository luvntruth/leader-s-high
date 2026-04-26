/**
 * P1-B: index.html 의 inline tailwind.config 을 PostCSS 빌드로 이전.
 * 기존 CDN 의 ?plugins=forms,container-queries 와 동등하게 두 plugin 등록.
 */
import forms from '@tailwindcss/forms';
import containerQueries from '@tailwindcss/container-queries';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './screens/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    './contexts/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#00F2FF',
        'primary-dark': '#00C2CC',
        'navy-deep': '#060B18',
        'navy-card': '#0F1729',
        'navy-mid': '#161D2F',
        'accent-neon': '#00F2FF',
        'accent-amber': '#FFB800',
        'accent-purple': '#9F7AEA',
        'accent-green': '#10B981',
        'accent-red': '#EF4444',
        'text-main': '#FFFFFF',
        'text-sub': '#94A3B8',
        'game-gold': '#FFD700',
        'game-hp': '#FF4757',
        'game-mp': '#3B82F6',
        'game-xp': '#10B981',
        'game-legendary': '#F59E0B',
        'game-epic': '#A855F7',
        'game-rare': '#3B82F6',
      },
      fontFamily: {
        display: ['Epilogue', 'Noto Sans KR', 'sans-serif'],
        manrope: ['Manrope', 'sans-serif'],
        space: ['Space Grotesk', 'sans-serif'],
      },
      boxShadow: {
        'neon-cyan': '0 0 15px rgba(0, 242, 255, 0.35), 0 0 40px rgba(0, 242, 255, 0.12)',
        'neon-purple': '0 0 15px rgba(159, 122, 234, 0.4), 0 0 40px rgba(159, 122, 234, 0.15)',
        'neon-amber': '0 0 15px rgba(255, 184, 0, 0.4),  0 0 40px rgba(255, 184, 0, 0.15)',
        'neon-green': '0 0 15px rgba(16, 185, 129, 0.4), 0 0 40px rgba(16, 185, 129, 0.15)',
        'neon-red': '0 0 15px rgba(239, 68, 68, 0.4),  0 0 40px rgba(239, 68, 68, 0.15)',
        'neon-gold': '0 0 15px rgba(255, 215, 0, 0.5),  0 0 40px rgba(255, 215, 0, 0.2)',
        card: '0 4px 24px rgba(0,0,0,0.4)',
        'card-hover': '0 8px 32px rgba(0,0,0,0.5)',
        'game-card': '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
      },
    },
  },
  plugins: [forms, containerQueries],
};
