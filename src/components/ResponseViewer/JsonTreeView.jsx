import { useState } from 'react';
import styles from './ResponseViewer.module.css';

function Node({ name, value, depth = 0 }) {
  const isObject = value && typeof value === 'object';
  const [open, setOpen] = useState(depth < 1);

  if (!isObject) {
    return (
      <div className={styles.node}>
        <span className={styles.nodeKey}>{name}:</span>
        <span className={styles.nodeValue}>{JSON.stringify(value)}</span>
      </div>
    );
  }

  const entries = Array.isArray(value) ? value.map((entry, index) => [index, entry]) : Object.entries(value);

  return (
    <div className={styles.node}>
      <button className={styles.collapse} type="button" onClick={() => setOpen((prev) => !prev)}>
        {open ? '▾' : '▸'} {name} <span className={styles.count}>({entries.length})</span>
      </button>
      {open && (
        <div className={styles.children}>
          {entries.map(([key, child]) => (
            <Node key={String(key)} name={String(key)} value={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function JsonTreeView({ value }) {
  return (
    <div className={styles.tree}>
      <Node name="root" value={value} />
    </div>
  );
}
