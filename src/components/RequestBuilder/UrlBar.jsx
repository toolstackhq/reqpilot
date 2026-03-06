import styles from './RequestBuilder.module.css';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

function methodClass(method) {
  return `method${method}`;
}

export function UrlBar({ request, onChange, onSend, isSending, elapsedMs }) {
  return (
    <div className={styles.urlBar}>
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
          <option key={method} value={method}>
            {method}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="request-url-input">
        Request URL
      </label>
      <input
        id="request-url-input"
        className={styles.urlInput}
        value={request.url}
        onChange={(event) => onChange({ type: 'url', value: event.target.value })}
        placeholder="https://api.example.com/users"
      />

      <button className={styles.sendButton} type="button" onClick={onSend} disabled={isSending}>
        {isSending ? 'Sending...' : 'Send'}
      </button>

      <div className={styles.loading} role="status" aria-live="polite">
        {isSending ? `In flight: ${elapsedMs}ms` : ''}
      </div>
    </div>
  );
}
