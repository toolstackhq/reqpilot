import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './CreateCollectionModal.module.css';

export function CreateCollectionModal({ onClose, onSubmit }) {
  const [name, setName] = useState('New Collection');
  const dialogRef = useRef(null);

  useEffect(() => {
    const firstInput = dialogRef.current?.querySelector('input, button');
    firstInput?.focus();

    function onKeydown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    }

    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, [onClose]);

  const canCreate = useMemo(() => Boolean(name.trim()), [name]);

  function submit(event) {
    event.preventDefault();
    if (!canCreate) return;
    onSubmit(name.trim());
  }

  return (
    <div className={styles.overlay}>
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-label="Create Collection" ref={dialogRef}>
        <header className={styles.header}>
          <h2>Create Collection</h2>
          <button type="button" onClick={onClose} aria-label="Close create collection dialog">
            Close
          </button>
        </header>

        <form className={styles.form} onSubmit={submit}>
          <label htmlFor="create-collection-name">Collection name</label>
          <input
            id="create-collection-name"
            data-testid="create-collection-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Collection name"
          />

          <footer className={styles.footer}>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" data-testid="create-collection-confirm" disabled={!canCreate}>
              Create
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
