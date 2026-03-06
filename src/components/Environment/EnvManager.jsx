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

export function EnvManager({ environment, onClose, onCreateEnvironment, onSaveVariables }) {
  const [name, setName] = useState('');
  const [rows, setRows] = useState(environment?.variables || [makeRow()]);
  const dialogRef = useRef(null);

  useEffect(() => {
    const firstInput = dialogRef.current?.querySelector('input');
    firstInput?.focus();
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
          <h2>Environment Variables</h2>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close environment manager">
            Close
          </button>
        </header>

        <div className={styles.newEnvRow}>
          <label htmlFor="new-env-name">Create environment</label>
          <input
            id="new-env-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="staging"
          />
          <button
            type="button"
            onClick={() => {
              if (!name.trim()) return;
              onCreateEnvironment(name.trim());
              setName('');
            }}
          >
            Add
          </button>
        </div>

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

        <div className={styles.footer}>
          <button type="button" onClick={() => setRows((prev) => [...prev, makeRow()])}>
            Add row
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
  );
}
