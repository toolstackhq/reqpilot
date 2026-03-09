import { useMemo } from 'react';
import { KeyValueEditor } from './KeyValueEditor.jsx';
import styles from './RequestBuilder.module.css';
import { getDefaultHeadersPreview } from '../../utils/httpClient.js';

const HEADER_SUGGESTIONS = [
  'Content-Type',
  'Authorization',
  'Accept',
  'Cache-Control',
  'User-Agent',
  'X-API-Key',
  'Accept-Language',
  'X-Request-Id',
];

export function HeadersEditor({ request, rows, onChange }) {
  const defaultHeaders = useMemo(
    () => getDefaultHeadersPreview({ ...request, headers: rows }),
    [request, rows]
  );

  return (
    <div className={styles.headersPane}>
      <section className={styles.defaultHeadersPanel} aria-label="Default headers">
        <div className={styles.defaultHeadersTitle}>Default Headers (Auto-generated)</div>
        {defaultHeaders.length ? (
          <ul className={styles.defaultHeadersList}>
            {defaultHeaders.map((header) => (
              <li key={`${header.key}-${header.value}`} className={styles.defaultHeadersItem}>
                <span className={styles.defaultHeaderKey}>{header.key}</span>
                <span className={styles.defaultHeaderValue}>{header.value}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.defaultHeadersEmpty}>No auto headers for this request.</p>
        )}
      </section>

      <KeyValueEditor label="Header List" mode="headers" rows={rows} onChange={onChange} keySuggestions={HEADER_SUGGESTIONS} />
    </div>
  );
}
