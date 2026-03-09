import { useEffect, useState } from 'react';

const STORAGE_KEY = 'reqpilot_history_v2';
const MAX_HISTORY = 50;

function loadHistoryMap() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // noop
  }

  try {
    const legacy = JSON.parse(window.localStorage.getItem('reqpilot_history') || '[]');
    if (Array.isArray(legacy)) {
      return { 'ws-personal': legacy };
    }
  } catch {
    // noop
  }

  return {};
}

export function useHistory(workspaceId = 'ws-personal') {
  const [historyMap, setHistoryMap] = useState(() => (typeof window === 'undefined' ? {} : loadHistoryMap()));
  const history = historyMap[workspaceId] || [];

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(historyMap));
  }, [historyMap]);

  function updateWorkspaceHistory(updater) {
    setHistoryMap((prev) => {
      const current = prev[workspaceId] || [];
      return {
        ...prev,
        [workspaceId]: updater(current),
      };
    });
  }

  const addHistory = (entry) => {
    updateWorkspaceHistory((prev) => [entry, ...prev].slice(0, MAX_HISTORY));
  };

  const clearHistory = () => updateWorkspaceHistory(() => []);

  return { history, addHistory, clearHistory };
}
