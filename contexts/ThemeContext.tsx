import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeAccent = 'blue' | 'green' | 'orange';
export type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
  accent: ThemeAccent;
  setAccent: (accent: ThemeAccent) => void;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accent, setAccent] = useState<ThemeAccent>('blue');
  const [mode, setMode] = useState<ThemeMode>('dark');

  // Initialize from localStorage
  useEffect(() => {
    const savedAccent = localStorage.getItem('voiceflow-accent') as ThemeAccent;
    const savedMode = localStorage.getItem('voiceflow-mode') as ThemeMode;
    if (savedAccent) setAccent(savedAccent);
    if (savedMode) setMode(savedMode);
  }, []);

  // Apply Accent
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-accent', accent);
    localStorage.setItem('voiceflow-accent', accent);
  }, [accent]);

  // Apply Mode
  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('voiceflow-mode', mode);
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ accent, setAccent, mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};