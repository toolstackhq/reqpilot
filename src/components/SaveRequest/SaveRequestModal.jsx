import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './SaveRequestModal.module.css';

function defaultRequestName(request) {
  const fallback = `${request?.method || 'GET'} ${request?.url || ''}`.trim();
  return (request?.name || fallback || 'Untitled Request').trim();
}

export function SaveRequestModal({ request, collections = [], onClose, onSubmit }) {
  const [mode, setMode] = useState(collections.length ? 'existing' : 'new');
  const [selectedCollectionId, setSelectedCollectionId] = useState(collections[0]?.id || '');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [requestName, setRequestName] = useState(defaultRequestName(request));

  const dialogRef = useRef(null);

  useEffect(() => {
    const firstInput = dialogRef.current?.querySelector('input, select, button');
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

  const canSave = useMemo(() => {
    if (!requestName.trim()) return false;
    if (mode === 'existing') return Boolean(selectedCollectionId);
    return Boolean(newCollectionName.trim());
  }, [mode, newCollectionName, requestName, selectedCollectionId]);

  function submit(event) {
    event.preventDefault();
    if (!canSave) return;
    onSubmit({
      mode,
      requestName: requestName.trim(),
      collectionId: selectedCollectionId,
      collectionName: newCollectionName.trim(),
    });
  }

  return (
    <div className={styles.overlay}>
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-label="Save Request" ref={dialogRef}>
        <header className={styles.header}>
          <h2>Save Request</h2>
          <button type="button" onClick={onClose} aria-label="Close save request dialog">
            Close
          </button>
        </header>

        <form className={styles.form} onSubmit={submit}>
          <label htmlFor="save-request-name">Request name</label>
          <input
            id="save-request-name"
            data-testid="save-request-name"
            value={requestName}
            onChange={(event) => setRequestName(event.target.value)}
            placeholder="Request name"
          />

          <fieldset className={styles.modeGroup}>
            <legend>Collection</legend>

            <label className={styles.modeOption}>
              <input
                type="radio"
                name="save-mode"
                value="existing"
                checked={mode === 'existing'}
                onChange={() => setMode('existing')}
                disabled={!collections.length}
              />
              Save to existing collection
            </label>

            <select
              data-testid="save-existing-collection"
              value={selectedCollectionId}
              onChange={(event) => setSelectedCollectionId(event.target.value)}
              disabled={mode !== 'existing' || !collections.length}
            >
              {collections.length ? (
                collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))
              ) : (
                <option value="">No collections available</option>
              )}
            </select>

            <label className={styles.modeOption}>
              <input type="radio" name="save-mode" value="new" checked={mode === 'new'} onChange={() => setMode('new')} />
              Create new collection
            </label>

            <input
              data-testid="save-new-collection"
              value={newCollectionName}
              onChange={(event) => setNewCollectionName(event.target.value)}
              placeholder="New collection name"
              disabled={mode !== 'new'}
            />
          </fieldset>

          <footer className={styles.footer}>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" data-testid="save-request-confirm" disabled={!canSave}>
              Save
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
