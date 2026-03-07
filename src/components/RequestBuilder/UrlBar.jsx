import styles from './RequestBuilder.module.css';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const METHOD_COLORS = {
  GET: 'var(--method-get)',
  POST: 'var(--method-post)',
  PUT: 'var(--method-put)',
  PATCH: 'var(--method-patch)',
  DELETE: 'var(--method-delete)',
  HEAD: 'var(--method-head)',
  OPTIONS: 'var(--method-options)',
};

function methodClass(method) {
  return `method${method}`;
}

export function UrlBar({ request, onChange, onSend, onSave, isSending, elapsedMs }) {
  return (
    <div className={styles.urlBar}>
      <div className={styles.urlCombo}>
        <div className={styles.methodField}>
          <label className="sr-only" htmlFor="request-method">
            Request method
          </label>
          <select
            id="request-method"
            value={request.method}
            onChange={(event) => onChange({ type: 'method', value: event.target.value })}
            className={`${styles.methodSelect} ${styles[methodClass(request.method)]}`}
          >
            {METHODS.map((method) => (
              <option key={method} value={method} style={{ color: METHOD_COLORS[method], fontWeight: 600 }}>
                {method}
              </option>
            ))}
          </select>
          <span className={styles.methodCaret} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="1em" height="1em">
              <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m6 9l6 6l6-6" />
            </svg>
          </span>
        </div>

        <div className={styles.urlField}>
          <label className="sr-only" htmlFor="request-url-input">
            Request URL
          </label>
          <input
            id="request-url-input"
            className={styles.urlInput}
            value={request.url}
            onChange={(event) => onChange({ type: 'url', value: event.target.value })}
            placeholder="Enter a URL or paste a cURL command"
          />
        </div>
      </div>

      <div className={styles.sendGroup}>
        <button className={styles.sendButton} type="button" onClick={onSend} disabled={isSending}>
          <span>{isSending ? 'Sending...' : 'Send'}</span>
        </button>
        <button className={styles.sendButtonCaret} type="button" aria-label="Action menu">
          <svg viewBox="0 0 24 24" width="1em" height="1em">
            <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m6 9l6 6l6-6" />
          </svg>
        </button>
      </div>

      <div className={styles.saveGroup}>
        <button className={styles.saveButton} type="button" onClick={onSave}>
          <span className={styles.saveIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
              <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7M7 3v4a1 1 0 0 0 1 1h7" />
            </svg>
          </span>
          <span>Save</span>
        </button>
        <button className={styles.saveButtonCaret} type="button" aria-label="Collection menu">
          <svg viewBox="0 0 24 24" width="1em" height="1em">
            <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m6 9l6 6l6-6" />
          </svg>
        </button>
      </div>

      <div className={styles.loading} role="status" aria-live="polite">
        {isSending ? `In flight: ${elapsedMs}ms` : ''}
      </div>
    </div>
  );
}
