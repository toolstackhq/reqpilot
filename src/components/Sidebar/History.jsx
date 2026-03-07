import { useEffect, useMemo, useState } from 'react';
import styles from './Sidebar.module.css';
import { resolveVariables } from '../../utils/variableResolver.js';
import { highlightJson } from '../../utils/syntaxHighlight.js';

function methodClass(method) {
  return `method${method.toUpperCase()}`;
}

function stringify(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatTimestamp(timestamp) {
  if (!timestamp) return '--';
  const date = new Date(timestamp);
  if (Number.isNaN(date.valueOf())) return '--';
  return date.toLocaleString();
}

function toResolvedRequest(request = {}, variableValues = {}) {
  const resolved = {
    ...request,
    url: resolveVariables(request.url || '', variableValues),
    headers: (request.headers || []).map((entry) => ({
      ...entry,
      value: resolveVariables(entry.value || '', variableValues),
    })),
    params: (request.params || []).map((entry) => ({
      ...entry,
      value: resolveVariables(entry.value || '', variableValues),
    })),
    body: {
      ...(request.body || {}),
      raw: resolveVariables(request.body?.raw || '', variableValues),
      form: (request.body?.form || []).map((entry) => ({
        ...entry,
        value: resolveVariables(entry.value || '', variableValues),
      })),
    },
  };

  return resolved;
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function bodyPreview(body = '') {
  if (!body) return { isJson: false, html: '', raw: '' };
  const parsed = parseJson(body);
  if (!parsed) {
    return { isJson: false, html: '', raw: body };
  }
  const formatted = JSON.stringify(parsed, null, 2);
  return { isJson: true, html: highlightJson(formatted), raw: formatted };
}

function buildRequestCopyPayload(request = {}) {
  const enabledHeaders = (request.headers || []).filter((entry) => entry.enabled !== false && entry.key);
  const enabledParams = (request.params || []).filter((entry) => entry.enabled !== false && entry.key);
  const payload = {
    method: request.method,
    url: request.url,
    params: Object.fromEntries(enabledParams.map((entry) => [entry.key, entry.value || ''])),
    headers: Object.fromEntries(enabledHeaders.map((entry) => [entry.key, entry.value || ''])),
    auth: request.auth || { type: 'none' },
    bodyType: request.body?.type || 'none',
  };

  if (request.body?.type === 'json') {
    const parsed = parseJson(request.body?.raw || '');
    payload.body = parsed ?? (request.body?.raw || '');
  } else if (request.body?.type === 'raw') {
    payload.body = request.body?.raw || '';
  } else if (request.body?.type === 'form-data' || request.body?.type === 'x-www-form-urlencoded') {
    payload.body = (request.body?.form || [])
      .filter((entry) => entry.enabled !== false && entry.key)
      .map(({ key, value }) => ({ key, value }));
  } else {
    payload.body = '';
  }

  return payload;
}

function buildResponseCopyPayload(response = {}) {
  const payload = {
    status: response.status,
    statusText: response.statusText,
    time: response.time,
    size: response.size,
    headers: response.headers || {},
  };
  const parsed = parseJson(response.body || '');
  payload.body = parsed ?? (response.body || '');
  return payload;
}

export function History({ history, onLoad, onClear, variableValues = {} }) {
  const [selectedId, setSelectedId] = useState(history[0]?.id || null);
  const [detailTab, setDetailTab] = useState('request');
  const [copyState, setCopyState] = useState('idle');

  useEffect(() => {
    if (!history.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !history.some((entry) => entry.id === selectedId)) {
      setSelectedId(history[0].id);
    }
  }, [history, selectedId]);

  const selectedEntry = useMemo(
    () => history.find((entry) => entry.id === selectedId) || history[0] || null,
    [history, selectedId]
  );
  const selectedRequest = useMemo(
    () => toResolvedRequest(selectedEntry?.request || {}, variableValues),
    [selectedEntry, variableValues]
  );
  const requestBody = useMemo(() => {
    if (selectedRequest.body?.type === 'json') {
      return bodyPreview(selectedRequest.body.raw || '');
    }
    if (selectedRequest.body?.type === 'raw') {
      return { isJson: false, html: '', raw: selectedRequest.body.raw || '' };
    }
    return { isJson: false, html: '', raw: '' };
  }, [selectedRequest]);
  const responseBody = useMemo(() => bodyPreview(selectedEntry?.response?.body || ''), [selectedEntry]);
  const contentType = selectedEntry?.response?.headers?.['content-type'] || '';
  const enabledHeaders = useMemo(
    () => (selectedRequest.headers || []).filter((entry) => entry.enabled !== false && entry.key),
    [selectedRequest]
  );
  const enabledParams = useMemo(
    () => (selectedRequest.params || []).filter((entry) => entry.enabled !== false && entry.key),
    [selectedRequest]
  );
  const responseHeaders = useMemo(
    () => Object.entries(selectedEntry?.response?.headers || {}),
    [selectedEntry]
  );

  async function copySnapshot(type) {
    if (!selectedEntry || !navigator?.clipboard?.writeText) return;
    const payload = type === 'request'
      ? buildRequestCopyPayload(selectedRequest)
      : buildResponseCopyPayload(selectedEntry.response);

    try {
      await navigator.clipboard.writeText(stringify(payload));
      setCopyState(type);
      window.setTimeout(() => setCopyState('idle'), 1200);
    } catch {
      setCopyState('idle');
    }
  }

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <h2>History</h2>
        <button type="button" onClick={onClear}>
          Clear
        </button>
      </header>

      {!history.length && <p className={styles.empty}>No requests yet.</p>}

      {history.length ? (
        <div className={styles.historyLayout}>
          <ul className={styles.historyList}>
            {history.map((entry) => (
              <li key={entry.id}>
                <button
                  className={`${styles.row} ${entry.id === selectedEntry?.id ? styles.rowActive : ''}`}
                  type="button"
                  onClick={() => setSelectedId(entry.id)}
                >
                  <span className={`${styles.method} ${styles[methodClass(entry.request.method)]}`}>{entry.request.method}</span>
                  <span className={styles.url}>{resolveVariables(entry.request.url, variableValues)}</span>
                  <span className={styles.status}>{entry.response?.status || '--'}</span>
                </button>
              </li>
            ))}
          </ul>

          {selectedEntry ? (
            <section className={styles.historyDetails}>
              <header className={styles.historyMeta}>
                <div>
                  <div className={styles.historyTitle}>Entry Snapshot</div>
                  <div className={styles.historyTimestamp}>{formatTimestamp(selectedEntry.timestamp)}</div>
                </div>
                <div className={styles.historyMetaActions}>
                  <button type="button" onClick={() => onLoad(selectedEntry)}>
                    Load
                  </button>
                </div>
              </header>

              <nav className={styles.historyTabs} role="tablist" aria-label="History detail tabs">
                <button
                  type="button"
                  role="tab"
                  aria-selected={detailTab === 'request'}
                  className={detailTab === 'request' ? styles.historyTabActive : styles.historyTab}
                  onClick={() => setDetailTab('request')}
                >
                  Request
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={detailTab === 'response'}
                  className={detailTab === 'response' ? styles.historyTabActive : styles.historyTab}
                  onClick={() => setDetailTab('response')}
                >
                  Response
                </button>
                <button
                  type="button"
                  className={styles.historyCopy}
                  onClick={() => copySnapshot(detailTab)}
                  disabled={!selectedEntry?.[detailTab]}
                >
                  {copyState === detailTab ? 'Copied' : 'Copy'}
                </button>
              </nav>

              <div className={styles.historyBody}>
                {detailTab === 'request' ? (
                  <div className={styles.historyStack}>
                    <section className={styles.historySection}>
                      <h4>Overview</h4>
                      <div className={styles.historyKv}>
                        <span>Method</span>
                        <strong>{selectedRequest.method || '--'}</strong>
                        <span>URL</span>
                        <strong className={styles.historyUrl}>{selectedRequest.url || '--'}</strong>
                        <span>Body Type</span>
                        <strong>{selectedRequest.body?.type || 'none'}</strong>
                      </div>
                    </section>

                    <section className={styles.historySection}>
                      <h4>Query Parameters</h4>
                      {enabledParams.length ? (
                        <table className={styles.historyTable}>
                          <thead>
                            <tr>
                              <th scope="col">Key</th>
                              <th scope="col">Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {enabledParams.map((entry) => (
                              <tr key={entry.id || `${entry.key}-${entry.value}`}>
                                <td>{entry.key}</td>
                                <td>{entry.value || ''}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className={styles.historyMuted}>No query params</p>
                      )}
                    </section>

                    <section className={styles.historySection}>
                      <h4>Headers</h4>
                      {enabledHeaders.length ? (
                        <table className={styles.historyTable}>
                          <thead>
                            <tr>
                              <th scope="col">Key</th>
                              <th scope="col">Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {enabledHeaders.map((entry) => (
                              <tr key={entry.id || `${entry.key}-${entry.value}`}>
                                <td>{entry.key}</td>
                                <td>{entry.value || ''}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className={styles.historyMuted}>No headers</p>
                      )}
                    </section>

                    <section className={styles.historySection}>
                      <h4>Body</h4>
                      {selectedRequest.body?.type === 'json' && requestBody.isJson ? (
                        <pre className={styles.historyCode} dangerouslySetInnerHTML={{ __html: requestBody.html }} />
                      ) : selectedRequest.body?.type === 'raw' ? (
                        <pre className={styles.historyCode}>{requestBody.raw || '--'}</pre>
                      ) : selectedRequest.body?.type === 'form-data' || selectedRequest.body?.type === 'x-www-form-urlencoded' ? (
                        <table className={styles.historyTable}>
                          <thead>
                            <tr>
                              <th scope="col">Key</th>
                              <th scope="col">Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(selectedRequest.body?.form || [])
                              .filter((entry) => entry.enabled !== false && entry.key)
                              .map((entry) => (
                                <tr key={entry.id || `${entry.key}-${entry.value}`}>
                                  <td>{entry.key}</td>
                                  <td>{entry.value || ''}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className={styles.historyMuted}>No body</p>
                      )}
                    </section>
                  </div>
                ) : (
                  <div className={styles.historyStack}>
                    <section className={styles.historySection}>
                      <h4>Overview</h4>
                      <div className={styles.historyKv}>
                        <span>Status</span>
                        <strong>{selectedEntry.response?.status || '--'} {selectedEntry.response?.statusText || ''}</strong>
                        <span>Time</span>
                        <strong>{selectedEntry.response?.time ?? '--'} ms</strong>
                        <span>Size</span>
                        <strong>
                          {typeof selectedEntry.response?.size === 'number'
                            ? `${(selectedEntry.response.size / 1024).toFixed(2)} KB`
                            : '--'}
                        </strong>
                        <span>Content-Type</span>
                        <strong>{contentType || '--'}</strong>
                      </div>
                    </section>

                    <section className={styles.historySection}>
                      <h4>Headers</h4>
                      {responseHeaders.length ? (
                        <table className={styles.historyTable}>
                          <thead>
                            <tr>
                              <th scope="col">Header</th>
                              <th scope="col">Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {responseHeaders.map(([key, value]) => (
                              <tr key={key}>
                                <td>{key}</td>
                                <td>{String(value)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className={styles.historyMuted}>No headers</p>
                      )}
                    </section>

                    <section className={styles.historySection}>
                      <h4>Body</h4>
                      {responseBody.isJson ? (
                        <pre className={styles.historyCode} dangerouslySetInnerHTML={{ __html: responseBody.html }} />
                      ) : (
                        <pre className={styles.historyCode}>{responseBody.raw || '--'}</pre>
                      )}
                    </section>
                  </div>
                )}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
