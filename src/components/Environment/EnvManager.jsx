import { useEffect, useRef, useState } from 'react';
import styles from './EnvManager.module.css';

function makeRow() {
  return {
    id: `env-row-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    key: '',
    value: '',
    enabled: true,
  };
}

export function EnvManager({
  environment,
  environments = [],
  activeId,
  onSelectEnvironment,
  onClose,
  onCreateEnvironment,
  onSaveVariables,
}) {
  const [name, setName] = useState('');
  const [showCreateEnvironment, setShowCreateEnvironment] = useState(false);
  const [rows, setRows] = useState(environment?.variables || [makeRow()]);
  const dialogRef = useRef(null);

  useEffect(() => {
    const firstButton = dialogRef.current?.querySelector('button');
    firstButton?.focus();
  }, []);

  useEffect(() => {
    setRows(environment?.variables?.length ? environment.variables : [makeRow()]);
  }, [environment]);

  function updateRow(index, field, value) {
    setRows((prev) => prev.map((row, idx) => (idx === index ? { ...row, [field]: value } : row)));
  }

  return (
    <div className={styles.overlay}>
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-label="Environment manager" ref={dialogRef}>
        <header className={styles.header}>
          <h2>Environments</h2>
          <button type="button" className={styles.headerButton} onClick={onClose} aria-label="Close environment manager">
            Close
          </button>
        </header>

        <div className={styles.layout}>
          <aside className={styles.envSidebar}>
            <div className={styles.sidebarTitle}>Workspace</div>
            <div className={styles.envTabs} role="tablist" aria-label="Environment tabs">
              {environments.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  role="tab"
                  aria-selected={entry.id === activeId}
                  className={entry.id === activeId ? styles.envTabActive : styles.envTab}
                  onClick={() => onSelectEnvironment(entry.id)}
                >
                  {entry.name}
                </button>
              ))}
            </div>

            <div className={styles.createRow}>
              <button
                className={styles.subtleButton}
                type="button"
                onClick={() => setShowCreateEnvironment((prev) => !prev)}
                aria-expanded={showCreateEnvironment}
                aria-controls="create-environment-panel"
              >
                {showCreateEnvironment ? 'Cancel' : '+ New environment'}
              </button>
            </div>

            {showCreateEnvironment ? (
              <div id="create-environment-panel" className={styles.newEnvRow}>
                <input
                  id="new-env-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="staging"
                  aria-label="New environment name"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!name.trim()) return;
                    onCreateEnvironment(name.trim());
                    setName('');
                    setShowCreateEnvironment(false);
                  }}
                >
                  Add
                </button>
              </div>
            ) : null}
          </aside>

          <section className={styles.editorPane}>
            <div className={styles.editorHeader}>
              <h3>{environment?.name || 'Environment'}</h3>
              <button type="button" onClick={() => setRows((prev) => [...prev, makeRow()])}>
                Add row
              </button>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Enabled</th>
                    <th scope="col">Key</th>
                    <th scope="col">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.id || index}>
                      <td>
                        <input
                          type="checkbox"
                          checked={row.enabled !== false}
                          onChange={(event) => updateRow(index, 'enabled', event.target.checked)}
                          aria-label="Enable variable"
                        />
                      </td>
                      <td>
                        <input
                          value={row.key}
                          onChange={(event) => updateRow(index, 'key', event.target.value)}
                          aria-label="Variable key"
                        />
                      </td>
                      <td>
                        <input
                          value={row.value}
                          onChange={(event) => updateRow(index, 'value', event.target.value)}
                          aria-label="Variable value"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.footer}>
              <button type="button" onClick={onClose}>
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  onSaveVariables(rows.filter((row) => row.key));
                  onClose();
                }}
              >
                Save
              </button>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
