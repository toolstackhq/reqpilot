import { useMemo, useState } from 'react';
import styles from './ResponseViewer.module.css';
import { ResponseHeaders } from './ResponseHeaders.jsx';
import { TestResults } from './TestResults.jsx';
import { highlightJson } from '../../utils/syntaxHighlight.js';

const TABS = ['JSON', 'Raw', 'Headers', 'Test Results'];
const MAX_RENDER_SIZE = 1024 * 1024;

function statusClass(status = 0) {
  if (status >= 200 && status < 300) return styles.status2xx;
  if (status >= 300 && status < 400) return styles.status3xx;
  if (status >= 400 && status < 500) return styles.status4xx;
  return styles.status5xx;
}

export function ResponseViewer({ response }) {
  const [tab, setTab] = useState('JSON');
  const [showHtmlPreview, setShowHtmlPreview] = useState(false);
  const [showFullBody, setShowFullBody] = useState(false);
  const [copyState, setCopyState] = useState('idle');

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
  const visibleLogs = useMemo(
    () => (response?.logs || []).map((line) => String(line || '').trim()).filter(Boolean),
    [response?.logs]
  );

  if (!response) {
    return <div className={styles.emptyState}>No response yet</div>;
  }
  const headerCount = Object.keys(response.headers || {}).length;
  const canShowJson = Boolean(isJson && parsedJson);

  function copyResponseBody() {
    if (!navigator?.clipboard?.writeText) return;
    if (!bodyText) return;

    let textToCopy = bodyText;
    if (tab === 'JSON' && isJson) {
      try {
        textToCopy = JSON.stringify(JSON.parse(bodyText), null, 2);
      } catch {
        textToCopy = bodyText;
      }
    }

    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        setCopyState('copied');
        window.setTimeout(() => setCopyState('idle'), 1200);
      })
      .catch(() => setCopyState('idle'));
  }

  return (
    <div className={styles.root}>
      <header className={styles.meta}>
        <span className={`${styles.metaItem} ${styles.statusText} ${statusClass(response.status)}`} data-testid="response-status">
          <span className={styles.metaLabel}>Status:</span> {response.status} • {response.statusText || 'OK'}
        </span>
        <span className={styles.metaItem}>
          <span className={styles.metaLabel}>Time:</span> {response.time} ms
        </span>
        <span className={styles.metaItem}>
          <span className={styles.metaLabel}>Size:</span> {(response.size / 1024).toFixed(2)} KB
        </span>
        {response.error && <span className={styles.error}>{response.error}</span>}
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
            <span>{name}</span>
            {name === 'Headers' ? <span className={styles.tabCount}>{headerCount}</span> : null}
          </button>
        ))}
      </nav>

      <section
        role="tabpanel"
        id={`response-panel-${tab}`}
        aria-labelledby={`response-tab-${tab}`}
        className={styles.panel}
      >
        {(tab === 'JSON' || tab === 'Raw') && (
          <div className={styles.panelToolbar}>
            <button type="button" className={styles.copyButton} onClick={copyResponseBody} disabled={!bodyText}>
              {copyState === 'copied' ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}

        {tab === 'JSON' && (
          <>
            {truncated && !showFullBody ? (
              <p className={styles.notice}>
                Large response truncated at 1MB.
                <button type="button" onClick={() => setShowFullBody(true)}>
                  Show full
                </button>
              </p>
            ) : null}

            {canShowJson ? (
              <pre
                className={styles.code}
                dangerouslySetInnerHTML={{ __html: highlightJson(JSON.stringify(parsedJson, null, 2)) }}
              />
            ) : (
              <div className={styles.htmlWrap}>
                {isHtml ? (
                  <>
                    <button type="button" onClick={() => setShowHtmlPreview((prev) => !prev)}>
                      {showHtmlPreview ? 'Raw' : 'Preview'}
                    </button>
                    {showHtmlPreview ? (
                      <iframe title="HTML preview" srcDoc={renderedBody} className={styles.iframe} />
                    ) : (
                      <pre className={styles.code}>{renderedBody}</pre>
                    )}
                  </>
                ) : (
                  <pre className={styles.code}>{renderedBody}</pre>
                )}
              </div>
            )}
          </>
        )}

        {tab === 'Raw' && <pre className={styles.code}>{renderedBody}</pre>}
        {tab === 'Headers' && <ResponseHeaders headers={response.headers} />}
        {tab === 'Test Results' && <TestResults tests={response.testResults || []} />}
      </section>

      {visibleLogs.length ? (
        <section className={styles.console}>
          <h3>Script Console</h3>
          <ul>
            {visibleLogs.map((line, index) => (
              <li key={`${line}-${index}`}>{line}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
