import { useEffect, useMemo, useState } from 'react';
import styles from './RequestBuilder.module.css';
import { KeyValueEditor } from './KeyValueEditor.jsx';

const BODY_TYPES = ['none', 'json', 'form-data', 'x-www-form-urlencoded', 'raw'];

function toLineNumbers(text) {
  const lines = (text || '').split('\n').length;
  return Array.from({ length: Math.max(lines, 1) }, (_, index) => index + 1).join('\n');
}

export function BodyEditor({ body, onChange }) {
  const [error, setError] = useState('');

  const lineNumbers = useMemo(() => toLineNumbers(body.raw || ''), [body.raw]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (body.type === 'json' && body.raw?.trim()) {
        try {
          JSON.parse(body.raw);
          setError('');
        } catch (jsonError) {
          setError(jsonError.message);
        }
      } else {
        setError('');
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [body.raw, body.type]);

  return (
    <div className={styles.bodyEditor}>
      <label htmlFor="body-type">Body type</label>
      <select
        id="body-type"
        value={body.type}
        onChange={(event) => onChange({ ...body, type: event.target.value })}
        aria-haspopup="listbox"
      >
        {BODY_TYPES.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>

      {(body.type === 'json' || body.type === 'raw') && (
        <div className={styles.editorWrap}>
          <pre className={styles.lineNumbers} aria-hidden="true">
            {lineNumbers}
          </pre>
          <textarea
            className={error ? styles.textareaError : styles.textarea}
            value={body.raw || ''}
            onChange={(event) => onChange({ ...body, raw: event.target.value })}
            placeholder={body.type === 'json' ? '{\n  "key": "value"\n}' : 'Raw body'}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'body-json-error' : undefined}
          />
        </div>
      )}

      {(body.type === 'form-data' || body.type === 'x-www-form-urlencoded') && (
        <KeyValueEditor label="Body" rows={body.form || []} onChange={(rows) => onChange({ ...body, form: rows })} />
      )}

      {error && (
        <p id="body-json-error" className={styles.error} role="status" aria-live="polite">
          Invalid JSON: {error}
        </p>
      )}
    </div>
  );
}
