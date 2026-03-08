import { useEffect, useState } from 'react';

const STORAGE_KEY = 'reqpilot_console';
const MAX_ENTRIES = 300;

function loadConsoleEntries() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useConsole() {
  const [entries, setEntries] = useState(() => (typeof window === 'undefined' ? [] : loadConsoleEntries()));

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  function addEntry(entry) {
    setEntries((prev) => [entry, ...prev].slice(0, MAX_ENTRIES));
  }

  function clearEntries() {
    setEntries([]);
  }

  return {
    consoleEntries: entries,
    addConsoleEntry: addEntry,
    clearConsoleEntries: clearEntries,
  };
}
