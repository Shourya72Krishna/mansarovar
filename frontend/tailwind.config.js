/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        inter: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        cosmic: {
          bg: '#050508',
          surface: '#0a0a12',
          card: '#0f0f1a',
          border: '#1a1a2e',
          hover: '#1e1e32',
        },
        gold: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        nebula: {
          purple: '#7c3aed',
          blue: '#2563eb',
          teal: '#0d9488',
          rose: '#e11d48',
        }
      },
      backgroundImage: {
        'cosmic-gradient': 'radial-gradient(ellipse at 20% 50%, rgba(124, 58, 237, 0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(37, 99, 235, 0.06) 0%, transparent 60%), radial-gradient(ellipse at 50% 80%, rgba(13, 148, 136, 0.04) 0%, transparent 60%)',
        'gold-gradient': 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
      },
      animation: {
        'twinkle': 'twinkle 3s infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
        'nebula-drift': 'nebulaDrift 20s ease-in-out infinite',
      },
      keyframes: {
        twinkle: {
          '0%, 100%': { opacity: '0.3', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.2)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(251, 191, 36, 0)' },
          '50%': { boxShadow: '0 0 20px 4px rgba(251, 191, 36, 0.15)' },
        },
        nebulaDrift: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(30px, -20px) scale(1.05)' },
          '66%': { transform: 'translate(-20px, 10px) scale(0.98)' },
        }
      }
    },
  },
  plugins: [],
}
