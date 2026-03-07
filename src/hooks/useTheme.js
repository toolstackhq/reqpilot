import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'reqpilot_theme';

function detectDefaultTheme() {
  if (typeof window === 'undefined') return 'theme-light';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'theme-dark' || stored === 'theme-light') return stored;
  return 'theme-light';
}

export function useTheme() {
  const [theme, setTheme] = useState(detectDefaultTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-dark', 'theme-light');
    root.classList.add(theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useMemo(
    () => () => setTheme((prev) => (prev === 'theme-dark' ? 'theme-light' : 'theme-dark')),
    []
  );

  return { theme, setTheme, toggleTheme };
}
