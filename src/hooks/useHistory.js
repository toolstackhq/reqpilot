import { useEffect, useState } from 'react';

const STORAGE_KEY = 'reqpilot_history';
const MAX_HISTORY = 50;

function loadHistory() {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function useHistory() {
  const [history, setHistory] = useState(() => (typeof window === 'undefined' ? [] : loadHistory()));

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const addHistory = (entry) => {
    setHistory((prev) => [entry, ...prev].slice(0, MAX_HISTORY));
  };

  const clearHistory = () => setHistory([]);

  return { history, addHistory, clearHistory };
}
