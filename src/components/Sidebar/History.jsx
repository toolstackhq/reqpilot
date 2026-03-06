import styles from './Sidebar.module.css';

function methodClass(method) {
  return `method${method.toUpperCase()}`;
}

export function History({ history, onLoad, onClear }) {
  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <h2>History</h2>
        <button type="button" onClick={onClear}>
          Clear
        </button>
      </header>

      {!history.length && <p className={styles.empty}>No requests yet.</p>}

      <ul className={styles.list}>
        {history.map((entry) => (
          <li key={entry.id}>
            <button className={styles.row} type="button" onClick={() => onLoad(entry)}>
              <span className={`${styles.method} ${styles[methodClass(entry.request.method)]}`}>{entry.request.method}</span>
              <span className={styles.url}>{entry.request.url}</span>
              <span className={styles.status}>{entry.response?.status || '--'}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
