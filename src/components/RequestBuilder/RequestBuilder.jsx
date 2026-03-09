import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './RequestBuilder.module.css';
import { UrlBar } from './UrlBar.jsx';
import { ParamsEditor } from './ParamsEditor.jsx';
import { HeadersEditor } from './HeadersEditor.jsx';
import { BodyEditor } from './BodyEditor.jsx';
import { AuthEditor } from './AuthEditor.jsx';
import { parseParamsFromUrl, applyParamsToUrl } from '../../utils/urlSync.js';
import { highlightJavaScript, formatJavaScript } from '../../utils/syntaxHighlight.js';

const TABS = ['Parameters', 'Body', 'Headers', 'Authorization', 'Settings', 'Pre-request Script', 'Post-request Script'];

const SNIPPETS = {
  'Environment: Set an environment variable': "rp.env.set('key', 'value');",
  'Environment: Set timestamp variable': "rp.env.set('timestamp', Date.now());",
  'Environment: Set random number variable': "rp.env.set('random', Math.floor(Math.random() * 1000));",
  'Utility: Generate UUID variable':
    "const uuid = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;\nrp.env.set('uuid', uuid);",
  'Utility: Generate random email variable':
    "const seed = Math.random().toString(36).slice(2, 10);\nrp.env.set('random_email', `user_${seed}@example.com`);",
  'Utility: Generate random string variable':
    "const randomString = (length = 12) => {\n  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';\n  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');\n};\nrp.env.set('random_string', randomString(12));",
  'Request: Inject correlation ID header':
    "const correlationId = rp.env.get('uuid') || globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;\nrp.request.headers.set('X-Correlation-ID', correlationId);\nrp.env.set('uuid', correlationId);",
  'Request: Build random user JSON body':
    "const suffix = Math.random().toString(36).slice(2, 8);\nconst payload = {\n  name: `user_${suffix}`,\n  email: `user_${suffix}@example.com`\n};\nrp.request.body = JSON.stringify(payload, null, 2);",
  'Status code is 200': 'rp.test("status is 200", () => {\n  rp.expect(rp.response.status).toBe(200);\n});',
  'Status code is 2xx': 'rp.test("status is 2xx", () => {\n  rp.expect(rp.response.status).toBeGreaterThanOrEqual(200);\n  rp.expect(rp.response.status).toBeLessThan(300);\n});',
  'Response time < 500ms': 'rp.test("response time < 500ms", () => {\n  rp.expect(rp.response.time).toBeLessThan(500);\n});',
  'Body contains property': 'rp.test("body has property", () => {\n  const body = rp.response.json();\n  rp.expect(body).toHaveProperty("id");\n});',
  'Body array: every item has email':
    'rp.test("every item has email", () => {\n  const body = rp.response.json();\n  rp.expect(Array.isArray(body)).toBe(true);\n  rp.expect(body.every((item) => typeof item.email === "string" && item.email.length > 0)).toBe(true);\n});',
  'Response header exists':
    'rp.test("content-type header exists", () => {\n  const contentType = rp.response.headers.get("content-type");\n  rp.expect(Boolean(contentType)).toBe(true);\n});',
  'Environment: Save token from response':
    'const body = rp.response.json();\nif (body?.token) {\n  rp.env.set("token", body.token);\n}\nrp.test("token present in response", () => {\n  rp.expect(Boolean(body?.token)).toBe(true);\n});',
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

function ScriptPanel({ id, title, value, onChange, placeholder, intro, docLabel, docUrl, snippetNames, onAppendSnippet }) {
  const scriptHighlightRef = useRef(null);
  const lineNumbers = useMemo(
    () => Array.from({ length: Math.max(1, value.split('\n').length) }, (_, index) => index + 1).join('\n'),
    [value]
  );
  const highlightedScript = useMemo(() => highlightJavaScript(value || ''), [value]);

  function syncScriptHighlightScroll(event) {
    if (!scriptHighlightRef.current) return;
    scriptHighlightRef.current.scrollTop = event.target.scrollTop;
    scriptHighlightRef.current.scrollLeft = event.target.scrollLeft;
  }

  function formatScript() {
    const formatted = formatJavaScript(value || '');
    if (formatted === value) return;
    onChange(formatted);
  }

  function openDocs() {
    if (!docUrl) return;
    window.open(docUrl, '_blank', 'noopener,noreferrer');
  }

  function clearScript() {
    if (!value?.trim()) return;
    const confirmed = window.confirm(`Clear ${title}?`);
    if (!confirmed) return;
    onChange('');
  }

  return (
    <div className={styles.scriptSplit}>
      <section className={styles.scriptMain}>
        <header className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>JavaScript Code</h3>
          <div className={styles.sectionActions}>
            <button className={styles.formatButton} type="button" aria-label={`Format ${title}`} onClick={formatScript}>
              Format
            </button>
            <button className={styles.iconButton} type="button" aria-label={`${title} help`} onClick={openDocs}>
              <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <path d="M12 17h.01" />
              </svg>
            </button>
            <button
              className={styles.iconButton}
              type="button"
              aria-label={`Clear ${title}`}
              onClick={clearScript}
              disabled={!value?.trim()}
            >
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
          <div className={styles.codeInputWrap}>
            {value?.length ? (
              <pre
                className={styles.scriptHighlight}
                ref={scriptHighlightRef}
                aria-hidden="true"
                dangerouslySetInnerHTML={{ __html: highlightedScript }}
              />
            ) : (
              <pre className={`${styles.scriptHighlight} ${styles.jsonPlaceholder}`} ref={scriptHighlightRef} aria-hidden="true">
                {placeholder}
              </pre>
            )}
            <textarea
              id={id}
              className={styles.scriptTextareaSyntax}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder={placeholder}
              onScroll={syncScriptHighlightScroll}
              spellCheck={false}
            />
          </div>
        </div>
      </section>

      <aside className={styles.scriptAside}>
        <p className={styles.scriptHelp}>{intro}</p>
        <a className={styles.docLink} href={docUrl || '#'} target="_blank" rel="noopener noreferrer" onClick={(event) => {
          if (!docUrl) event.preventDefault();
        }}>
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

function RequestSettingsPanel({ request, onChange }) {
  const sslMode = request.security?.sslVerification || 'inherit';
  const security = request.security || {};
  const [textEditMode, setTextEditMode] = useState({
    ca: false,
    cert: false,
    key: false,
  });

  function updateSecurity(patch) {
    onChange({
      ...request,
      security: {
        ...security,
        ...patch,
      },
    });
  }

  function setSslMode(value) {
    updateSecurity({ sslVerification: value });
  }

  async function onUploadPem(field, file) {
    if (!file) return;
    const text = await file.text();
    updateSecurity({ [field]: text });
    setTextEditMode((prev) => ({ ...prev, [field]: false }));
  }

  function toggleTextEditor(field) {
    setTextEditMode((prev) => ({ ...prev, [field]: !prev[field] }));
  }

  function clearPem(field) {
    updateSecurity({ [field]: '' });
    setTextEditMode((prev) => ({ ...prev, [field]: false }));
  }

  function renderPemField(field, label, accept, placeholder) {
    const hasValue = Boolean((security[field] || '').trim());

    return (
      <label className={styles.settingsField}>
        <span>{label}</span>
        <div className={styles.settingsUploadRow}>
          <label className={styles.settingsUploadButton}>
            Upload file
            <input
              type="file"
              accept={accept}
              onChange={(event) => {
                onUploadPem(field, event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </label>
          <button type="button" className={styles.settingsGhostButton} onClick={() => toggleTextEditor(field)}>
            {textEditMode[field] ? 'Hide text' : 'Edit as text'}
          </button>
          {hasValue ? (
            <button type="button" className={styles.settingsGhostButton} onClick={() => clearPem(field)}>
              Clear
            </button>
          ) : null}
          <span className={styles.settingsUploadMeta}>{hasValue ? 'Loaded' : 'Empty'}</span>
        </div>
        {textEditMode[field] ? (
          <textarea
            className={styles.settingsTextarea}
            value={security[field] || ''}
            onChange={(event) => updateSecurity({ [field]: event.target.value })}
            placeholder={placeholder}
            spellCheck={false}
          />
        ) : null}
      </label>
    );
  }

  return (
    <div className={styles.settingsPanel}>
      <header className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Request Settings</h3>
      </header>

      <div className={styles.settingsBody}>
        <label className={styles.settingsField}>
          <span>SSL certificate verification</span>
          <select value={sslMode} onChange={(event) => setSslMode(event.target.value)} className={styles.inlineSelect}>
            <option value="inherit">Inherit workspace setting</option>
            <option value="enabled">Always verify</option>
            <option value="disabled">Disable verification</option>
          </select>
        </label>

        <p className={styles.settingsHelp}>
          Inherit uses host-level and global SSL policy from SSL & Security settings.
        </p>
        {sslMode === 'disabled' ? (
          <p className={styles.settingsWarning}>
            SSL verification disabled for this request. Use only for trusted development endpoints.
          </p>
        ) : null}

        <div className={styles.settingsTlsBlock}>
          <p className={styles.settingsBlockTitle}>TLS Certificates (Advanced)</p>
          <p className={styles.settingsHelp}>
            Upload PEM files. Use `Edit as text` only if you need to inspect or modify content.
          </p>
          {renderPemField('ca', 'CA Certificate (PEM)', '.pem,.crt,.cer,.txt', '-----BEGIN CERTIFICATE-----')}
          {renderPemField('cert', 'Client Certificate (PEM)', '.pem,.crt,.cer,.txt', '-----BEGIN CERTIFICATE-----')}
          {renderPemField('key', 'Client Private Key (PEM)', '.pem,.key,.txt', '-----BEGIN PRIVATE KEY-----')}

          <label className={styles.settingsField}>
            <span>Private Key Passphrase (optional)</span>
            <input
              type="password"
              className={styles.inlineSelect}
              value={security.passphrase || ''}
              onChange={(event) => updateSecurity({ passphrase: event.target.value })}
              placeholder="passphrase"
              autoComplete="off"
            />
          </label>
        </div>
      </div>
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
    'Utility: Generate UUID variable',
    'Utility: Generate random email variable',
    'Utility: Generate random string variable',
    'Request: Inject correlation ID header',
    'Request: Build random user JSON body',
  ];

  const postScriptSnippets = [
    'Status code is 200',
    'Status code is 2xx',
    'Response time < 500ms',
    'Body contains property',
    'Body array: every item has email',
    'Response header exists',
    'Environment: Save token from response',
  ];

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
        {tab === 'Settings' && <RequestSettingsPanel request={request} onChange={onRequestChange} />}
        {tab === 'Pre-request Script' && (
          <ScriptPanel
            id="pre-script"
            title="Pre-request script"
            value={request.scripts.preRequest || ''}
            onChange={(value) => updateScripts('preRequest', value)}
            placeholder="rp.request.headers.set('X-Time', Date.now())"
            intro="Pre-request scripts are written in JavaScript, and are run before the request is sent."
            docLabel="Read documentation"
            docUrl="https://toolstackhq.github.io/reqpilot/request-testing"
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
            docUrl="https://toolstackhq.github.io/reqpilot/request-testing"
            snippetNames={postScriptSnippets}
            onAppendSnippet={(name) => updateScripts('postRequest', `${request.scripts.postRequest || ''}\n${SNIPPETS[name]}`.trim())}
          />
        )}
      </section>
    </div>
  );
}
