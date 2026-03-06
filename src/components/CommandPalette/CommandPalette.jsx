import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './CommandPalette.module.css';

export function CommandPalette({ actions, onClose }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);

  const filtered = useMemo(
    () => actions.filter((action) => action.label.toLowerCase().includes(query.toLowerCase())),
    [actions, query]
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKeydown(event) {
      if (event.key === 'Escape') {
        onClose();
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelected((prev) => Math.min(prev + 1, filtered.length - 1));
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelected((prev) => Math.max(prev - 1, 0));
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        const action = filtered[selected];
        if (action) {
          action.run();
          onClose();
        }
      }
    }

    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, [filtered, onClose, selected]);

  return (
    <div className={styles.overlay}>
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-label="Command palette">
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(0);
          }}
          placeholder="Type a command"
          aria-label="Search command"
        />
        <ul className={styles.list} role="listbox" aria-label="Command results">
          {filtered.map((action, index) => (
            <li key={action.id}>
              <button
                className={index === selected ? styles.active : styles.item}
                type="button"
                onClick={() => {
                  action.run();
                  onClose();
                }}
              >
                {action.label}
              </button>
            </li>
          ))}
          {!filtered.length && <li className={styles.empty}>No actions found</li>}
        </ul>
      </section>
    </div>
  );
}
