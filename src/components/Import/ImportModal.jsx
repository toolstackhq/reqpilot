import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './ImportModal.module.css';
import { detectImportFormat } from './importDetector.js';
import { importPostmanCollection } from './importPostman.js';
import { importOpenApiDocument } from './importOpenAPI.js';

function flattenRequests(collection) {
  return (collection?.requests || []).map((request) => ({
    id: request.id,
    label: `${request.method} ${request.name || request.url}`,
    request,
  }));
}

export function ImportModal({ onClose, onImport, initialFocusRef }) {
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState(null);
  const [warning, setWarning] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());

  const dialogRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const firstInput = dialogRef.current?.querySelector('input');
    firstInput?.focus();

    function onKeydown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }

      if (event.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll('button, input, select');
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener('keydown', onKeydown);
    return () => {
      window.removeEventListener('keydown', onKeydown);
      initialFocusRef?.current?.focus();
    };
  }, [initialFocusRef, onClose]);

  const requests = useMemo(() => flattenRequests(preview?.collection), [preview]);

  function onFile(content, name) {
    setWarning('');
    setFileName(name);
    const detected = detectImportFormat(content);

    if (detected.error || detected.type === 'unknown') {
      setPreview(null);
      setWarning(detected.error || 'Unsupported file format');
      return;
    }

    if (detected.type === 'postman-v2.0' || detected.type === 'postman-v2.1' || detected.type === 'postman-environment') {
      const parsed = importPostmanCollection(detected.parsed);
      setPreview(parsed);
      setSelectedIds(new Set(parsed.collection?.requests?.map((request) => request.id) || []));
      setWarning(parsed.warnings?.join(', ') || '');
      return;
    }

    if (detected.type.startsWith('swagger') || detected.type.startsWith('openapi')) {
      const parsed = importOpenApiDocument(detected.parsed);
      setPreview(parsed);
      setSelectedIds(new Set(parsed.collection?.requests?.map((request) => request.id) || []));
      setWarning(parsed.warnings?.join(', ') || '');
      return;
    }
  }

  function handleFile(file) {
    const reader = new FileReader();
    reader.onload = () => onFile(String(reader.result || ''), file.name);
    reader.readAsText(file);
  }

  function toggleSelection(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function submitImport() {
    if (!preview) return;

    if (preview.collection) {
      const selectedRequests = preview.collection.requests.filter((request) => selectedIds.has(request.id));
      onImport({
        ...preview,
        collection: {
          ...preview.collection,
          requests: selectedRequests,
        },
      });
      return;
    }

    onImport(preview);
  }

  return (
    <div className={styles.overlay}>
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-label="Import" ref={dialogRef}>
        <header className={styles.header}>
          <h2>Import</h2>
          <button type="button" onClick={onClose} aria-label="Close import dialog">
            Close
          </button>
        </header>

        <div className={styles.dropZone}>
          <p>Drag and drop a Postman/OpenAPI file or pick from disk.</p>
          <button type="button" onClick={() => inputRef.current?.click()}>
            Choose file
          </button>
          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            accept=".json,.yaml,.yml"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>

        {fileName ? <p className={styles.meta}>File: {fileName}</p> : null}
        {warning ? <p className={styles.warning}>{warning}</p> : null}

        {preview?.collection ? (
          <section className={styles.preview}>
            <p>
              Found {preview.collection.requests.length} requests in {new Set(preview.collection.requests.map((request) => request.folders?.[0] || 'root')).size} folders
            </p>
            <ul>
              {requests.map((entry) => (
                <li key={entry.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(entry.id)}
                      onChange={() => toggleSelection(entry.id)}
                    />
                    {entry.label}
                  </label>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {preview?.environment ? (
          <section className={styles.preview}>
            <p>
              Environment: {preview.environment.name} ({preview.environment.variables.length} variables)
            </p>
          </section>
        ) : null}

        <footer className={styles.footer}>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" data-testid="import-confirm" onClick={submitImport} disabled={!preview}>
            Import
          </button>
        </footer>
      </section>
    </div>
  );
}
