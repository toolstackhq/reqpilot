import { useEffect, useMemo, useState } from 'react';
import styles from './Sidebar.module.css';

function formatTimestamp(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return '--';
  return date.toLocaleString();
}

function levelClass(level = '') {
  const normalized = String(level).toLowerCase();
  if (normalized === 'error') return styles.consoleLevelError;
  if (normalized === 'warn') return styles.consoleLevelWarn;
  if (normalized === 'debug') return styles.consoleLevelDebug;
  if (normalized === 'info') return styles.consoleLevelInfo;
  return styles.consoleLevelLog;
}

function fallbackLogEntries(entry = {}) {
  if (entry.logEntries?.length) {
    return entry.logEntries
      .map((line) => ({
        ...line,
        message: String(line?.message || '').trim(),
      }))
      .filter((line) => line.message);
  }
  if (entry.logs?.length) {
    return entry.logs.map((line) => ({
      level: 'log',
      phase: 'script',
      message: String(line || '').trim(),
      timestamp: entry.timestamp,
    })).filter((line) => line.message);
  }
  return [];
}

export function Console({ entries = [], onClear }) {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(entries[0]?.id || null);
  const [copyState, setCopyState] = useState('idle');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return entries.filter((entry) => {
      const logs = fallbackLogEntries(entry);
      const levelOk = levelFilter === 'all' || logs.some((item) => item.level === levelFilter);
      if (!levelOk) return false;
      if (!term) return true;

      const haystack = [
        entry.request?.method,
        entry.request?.url,
        entry.response?.status,
        logs.map((item) => item.message).join('\n'),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [entries, search, levelFilter]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.some((entry) => entry.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selectedEntry = useMemo(
    () => filtered.find((entry) => entry.id === selectedId) || filtered[0] || null,
    [filtered, selectedId]
  );

  const selectedLogs = useMemo(() => fallbackLogEntries(selectedEntry), [selectedEntry]);

  async function copySelected() {
    if (!selectedEntry || !navigator?.clipboard?.writeText) return;
    const payload = {
      timestamp: selectedEntry.timestamp,
      request: selectedEntry.request,
      response: selectedEntry.response,
      logs: selectedLogs,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 1200);
    } catch {
      setCopyState('idle');
    }
  }

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <h2>Console</h2>
        <div className={styles.actions}>
          <button type="button" onClick={onClear}>
            Clear
          </button>
        </div>
      </header>

      <div className={styles.searchWrap}>
        <div className={styles.consoleSearchRow}>
          <input
            className={styles.searchInput}
            type="search"
            placeholder="Search URL, method, status, logs"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search console logs"
          />
          <select
            className={styles.consoleFilter}
            value={levelFilter}
            onChange={(event) => setLevelFilter(event.target.value)}
            aria-label="Filter by log level"
          >
            <option value="all">All Levels</option>
            <option value="error">Error</option>
            <option value="warn">Warn</option>
            <option value="info">Info</option>
            <option value="log">Log</option>
            <option value="debug">Debug</option>
          </select>
        </div>
      </div>

      {!filtered.length ? (
        <p className={styles.empty}>No console entries yet.</p>
      ) : (
        <div className={styles.consoleLayout}>
          <ul className={styles.consoleList}>
            {filtered.map((entry) => {
              const logs = fallbackLogEntries(entry);
              return (
                <li key={entry.id}>
                  <button
                    className={`${styles.row} ${entry.id === selectedEntry?.id ? styles.rowActive : ''}`}
                    type="button"
                    onClick={() => setSelectedId(entry.id)}
                  >
                    <span className={`${styles.method} ${styles[`method${String(entry.request?.method || 'GET').toUpperCase()}`]}`}>
                      {entry.request?.method || '--'}
                    </span>
                    <span className={styles.url}>{entry.request?.url || '--'}</span>
                    <span className={styles.status}>{entry.response?.status || '--'} · {logs.length}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <section className={styles.consoleDetails}>
            {selectedEntry ? (
              <>
                <header className={styles.historyMeta}>
                  <div>
                    <div className={styles.historyTitle}>Request Console</div>
                    <div className={styles.historyTimestamp}>{formatTimestamp(selectedEntry.timestamp)}</div>
                  </div>
                  <div className={styles.historyMetaActions}>
                    <button type="button" onClick={copySelected}>
                      {copyState === 'copied' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </header>

                <div className={styles.consoleMeta}>
                  <span>
                    <strong>{selectedEntry.request?.method || '--'}</strong> {selectedEntry.request?.url || '--'}
                  </span>
                  <span>
                    Status: <strong>{selectedEntry.response?.status || '--'}</strong>
                  </span>
                  <span>
                    Time: <strong>{selectedEntry.response?.time || '--'} ms</strong>
                  </span>
                </div>

                <ul className={styles.consoleEntries}>
                  {selectedLogs.length ? (
                    selectedLogs.map((line, index) => (
                      <li key={`${line.timestamp || index}-${line.message}`} className={styles.consoleEntry}>
                        <span className={`${styles.consoleLevel} ${levelClass(line.level)}`}>{String(line.level || 'log').toUpperCase()}</span>
                        <span className={styles.consolePhase}>{line.phase || 'script'}</span>
                        <span className={styles.consoleTime}>{formatTimestamp(line.timestamp)}</span>
                        <pre className={styles.consoleMessage}>{line.message}</pre>
                      </li>
                    ))
                  ) : (
                    <li className={styles.consoleEntryEmpty}>No script log lines for this request.</li>
                  )}
                </ul>
              </>
            ) : (
              <p className={styles.empty}>Select a console entry to inspect details.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
