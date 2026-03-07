import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './RequestBuilder.module.css';
import { KeyValueEditor } from './KeyValueEditor.jsx';
import { highlightJson } from '../../utils/syntaxHighlight.js';

const BODY_TYPES = ['none', 'json', 'form-data', 'x-www-form-urlencoded', 'raw'];

function toLineNumbers(text) {
  const lines = (text || '').split('\n').length;
  return Array.from({ length: Math.max(lines, 1) }, (_, index) => index + 1).join('\n');
}

export function BodyEditor({ body, onChange }) {
  const [error, setError] = useState('');
  const [copyState, setCopyState] = useState('idle');
  const jsonHighlightRef = useRef(null);

  const lineNumbers = useMemo(() => toLineNumbers(body.raw || ''), [body.raw]);
  const isEmptyBody = body.type === 'none';
  const canPrettify = body.type === 'json' && Boolean(body.raw?.trim());
  const highlightedJson = useMemo(() => highlightJson(body.raw || ''), [body.raw]);

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

  function prettifyJson() {
    if (!canPrettify) return;

    try {
      const parsed = JSON.parse(body.raw);
      onChange({ ...body, raw: JSON.stringify(parsed, null, 2) });
      setError('');
    } catch (jsonError) {
      setError(jsonError.message);
    }
  }

  function syncJsonHighlightScroll(event) {
    if (!jsonHighlightRef.current) return;
    jsonHighlightRef.current.scrollTop = event.target.scrollTop;
    jsonHighlightRef.current.scrollLeft = event.target.scrollLeft;
  }

  async function copyBodyText() {
    const text = body.raw || '';
    if (!text) return;
    if (!navigator?.clipboard?.writeText) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 1200);
    } catch {
      setCopyState('idle');
    }
  }

  return (
    <div className={styles.bodyEditor}>
      <header className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Content Type</h3>
        <div className={styles.bodyControls}>
          <select
            id="body-type"
            className={styles.inlineSelect}
            value={body.type}
            onChange={(event) => onChange({ ...body, type: event.target.value })}
            aria-haspopup="listbox"
          >
            {BODY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type === 'none' ? 'None' : type}
              </option>
            ))}
          </select>
          <button
            className={styles.overrideButton}
            type="button"
            onClick={prettifyJson}
            disabled={!canPrettify}
            aria-label="Prettify JSON body"
          >
            Prettify
          </button>
          <button
            className={styles.overrideButton}
            type="button"
            onClick={copyBodyText}
            disabled={!(body.type === 'json' || body.type === 'raw') || !body.raw?.length}
            aria-label="Copy request body"
          >
            {copyState === 'copied' ? 'Copied' : 'Copy'}
          </button>
        </div>
      </header>

      <div className={styles.bodyContent}>
        {isEmptyBody ? (
          <div className={styles.bodyEmpty}>
            <div className={styles.bodyEmptyIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" width="1.35em" height="1.35em" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 3h7v7" />
                <path d="M10 14 21 3" />
                <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
              </svg>
            </div>
            <p>This request does not have a body</p>
            <button className={styles.docButton} type="button">
              Documentation
            </button>
          </div>
        ) : null}

        {body.type === 'json' && !isEmptyBody && (
          <div className={styles.editorWrap}>
            <pre className={styles.lineNumbers} aria-hidden="true">
              {lineNumbers}
            </pre>
            <div className={`${styles.codeInputWrap} ${error ? styles.codeInputWrapError : ''}`}>
              {body.raw?.length ? (
                <pre
                  className={styles.jsonHighlight}
                  ref={jsonHighlightRef}
                  aria-hidden="true"
                  dangerouslySetInnerHTML={{ __html: highlightedJson }}
                />
              ) : (
                <pre className={`${styles.jsonHighlight} ${styles.jsonPlaceholder}`} ref={jsonHighlightRef} aria-hidden="true">
                  {'{\n  "key": "value"\n}'}
                </pre>
              )}
              <textarea
                className={styles.textareaSyntax}
                value={body.raw || ''}
                onChange={(event) => onChange({ ...body, raw: event.target.value })}
                placeholder=""
                onScroll={syncJsonHighlightScroll}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'body-json-error' : undefined}
              />
            </div>
          </div>
        )}

        {body.type === 'raw' && !isEmptyBody && (
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

        {(body.type === 'form-data' || body.type === 'x-www-form-urlencoded') && !isEmptyBody && (
          <KeyValueEditor
            label="Body Fields"
            mode="body"
            rows={body.form || []}
            onChange={(rows) => onChange({ ...body, form: rows })}
          />
        )}

        {error && (
          <p id="body-json-error" className={styles.error} role="status" aria-live="polite">
            Invalid JSON: {error}
          </p>
        )}
      </div>
    </div>
  );
}
