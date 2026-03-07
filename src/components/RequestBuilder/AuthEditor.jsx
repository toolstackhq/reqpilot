import styles from './RequestBuilder.module.css';

const AUTH_TYPES = ['none', 'bearer', 'basic', 'apikey'];

export function AuthEditor({ auth, onChange }) {
  const authEnabled = auth.enabled !== false;

  return (
    <div className={styles.authEditor}>
      <header className={styles.sectionHeader}>
        <div className={styles.authTypeGroup}>
          <h3 className={styles.sectionTitle}>Authorization Type</h3>
          <select
            id="auth-type"
            className={styles.inlineSelect}
            value={auth.type}
            onChange={(event) => onChange({ ...auth, type: event.target.value })}
            aria-haspopup="listbox"
          >
            {AUTH_TYPES.map((type) => (
              <option key={type} value={type}>
                {type === 'none' ? 'Inherit' : type}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.sectionActions}>
          <label className={styles.authEnabled}>
            <input
              type="checkbox"
              checked={authEnabled}
              onChange={(event) => onChange({ ...auth, enabled: event.target.checked })}
              aria-label="Enabled"
            />
            Enabled
          </label>
          <button className={styles.iconButton} type="button" aria-label="Authorization help">
            <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <path d="M12 17h.01" />
            </svg>
          </button>
          <button className={styles.iconButton} type="button" aria-label="Clear authorization" onClick={() => onChange({ ...auth, type: 'none' })}>
            <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
          </button>
        </div>
      </header>

      <div className={styles.authSplit}>
        <section className={styles.authMain}>
          {!authEnabled || auth.type === 'none' ? (
            <p className={styles.authHint}>Please save this request in any collection to inherit the authorization</p>
          ) : null}

          {authEnabled && auth.type === 'bearer' ? (
            <label className={styles.authField}>
              Token
              <input value={auth.token || ''} onChange={(event) => onChange({ ...auth, token: event.target.value })} />
            </label>
          ) : null}

          {authEnabled && auth.type === 'basic' ? (
            <div className={styles.authFormGrid}>
              <label className={styles.authField}>
                Username
                <input
                  value={auth.username || ''}
                  onChange={(event) => onChange({ ...auth, username: event.target.value })}
                />
              </label>
              <label className={styles.authField}>
                Password
                <input
                  type="password"
                  value={auth.password || ''}
                  onChange={(event) => onChange({ ...auth, password: event.target.value })}
                />
              </label>
            </div>
          ) : null}

          {authEnabled && auth.type === 'apikey' ? (
            <div className={styles.authFormGrid}>
              <label className={styles.authField}>
                Key
                <input value={auth.key || ''} onChange={(event) => onChange({ ...auth, key: event.target.value })} />
              </label>
              <label className={styles.authField}>
                Value
                <input value={auth.value || ''} onChange={(event) => onChange({ ...auth, value: event.target.value })} />
              </label>
              <label className={styles.authField}>
                Add to
                <select value={auth.addTo || 'header'} onChange={(event) => onChange({ ...auth, addTo: event.target.value })}>
                  <option value="header">Header</option>
                  <option value="query">Query</option>
                </select>
              </label>
            </div>
          ) : null}
        </section>

        <aside className={styles.authAside}>
          <p>The authorization header will be automatically generated when you send the request.</p>
          <a href="#" onClick={(event) => event.preventDefault()}>
            Learn how ↗
          </a>
        </aside>
      </div>
    </div>
  );
}
