import styles from './RequestBuilder.module.css';

const AUTH_TYPES = ['none', 'bearer', 'basic', 'apikey'];

export function AuthEditor({ auth, onChange }) {
  return (
    <div className={styles.authEditor}>
      <label htmlFor="auth-type">Auth type</label>
      <select
        id="auth-type"
        value={auth.type}
        onChange={(event) => onChange({ ...auth, type: event.target.value })}
        aria-haspopup="listbox"
      >
        {AUTH_TYPES.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>

      {auth.type === 'bearer' && (
        <label>
          Token
          <input value={auth.token || ''} onChange={(event) => onChange({ ...auth, token: event.target.value })} />
        </label>
      )}

      {auth.type === 'basic' && (
        <>
          <label>
            Username
            <input
              value={auth.username || ''}
              onChange={(event) => onChange({ ...auth, username: event.target.value })}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={auth.password || ''}
              onChange={(event) => onChange({ ...auth, password: event.target.value })}
            />
          </label>
        </>
      )}

      {auth.type === 'apikey' && (
        <>
          <label>
            Key
            <input value={auth.key || ''} onChange={(event) => onChange({ ...auth, key: event.target.value })} />
          </label>
          <label>
            Value
            <input value={auth.value || ''} onChange={(event) => onChange({ ...auth, value: event.target.value })} />
          </label>
          <label>
            Add to
            <select value={auth.addTo || 'header'} onChange={(event) => onChange({ ...auth, addTo: event.target.value })}>
              <option value="header">Header</option>
              <option value="query">Query</option>
            </select>
          </label>
        </>
      )}
    </div>
  );
}
