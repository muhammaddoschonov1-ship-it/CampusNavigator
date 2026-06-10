import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const darkColors = {
  // Backgrounds
  background: '#0A0E1A',
  surface: '#141929',
  surfaceLight: '#1C2137',
  surfaceHighlight: '#242A3F',

  // Primary gradient
  primary: '#6C63FF',
  primaryLight: '#8B83FF',
  primaryDark: '#5046E4',

  // Accent
  accent: '#00D4AA',
  accentLight: '#33DDBB',
  accentDark: '#00B893',

  // Status colors
  success: '#00D4AA',
  warning: '#FFB347',
  error: '#FF6B6B',
  info: '#63B3ED',

  // Text
  textPrimary: '#EAEAFF',
  textSecondary: '#7B8098',
  textMuted: '#4A4F6A',

  // Borders
  border: '#1E2338',
  borderLight: '#2A3050',

  // Gradients
  gradientPrimary: ['#6C63FF', '#8B83FF'],
  gradientAccent: ['#00D4AA', '#00B893'],
  gradientPurpleTeal: ['#6C63FF', '#00D4AA'],
  gradientDark: ['#0A0E1A', '#141929'],
  gradientCard: ['rgba(28, 33, 55, 0.8)', 'rgba(20, 25, 41, 0.9)'],

  // Shadows
  shadowPrimary: '#6C63FF40',
  shadowAccent: '#00D4AA30',

  // Category colors
  categoryColors: {
    auditoriya: '#6C63FF',
    kutubxona: '#00D4AA',
    oshxona: '#FFB347',
    ofis: '#63B3ED',
    sport: '#FF6B6B',
    laboratoriya: '#E879F9',
    tibbiyot: '#F87171',
  },

  // Category icons
  categoryIcons: {
    auditoriya: 'school',
    kutubxona: 'local-library',
    oshxona: 'restaurant',
    ofis: 'business',
    sport: 'fitness-center',
    laboratoriya: 'computer',
    tibbiyot: 'local-hospital',
  },
};

export const lightColors = {
  // Backgrounds
  background: '#F5F7FB',
  surface: '#FFFFFF',
  surfaceLight: '#F0F2F8',
  surfaceHighlight: '#E8EAF2',

  // Primary gradient
  primary: '#5046E4',
  primaryLight: '#6C63FF',
  primaryDark: '#3D35C4',

  // Accent
  accent: '#00B893',
  accentLight: '#00D4AA',
  accentDark: '#009E7E',

  // Status colors
  success: '#00B893',
  warning: '#E89B30',
  error: '#E85555',
  info: '#4A9FDB',

  // Text
  textPrimary: '#1A1D2E',
  textSecondary: '#5A5F7A',
  textMuted: '#9298B0',

  // Borders
  border: '#E2E5EF',
  borderLight: '#D0D4E2',

  // Gradients
  gradientPrimary: ['#5046E4', '#6C63FF'],
  gradientAccent: ['#00B893', '#00D4AA'],
  gradientPurpleTeal: ['#5046E4', '#00B893'],
  gradientDark: ['#F5F7FB', '#EBEEF5'],
  gradientCard: ['rgba(255, 255, 255, 0.9)', 'rgba(240, 242, 248, 0.95)'],

  // Shadows
  shadowPrimary: '#5046E440',
  shadowAccent: '#00B89330',

  // Category colors
  categoryColors: {
    auditoriya: '#5046E4',
    kutubxona: '#00B893',
    oshxona: '#E89B30',
    ofis: '#4A9FDB',
    sport: '#E85555',
    laboratoriya: '#C76BEC',
    tibbiyot: '#E85555',
  },

  // Category icons
  categoryIcons: {
    auditoriya: 'school',
    kutubxona: 'local-library',
    oshxona: 'restaurant',
    ofis: 'business',
    sport: 'fitness-center',
    laboratoriya: 'computer',
    tibbiyot: 'local-hospital',
  },
};

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem('@app_theme');
        if (storedTheme !== null) {
          setIsDark(storedTheme === 'dark');
        }
      } catch (e) {}
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    try {
      const target = !isDark;
      setIsDark(target);
      await AsyncStorage.setItem('@app_theme', target ? 'dark' : 'light');
    } catch (e) {}
  };

  const theme = useMemo(
    () => ({
      isDark,
      colors: isDark ? darkColors : lightColors,
      toggleTheme,
    }),
    [isDark]
  );

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
