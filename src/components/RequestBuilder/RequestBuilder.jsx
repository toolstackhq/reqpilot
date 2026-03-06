import { useEffect, useState } from 'react';
import styles from './RequestBuilder.module.css';
import { UrlBar } from './UrlBar.jsx';
import { ParamsEditor } from './ParamsEditor.jsx';
import { HeadersEditor } from './HeadersEditor.jsx';
import { BodyEditor } from './BodyEditor.jsx';
import { AuthEditor } from './AuthEditor.jsx';
import { parseParamsFromUrl, applyParamsToUrl } from '../../utils/urlSync.js';

const TABS = ['Params', 'Headers', 'Body', 'Auth', 'Pre-request', 'Tests', 'Post-request'];

const SNIPPETS = {
  'Status code is 200': 'rp.test("status is 200", () => {\n  rp.expect(rp.response.status).toBe(200);\n});',
  'Response time < 500ms': 'rp.test("response time < 500ms", () => {\n  rp.expect(rp.response.time).toBeLessThan(500);\n});',
  'Body contains property': 'rp.test("body has property", () => {\n  const body = rp.response.json();\n  rp.expect(body).toHaveProperty("id");\n});',
  'Content-Type is JSON':
    'rp.test("content type json", () => {\n  rp.expect(rp.response.headers.get("content-type")).toContain("application/json");\n});',
  'Response body matches schema': 'rp.test("schema", () => {\n  const body = rp.response.json();\n  rp.expect(body).toBeTruthy();\n});',
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

export function RequestBuilder({ request, onRequestChange, onSend, isSending, elapsedMs }) {
  const [tab, setTab] = useState('Params');

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

  return (
    <div className={styles.root}>
      <UrlBar request={request} onChange={onUrlBarChange} onSend={onSend} isSending={isSending} elapsedMs={elapsedMs} />

      <nav className={styles.tabs} role="tablist" aria-label="Request tabs">
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
            {name}
          </button>
        ))}
      </nav>

      <section
        role="tabpanel"
        id={`request-panel-${tab}`}
        aria-labelledby={`request-tab-${tab}`}
        className={styles.panel}
      >
        {tab === 'Params' && <ParamsEditor rows={toRows(request.params)} onChange={setParams} />}
        {tab === 'Headers' && (
          <HeadersEditor
            rows={toRows(request.headers)}
            onChange={(headers) => onRequestChange({ ...request, headers })}
          />
        )}
        {tab === 'Body' && (
          <BodyEditor body={request.body} onChange={(body) => onRequestChange({ ...request, body })} method={methodKey(request.method)} />
        )}
        {tab === 'Auth' && <AuthEditor auth={request.auth} onChange={(auth) => onRequestChange({ ...request, auth })} />}
        {tab === 'Pre-request' && (
          <div className={styles.scriptPanel}>
            <label htmlFor="pre-script">Pre-request script</label>
            <textarea
              id="pre-script"
              value={request.scripts.preRequest}
              onChange={(event) => updateScripts('preRequest', event.target.value)}
              placeholder="rp.request.headers.set('X-Time', Date.now())"
            />
          </div>
        )}
        {tab === 'Tests' && (
          <div className={styles.scriptPanel}>
            <div className={styles.scriptToolbar}>
              <label htmlFor="test-script">Tests script</label>
              <select
                aria-label="Insert test snippet"
                defaultValue=""
                onChange={(event) => {
                  const value = event.target.value;
                  if (!value) return;
                  updateScripts('tests', `${request.scripts.tests}\n${SNIPPETS[value]}`.trim());
                  event.target.value = '';
                }}
              >
                <option value="">Snippets</option>
                {Object.keys(SNIPPETS).map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              id="test-script"
              value={request.scripts.tests}
              onChange={(event) => updateScripts('tests', event.target.value)}
              placeholder="rp.test('status', () => rp.expect(rp.response.status).toBe(200));"
            />
          </div>
        )}
        {tab === 'Post-request' && (
          <div className={styles.scriptPanel}>
            <label htmlFor="post-script">Post-request script</label>
            <textarea
              id="post-script"
              value={request.scripts.postRequest}
              onChange={(event) => updateScripts('postRequest', event.target.value)}
              placeholder="rp.env.set('token', rp.response.json().token)"
            />
          </div>
        )}
      </section>
    </div>
  );
}
