import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('solarx_theme');
    if (saved !== null) return saved === 'dark';
    return false; // Default to crisp, bright, high-readability Light Mode with 1-click Dark toggle
  });

  useEffect(() => {
    localStorage.setItem('solarx_theme', isDark ? 'dark' : 'light');
    document.body.style.backgroundColor = isDark ? '#070b14' : '#f4f7fb';
    document.body.style.color = isDark ? '#f8fafc' : '#0f172a';
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  const theme = {
    isDark,
    toggleTheme,
    colors: {
      bgPage: isDark ? '#070b14' : '#f4f7fb',
      bgCard: isDark ? '#0f172a' : '#ffffff',
      bgSubtle: isDark ? '#162033' : '#f8fafc',
      bgElevated: isDark ? '#1e293b' : '#f1f5f9',
      bgInput: isDark ? '#0b1120' : '#ffffff',
      border: isDark ? '#1e293b' : '#e2e8f0',
      borderSubtle: isDark ? 'rgba(255,255,255,0.07)' : '#edf2f7',
      textPrimary: isDark ? '#f8fafc' : '#0f172a',
      textSecondary: isDark ? '#94a3b8' : '#475569',
      textMuted: isDark ? '#64748b' : '#64748b',
      shadowCard: isDark
        ? '0 10px 32px rgba(0, 0, 0, 0.45)'
        : '0 6px 24px rgba(15, 23, 42, 0.05)',

      // Semantic Brand Colors
      amber: '#f59e0b',
      orange: '#ea580c',
      sky: '#0284c7',
      skyBright: '#0ea5e9',
      indigo: '#4f46e5',
      emerald: '#10b981',
      rose: '#e11d48',

      // Radiant Gradients
      gradSolar: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
      gradSky: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
      gradEmerald: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      gradIndigo: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
      gradHero: isDark
        ? 'linear-gradient(135deg, #0f172a 0%, #172554 55%, #1e1b4b 100%)'
        : 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #0369a1 100%)',
    },
  };

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
