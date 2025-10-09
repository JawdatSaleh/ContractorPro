module.exports = {
  content: ["./pages/*.{html,js}", "./index.html", "./js/*.js"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#EFF6FF", // blue-50
          100: "#DBEAFE", // blue-100
          500: "#3B82F6", // blue-500
          600: "#2563EB", // blue-600 - Professional authority and system reliability
          700: "#1D4ED8", // blue-700
          900: "#1E3A8A", // blue-900
          DEFAULT: "#2563EB", // blue-600
        },
        secondary: {
          100: "#F1F5F9", // slate-100
          200: "#E2E8F0", // slate-200
          300: "#CBD5E1", // slate-300
          400: "#94A3B8", // slate-400
          500: "#64748B", // slate-500 - Construction steel sophistication and calm navigation
          600: "#475569", // slate-600
          700: "#334155", // slate-700
          800: "#1E293B", // slate-800
          DEFAULT: "#64748B", // slate-500
        },
        accent: {
          100: "#FEF3C7", // amber-100
          200: "#FDE68A", // amber-200
          500: "#F59E0B", // amber-500 - Safety orange for urgent actions and warnings
          600: "#D97706", // amber-600
          DEFAULT: "#F59E0B", // amber-500
        },
        background: "#F8FAFC", // slate-50 - Clean workspace foundation for dense information
        surface: "#FFFFFF", // white - Content cards and form backgrounds for clarity
        text: {
          primary: "#1E293B", // slate-800 - High contrast Arabic text for extended reading
          secondary: "#64748B", // slate-500 - Hierarchy and supporting information without strain
        },
        success: {
          100: "#D1FAE5", // emerald-100
          500: "#10B981", // emerald-500 - Project completion and positive financial indicators
          600: "#059669", // emerald-600
          DEFAULT: "#10B981", // emerald-500
        },
        warning: {
          100: "#FEF3C7", // amber-100
          500: "#F59E0B", // amber-500 - Attention without panic for deadlines and reviews
          DEFAULT: "#F59E0B", // amber-500
        },
        error: {
          100: "#FEE2E2", // red-100
          500: "#EF4444", // red-500 - Clear problem identification with helpful urgency
          600: "#DC2626", // red-600
          DEFAULT: "#EF4444", // red-500
        },
        border: {
          DEFAULT: "#E2E8F0", // slate-200
          focus: "#2563EB", // blue-600
        },
      },
      fontFamily: {
        arabic: ['Noto Sans Arabic', 'sans-serif'],
        'arabic-kufi': ['Noto Kufi Arabic', 'sans-serif'],
        sans: ['Noto Sans Arabic', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.1)',
        'modal': '0 4px 6px rgba(0, 0, 0, 0.1)',
        'critical': '0 10px 25px rgba(0, 0, 0, 0.15)',
      },
      transitionDuration: {
        'fast': '200ms',
        'normal': '300ms',
        'slow': '400ms',
      },
      transitionTimingFunction: {
        'standard': 'ease-out',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
      },
      animation: {
        'fade-in': 'fadeIn 300ms ease-out',
        'slide-up': 'slideUp 400ms ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
      },
    },
  },
  plugins: [],
}