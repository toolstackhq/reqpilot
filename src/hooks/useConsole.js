import { useEffect, useState } from 'react';

const STORAGE_KEY = 'reqpilot_console_v2';
const MAX_ENTRIES = 300;

function loadConsoleMap() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // noop
  }

  try {
    const legacy = JSON.parse(window.localStorage.getItem('reqpilot_console') || '[]');
    if (Array.isArray(legacy)) {
      return { 'ws-personal': legacy };
    }
  } catch {
    // noop
  }

  return {};
}

export function useConsole(workspaceId = 'ws-personal') {
  const [entryMap, setEntryMap] = useState(() => (typeof window === 'undefined' ? {} : loadConsoleMap()));
  const entries = entryMap[workspaceId] || [];

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entryMap));
  }, [entryMap]);

  function updateWorkspaceEntries(updater) {
    setEntryMap((prev) => {
      const current = prev[workspaceId] || [];
      return {
        ...prev,
        [workspaceId]: updater(current),
      };
    });
  }

  function addEntry(entry) {
    updateWorkspaceEntries((prev) => [entry, ...prev].slice(0, MAX_ENTRIES));
  }

  function clearEntries() {
    updateWorkspaceEntries(() => []);
  }

  return {
    consoleEntries: entries,
    addConsoleEntry: addEntry,
    clearConsoleEntries: clearEntries,
  };
}
