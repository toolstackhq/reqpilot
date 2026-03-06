import { useRef } from 'react';
import styles from './Sidebar.module.css';

export function Collections({ collections, onCreate, onLoad, onSaveCurrent, onExport, onImportFile }) {
  const inputRef = useRef(null);

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <h2>Collections</h2>
        <div className={styles.actions}>
          <button
            type="button"
            onClick={() => {
              const name = window.prompt('Collection name', 'New Collection');
              if (name) {
                onCreate(name);
              }
            }}
          >
            New
          </button>
          <button type="button" onClick={onSaveCurrent}>
            Save Request
          </button>
          <button type="button" onClick={onExport}>
            Export
          </button>
          <button type="button" onClick={() => inputRef.current?.click()}>
            Import
          </button>
          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            accept="application/json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                onImportFile(file);
              }
            }}
          />
        </div>
      </header>

      {!collections.length && <p className={styles.empty}>Create a collection to save reusable requests.</p>}

      <ul className={styles.tree}>
        {collections.map((collection) => (
          <li key={collection.id}>
            <h3>{collection.name}</h3>
            <ul className={styles.list}>
              {(collection.requests || []).map((request) => (
                <li key={request.id}>
                  <button className={styles.row} type="button" onClick={() => onLoad(request)}>
                    <span className={styles.method}>{request.method}</span>
                    <span className={styles.url}>{request.name || request.url}</span>
                  </button>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
