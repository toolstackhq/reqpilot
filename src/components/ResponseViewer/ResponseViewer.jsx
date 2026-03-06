import { useMemo, useState } from 'react';
import styles from './ResponseViewer.module.css';
import { JsonTreeView } from './JsonTreeView.jsx';
import { ResponseHeaders } from './ResponseHeaders.jsx';
import { TestResults } from './TestResults.jsx';
import { highlightJson } from '../../utils/syntaxHighlight.js';

const TABS = ['Body', 'Headers', 'Cookies', 'Test Results'];
const MAX_RENDER_SIZE = 1024 * 1024;

function statusClass(status = 0) {
  if (status >= 200 && status < 300) return styles.status2xx;
  if (status >= 300 && status < 400) return styles.status3xx;
  if (status >= 400 && status < 500) return styles.status4xx;
  return styles.status5xx;
}

function parseCookies(headers = {}) {
  const raw = headers['set-cookie'] || headers['Set-Cookie'];
  if (!raw) return [];
  return String(raw)
    .split(',')
    .map((cookie) => cookie.trim());
}

export function ResponseViewer({ response }) {
  const [tab, setTab] = useState('Body');
  const [showHtmlPreview, setShowHtmlPreview] = useState(false);
  const [showFullBody, setShowFullBody] = useState(false);

  const contentType = response?.headers?.['content-type'] || '';
  const isJson = contentType.includes('application/json');
  const isHtml = contentType.includes('text/html');

  const bodyText = response?.body || '';
  const truncated = bodyText.length > MAX_RENDER_SIZE;
  const renderedBody = !showFullBody && truncated ? bodyText.slice(0, MAX_RENDER_SIZE) : bodyText;

  const parsedJson = useMemo(() => {
    if (!isJson) return null;
    try {
      return JSON.parse(renderedBody || '{}');
    } catch {
      return null;
    }
  }, [isJson, renderedBody]);

  if (!response) {
    return <div className={styles.emptyState}>No response yet</div>;
  }

  const cookies = parseCookies(response.headers);

  return (
    <div className={styles.root}>
      <header className={styles.meta}>
        <span className={`${styles.statusBadge} ${statusClass(response.status)}`} data-testid="response-status">
          {response.status} {response.statusText}
        </span>
        <span>{response.time}ms</span>
        <span>{(response.size / 1024).toFixed(2)} KB</span>
        {response.error && <span className={styles.error}>{response.error}</span>}
        <button
          className={styles.copyButton}
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(response.body || '');
          }}
        >
          Copy body
        </button>
      </header>

      <nav className={styles.tabs} role="tablist" aria-label="Response tabs">
        {TABS.map((name) => (
          <button
            key={name}
            id={`response-tab-${name}`}
            type="button"
            role="tab"
            aria-selected={tab === name}
            aria-controls={`response-panel-${name}`}
            className={tab === name ? styles.tabActive : styles.tab}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </nav>

      <section
        role="tabpanel"
        id={`response-panel-${tab}`}
        aria-labelledby={`response-tab-${tab}`}
        className={styles.panel}
      >
        {tab === 'Body' && (
          <>
            {truncated && !showFullBody ? (
              <p className={styles.notice}>
                Large response truncated at 1MB.
                <button type="button" onClick={() => setShowFullBody(true)}>
                  Show full
                </button>
              </p>
            ) : null}

            {isJson && parsedJson ? (
              <div className={styles.jsonView}>
                <JsonTreeView value={parsedJson} />
                <pre className={styles.code} dangerouslySetInnerHTML={{ __html: highlightJson(JSON.stringify(parsedJson, null, 2)) }} />
              </div>
            ) : null}

            {isHtml ? (
              <div className={styles.htmlWrap}>
                <button type="button" onClick={() => setShowHtmlPreview((prev) => !prev)}>
                  {showHtmlPreview ? 'Raw' : 'Preview'}
                </button>
                {showHtmlPreview ? (
                  <iframe title="HTML preview" srcDoc={renderedBody} className={styles.iframe} />
                ) : (
                  <pre className={styles.code}>{renderedBody}</pre>
                )}
              </div>
            ) : null}

            {!isJson && !isHtml ? <pre className={styles.code}>{renderedBody}</pre> : null}
          </>
        )}

        {tab === 'Headers' && <ResponseHeaders headers={response.headers} />}
        {tab === 'Cookies' && (
          <ul className={styles.list}>
            {cookies.map((cookie) => (
              <li key={cookie}>{cookie}</li>
            ))}
            {!cookies.length && <li>No cookies found.</li>}
          </ul>
        )}
        {tab === 'Test Results' && <TestResults tests={response.testResults || []} />}
      </section>

      {response.logs?.length ? (
        <section className={styles.console}>
          <h3>Script Console</h3>
          <ul>
            {response.logs.map((line, index) => (
              <li key={`${line}-${index}`}>{line}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
