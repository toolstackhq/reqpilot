import { useEffect, useRef, useState } from 'react';
import styles from './SecurityModal.module.css';

export function SecurityModal({
  settings,
  onClose,
  onChangeDefaultVerification,
  onAddHostRule,
  onUpdateHostRule,
  onRemoveHostRule,
}) {
  const [pattern, setPattern] = useState('');
  const [verifySsl, setVerifySsl] = useState(true);
  const dialogRef = useRef(null);

  useEffect(() => {
    const firstInput = dialogRef.current?.querySelector('input, button, select');
    firstInput?.focus();
  }, []);

  useEffect(() => {
    function onKeydown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    }

    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, [onClose]);

  function addRule() {
    if (!pattern.trim()) return;
    onAddHostRule(pattern.trim(), verifySsl);
    setPattern('');
    setVerifySsl(true);
  }

  return (
    <div className={styles.overlay}>
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-label="SSL and security settings" ref={dialogRef}>
        <header className={styles.header}>
          <h2>SSL & Security</h2>
          <button type="button" onClick={onClose} aria-label="Close SSL settings">
            Close
          </button>
        </header>

        <div className={styles.content}>
          <section className={styles.group}>
            <h3>General</h3>
            <label className={styles.toggleRow}>
              <input
                type="checkbox"
                checked={settings?.verifySslByDefault !== false}
                onChange={(event) => onChangeDefaultVerification(event.target.checked)}
              />
              <span>SSL certificate verification</span>
              <small>Applies to all hosts unless overridden.</small>
            </label>
          </section>

          <section className={styles.group}>
            <h3>Host Rules</h3>
            <p className={styles.subtle}>Add exact hosts (`api.example.com`) or wildcards (`*.example.com`).</p>

            <div className={styles.createRow}>
              <input
                value={pattern}
                onChange={(event) => setPattern(event.target.value)}
                placeholder="api.example.com"
                aria-label="Host pattern"
              />
              <select
                value={verifySsl ? 'verify' : 'skip'}
                onChange={(event) => setVerifySsl(event.target.value === 'verify')}
                aria-label="Host SSL mode"
              >
                <option value="verify">Verify SSL</option>
                <option value="skip">Disable verification</option>
              </select>
              <button type="button" onClick={addRule}>
                Add
              </button>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Enabled</th>
                    <th scope="col">Host</th>
                    <th scope="col">SSL</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(settings?.hostRules || []).map((rule) => (
                    <tr key={rule.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={rule.enabled !== false}
                          onChange={(event) => onUpdateHostRule(rule.id, { enabled: event.target.checked })}
                          aria-label={`Enable ${rule.pattern}`}
                        />
                      </td>
                      <td>
                        <input
                          value={rule.pattern}
                          onChange={(event) => onUpdateHostRule(rule.id, { pattern: event.target.value })}
                          aria-label="Host rule"
                        />
                      </td>
                      <td>
                        <select
                          value={rule.verifySsl === false ? 'skip' : 'verify'}
                          onChange={(event) => onUpdateHostRule(rule.id, { verifySsl: event.target.value === 'verify' })}
                          aria-label={`SSL mode for ${rule.pattern}`}
                        >
                          <option value="verify">Verify</option>
                          <option value="skip">Skip</option>
                        </select>
                      </td>
                      <td>
                        <button type="button" onClick={() => onRemoveHostRule(rule.id)} aria-label={`Remove ${rule.pattern}`}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <footer className={styles.footer}>
          <button type="button" onClick={onClose}>
            Done
          </button>
        </footer>
      </section>
    </div>
  );
}

