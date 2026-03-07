import { useEffect, useState } from 'react';
import styles from './RequestBuilder.module.css';
import { UrlBar } from './UrlBar.jsx';
import { ParamsEditor } from './ParamsEditor.jsx';
import { HeadersEditor } from './HeadersEditor.jsx';
import { BodyEditor } from './BodyEditor.jsx';
import { AuthEditor } from './AuthEditor.jsx';
import { parseParamsFromUrl, applyParamsToUrl } from '../../utils/urlSync.js';

const TABS = ['Parameters', 'Body', 'Headers', 'Authorization', 'Pre-request Script', 'Post-request Script'];

const SNIPPETS = {
  'Environment: Set an environment variable': "rp.env.set('key', 'value');",
  'Environment: Set timestamp variable': "rp.env.set('timestamp', Date.now());",
  'Environment: Set random number variable': "rp.env.set('random', Math.floor(Math.random() * 1000));",
  'Status code is 200': 'rp.test("status is 200", () => {\n  rp.expect(rp.response.status).toBe(200);\n});',
  'Status code is 2xx': 'rp.test("status is 2xx", () => {\n  rp.expect(rp.response.status).toBeGreaterThanOrEqual(200);\n  rp.expect(rp.response.status).toBeLessThan(300);\n});',
  'Response time < 500ms': 'rp.test("response time < 500ms", () => {\n  rp.expect(rp.response.time).toBeLessThan(500);\n});',
  'Body contains property': 'rp.test("body has property", () => {\n  const body = rp.response.json();\n  rp.expect(body).toHaveProperty("id");\n});',
};

function methodKey(method) {
  return method.toLowerCase();
}

function toRows(value = []) {
  if (value.length) return value;
  return [{ id: `row-${Date.now()}`, key: '', value: '', enabled: true }];
}

function paramsFromUrlRows(url) {
  const parsed = parseParamsFromUrl(url);
  return parsed.length ? parsed : toRows([]);
}

function isFilledRow(row = {}) {
  return Boolean((row.key || '').trim() || (row.value || '').trim() || (row.description || '').trim());
}

function ScriptPanel({ id, title, value, onChange, placeholder, intro, docLabel, snippetNames, onAppendSnippet }) {
  const lineNumbers = Array.from({ length: Math.max(1, value.split('\n').length) }, (_, index) => index + 1).join('\n');

  return (
    <div className={styles.scriptSplit}>
      <section className={styles.scriptMain}>
        <header className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>JavaScript Code</h3>
          <div className={styles.sectionActions}>
            <button className={styles.iconButton} type="button" aria-label={`${title} help`}>
              <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <path d="M12 17h.01" />
              </svg>
            </button>
            <button className={styles.iconButton} type="button" aria-label={`Clear ${title}`} onClick={() => onChange('')}>
              <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </button>
          </div>
        </header>

        <div className={styles.editorWrap}>
          <pre className={styles.lineNumbers} aria-hidden="true">
            {lineNumbers}
          </pre>
          <textarea
            id={id}
            className={styles.scriptTextarea}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
          />
        </div>
      </section>

      <aside className={styles.scriptAside}>
        <p className={styles.scriptHelp}>{intro}</p>
        <a className={styles.docLink} href="#" onClick={(event) => event.preventDefault()}>
          {docLabel}
        </a>

        <h4 className={styles.snippetTitle}>Snippets</h4>
        <div className={styles.snippetList}>
          {snippetNames.map((name) => (
            <button key={name} className={styles.snippetButton} type="button" onClick={() => onAppendSnippet(name)}>
              {name}
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}

export function RequestBuilder({ request, onRequestChange, onSend, onSave, isSending, elapsedMs, variableValues = {} }) {
  const [tab, setTab] = useState('Parameters');

  useEffect(() => {
    function onKeydown(event) {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        onSend();
      }
    }

    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, [onSend]);

  function setParams(params) {
    const nextUrl = applyParamsToUrl(request.url, params);
    onRequestChange({ ...request, params, url: nextUrl });
  }

  function onUrlBarChange(event) {
    if (event.type === 'method') {
      onRequestChange({ ...request, method: event.value });
      return;
    }

    if (event.type === 'url') {
      onRequestChange({
        ...request,
        url: event.value,
        params: paramsFromUrlRows(event.value),
      });
    }
  }

  function updateScripts(field, value) {
    onRequestChange({
      ...request,
      scripts: {
        ...request.scripts,
        [field]: value,
      },
    });
  }

  const headerCount = (request.headers || []).filter(isFilledRow).length;

  const preScriptSnippets = [
    'Environment: Set an environment variable',
    'Environment: Set timestamp variable',
    'Environment: Set random number variable',
  ];

  const postScriptSnippets = ['Status code is 200', 'Status code is 2xx', 'Response time < 500ms', 'Body contains property'];

  return (
    <div className={styles.root}>
      <UrlBar
        request={request}
        onChange={onUrlBarChange}
        onSend={onSend}
        onSave={onSave}
        isSending={isSending}
        elapsedMs={elapsedMs}
        variableValues={variableValues}
      />

      <nav className={styles.tabs} role="tablist" aria-label="Request tabs">
        <div className={styles.tabsPrimary}>
          {TABS.map((name) => (
            <button
              key={name}
              id={`request-tab-${name}`}
              type="button"
              role="tab"
              aria-selected={tab === name}
              aria-controls={`request-panel-${name}`}
              className={tab === name ? styles.tabActive : styles.tab}
              onClick={() => setTab(name)}
            >
              <span>{name}</span>
              {name === 'Headers' && headerCount > 0 ? <span className={styles.tabBadge}>{headerCount}</span> : null}
            </button>
          ))}
        </div>
        <div className={styles.tabsSecondary}>
          <button className={styles.variablesTab} type="button" aria-label="Variables">
            Variables
          </button>
        </div>
      </nav>

      <section
        role="tabpanel"
        id={`request-panel-${tab}`}
        aria-labelledby={`request-tab-${tab}`}
        className={styles.panel}
      >
        {tab === 'Parameters' && <ParamsEditor rows={toRows(request.params)} onChange={setParams} />}
        {tab === 'Headers' && (
          <HeadersEditor
            rows={toRows(request.headers)}
            onChange={(headers) => onRequestChange({ ...request, headers })}
          />
        )}
        {tab === 'Body' && (
          <BodyEditor body={request.body} onChange={(body) => onRequestChange({ ...request, body })} method={methodKey(request.method)} />
        )}
        {tab === 'Authorization' && <AuthEditor auth={request.auth} onChange={(auth) => onRequestChange({ ...request, auth })} />}
        {tab === 'Pre-request Script' && (
          <ScriptPanel
            id="pre-script"
            title="Pre-request script"
            value={request.scripts.preRequest || ''}
            onChange={(value) => updateScripts('preRequest', value)}
            placeholder="rp.request.headers.set('X-Time', Date.now())"
            intro="Pre-request scripts are written in JavaScript, and are run before the request is sent."
            docLabel="Read documentation"
            snippetNames={preScriptSnippets}
            onAppendSnippet={(name) => updateScripts('preRequest', `${request.scripts.preRequest || ''}\n${SNIPPETS[name]}`.trim())}
          />
        )}
        {tab === 'Post-request Script' && (
          <ScriptPanel
            id="post-script"
            title="Post-request script"
            value={request.scripts.postRequest || ''}
            onChange={(value) => updateScripts('postRequest', value)}
            placeholder="rp.env.set('token', rp.response.json().token)"
            intro="Post-request scripts are written in JavaScript, and are run after the response is received."
            docLabel="Read documentation"
            snippetNames={postScriptSnippets}
            onAppendSnippet={(name) => updateScripts('postRequest', `${request.scripts.postRequest || ''}\n${SNIPPETS[name]}`.trim())}
          />
        )}
      </section>
    </div>
  );
}
