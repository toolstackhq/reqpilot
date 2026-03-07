import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './App.module.css';
import { RequestBuilder } from './components/RequestBuilder/RequestBuilder.jsx';
import { ResponseViewer } from './components/ResponseViewer/ResponseViewer.jsx';
import { History } from './components/Sidebar/History.jsx';
import { Collections } from './components/Sidebar/Collections.jsx';
import { EnvManager } from './components/Environment/EnvManager.jsx';
import { ThemeToggle } from './components/ThemeToggle/ThemeToggle.jsx';
import { ImportModal } from './components/Import/ImportModal.jsx';
import { SaveRequestModal } from './components/SaveRequest/SaveRequestModal.jsx';
import { ComingSoonModal } from './components/ComingSoon/ComingSoonModal.jsx';
import { CommandPalette } from './components/CommandPalette/CommandPalette.jsx';
import { useTheme } from './hooks/useTheme.js';
import { useHistory } from './hooks/useHistory.js';
import { useCollections } from './hooks/useCollections.js';
import { useEnvironments } from './hooks/useEnvironments.js';
import { useRequestSender } from './hooks/useRequestSender.js';

function makeRow() {
  return {
    id: `row-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    key: '',
    value: '',
    enabled: true,
  };
}

function createDefaultRequest() {
  return {
    id: `req-${Date.now()}`,
    name: 'Untitled',
    method: 'GET',
    url: 'http://localhost:4444/api/users',
    params: [makeRow()],
    headers: [makeRow()],
    body: {
      type: 'none',
      raw: '',
      form: [makeRow()],
    },
    auth: {
      type: 'none',
      enabled: true,
      token: '',
      username: '',
      password: '',
      key: 'X-API-Key',
      value: '',
      addTo: 'header',
    },
    scripts: {
      preRequest: '',
      tests: '',
      postRequest: '',
    },
  };
}

function createRequestTab(partial = {}) {
  return {
    id: `tab-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    request: createDefaultRequest(),
    response: null,
    ...partial,
  };
}

function collectTemplateVariables(value, target = new Set()) {
  if (typeof value === 'string') {
    const pattern = /\{\{\s*([^{}]+?)\s*\}\}/g;
    let match = pattern.exec(value);
    while (match) {
      const key = match[1].trim();
      if (key) target.add(key);
      match = pattern.exec(value);
    }
    return target;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => collectTemplateVariables(entry, target));
    return target;
  }

  if (value && typeof value === 'object') {
    Object.values(value).forEach((entry) => collectTemplateVariables(entry, target));
  }

  return target;
}

export default function App() {
  const [requestTabs, setRequestTabs] = useState(() => [createRequestTab()]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [apiMode, setApiMode] = useState('rest');
  const [responseHeight, setResponseHeight] = useState(320);
  const [showImport, setShowImport] = useState(false);
  const [showSaveRequest, setShowSaveRequest] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showEnvManager, setShowEnvManager] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [comingSoonFeature, setComingSoonFeature] = useState(null);
  const [proxyStatus, setProxyStatus] = useState('checking');

  const { theme, toggleTheme } = useTheme();
  const { history, addHistory, clearHistory } = useHistory();
  const { collections, createCollection, saveRequestToCollection, importCollection } = useCollections();
  const {
    environments,
    activeId,
    setActiveId,
    activeEnvironment,
    activeVariablesMap,
    upsertVariable,
    createEnvironment,
    updateActiveVariables,
    importEnvironment,
  } = useEnvironments();

  const { sendRequest, isSending, elapsedMs } = useRequestSender({
    variables: activeVariablesMap,
    updateVariable: upsertVariable,
  });

  const mainRef = useRef(null);
  const centerAreaRef = useRef(null);
  const resizeRef = useRef(null);
  const emptyRequestRef = useRef(createDefaultRequest());

  const activeTab = useMemo(
    () => requestTabs.find((tab) => tab.id === activeTabId) || requestTabs[0] || null,
    [requestTabs, activeTabId]
  );

  const activeRequest = activeTab?.request || emptyRequestRef.current;
  const activeResponse = activeTab?.response || null;

  useEffect(() => {
    if (!requestTabs.length) return;
    if (!activeTabId || !requestTabs.some((tab) => tab.id === activeTabId)) {
      setActiveTabId(requestTabs[0].id);
    }
  }, [requestTabs, activeTabId]);

  function updateActiveTab(patch) {
    if (!activeTab) return;
    setRequestTabs((prev) => prev.map((tab) => (tab.id === activeTab.id ? { ...tab, ...patch } : tab)));
  }

  function updateActiveRequest(nextRequest) {
    updateActiveTab({ request: nextRequest });
  }

  function addNewRequestTab() {
    const nextTab = createRequestTab();
    setRequestTabs((prev) => [...prev, nextTab]);
    setActiveTabId(nextTab.id);
  }

  function closeRequestTab(tabId) {
    setRequestTabs((prev) => {
      if (!prev.length) return prev;
      if (prev.length === 1) {
        const only = prev[0];
        return [{ ...only, request: createDefaultRequest(), response: null }];
      }

      const index = prev.findIndex((tab) => tab.id === tabId);
      const next = prev.filter((tab) => tab.id !== tabId);

      if (tabId === activeTabId) {
        const fallback = next[Math.max(0, Math.min(index, next.length - 1))];
        if (fallback) {
          setActiveTabId(fallback.id);
        }
      }

      return next;
    });
  }

  function clampResponseHeight(value) {
    const containerHeight = centerAreaRef.current?.clientHeight || 800;
    const minResponse = 180;
    const minRequest = 160;
    const maxResponse = Math.max(minResponse, containerHeight - minRequest);
    return Math.min(maxResponse, Math.max(minResponse, value));
  }

  function preferredResponseHeight() {
    const containerHeight = centerAreaRef.current?.clientHeight || 800;
    return clampResponseHeight(Math.round(containerHeight * 0.52));
  }

  function beginResponseResize(clientY) {
    resizeRef.current = {
      startY: clientY,
      startHeight: responseHeight,
    };
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }

  async function runSend() {
    if (!activeTab) return;
    const hadResponse = Boolean(activeTab.response);
    const result = await sendRequest(activeRequest);
    updateActiveTab({ response: result });
    if (!hadResponse) {
      setResponseHeight(preferredResponseHeight());
    }
    addHistory({
      id: `hist-${Date.now()}`,
      timestamp: new Date().toISOString(),
      request: structuredClone(activeRequest),
      response: result,
    });
  }

  useEffect(() => {
    const interval = window.setInterval(async () => {
      try {
        const result = await fetch('/health');
        setProxyStatus(result.ok ? 'online' : 'offline');
      } catch {
        setProxyStatus('offline');
      }
    }, 3000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    function onKeydown(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setShowPalette(true);
      }

      if (event.key === 'Escape') {
        setShowImport(false);
        setShowHistory(false);
        setShowEnvManager(false);
        setShowPalette(false);
        setComingSoonFeature(null);
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        setShowSaveRequest(true);
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        addNewRequestTab();
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        setApiMode('rest');
        const input = document.getElementById('request-url-input');
        input?.focus();
      }
    }

    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  });

  useEffect(() => {
    function onMouseMove(event) {
      if (!resizeRef.current) return;
      const delta = resizeRef.current.startY - event.clientY;
      setResponseHeight(clampResponseHeight(resizeRef.current.startHeight + delta));
    }

    function onMouseUp() {
      if (!resizeRef.current) return;
      resizeRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  function loadRequest(entry) {
    updateActiveTab({
      request: structuredClone(entry.request || entry),
      response: entry.response || null,
    });
  }

  function onOpenSaveRequest() {
    setShowSaveRequest(true);
  }

  function onSaveRequestToCollection({ mode, collectionId, collectionName, requestName }) {
    let targetCollectionId = collectionId;

    if (mode === 'new') {
      const created = createCollection(collectionName);
      targetCollectionId = created.id;
    }

    if (!targetCollectionId) {
      return;
    }

    saveRequestToCollection(targetCollectionId, activeRequest, requestName);
    setShowSaveRequest(false);
  }

  function exportCollections() {
    const blob = new Blob([JSON.stringify(collections, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'reqpilot-collections.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  const statusText = useMemo(() => {
    if (!activeResponse) {
      return 'No response yet';
    }

    if (activeResponse.error) {
      return 'Request failed';
    }

    return `${activeResponse.status} ${activeResponse.statusText}`;
  }, [activeResponse]);

  const templateVariables = useMemo(
    () => Array.from(collectTemplateVariables(activeRequest)).sort((a, b) => a.localeCompare(b)),
    [activeRequest]
  );

  const variableResolution = useMemo(() => {
    const resolved = [];
    const missing = [];

    for (const name of templateVariables) {
      if (Object.prototype.hasOwnProperty.call(activeVariablesMap, name)) {
        resolved.push(name);
      } else {
        missing.push(name);
      }
    }

    return { resolved, missing };
  }, [templateVariables, activeVariablesMap]);

  return (
    <div className={styles.appRoot}>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <header className={styles.topBar}>
        <div className={styles.brand}>REQPILOT</div>
        <div className={styles.commandSearch} role="search">
          <input
            className={styles.commandInput}
            type="text"
            placeholder="Search and commands"
            aria-label="Search and commands"
            onFocus={() => setShowPalette(true)}
          />
          <span className={styles.commandHint}>Ctrl K</span>
        </div>
      </header>

      <main id="main-content" className={styles.main} ref={mainRef} tabIndex={-1}>
        <nav className={styles.leftRail} aria-label="Primary sections">
          <button
            className={`${styles.railButton} ${apiMode === 'rest' ? styles.railButtonActive : ''}`}
            type="button"
            aria-label="REST requests"
            title="REST (active)"
            onClick={() => {
              setApiMode('rest');
              document.getElementById('request-url-input')?.focus();
            }}
          >
            R
          </button>
          <button
            className={`${styles.railButton} ${styles.railButtonFuture}`}
            type="button"
            aria-label="gRPC coming soon"
            title="gRPC (coming soon)"
            onClick={() => setComingSoonFeature('grpc')}
          >
            g
          </button>
          <button
            className={`${styles.railButton} ${styles.railButtonFuture}`}
            type="button"
            aria-label="GraphQL coming soon"
            title="GraphQL (coming soon)"
            onClick={() => setComingSoonFeature('graphql')}
          >
            G
          </button>
          <button
            className={`${styles.railButton} ${styles.railButtonFuture}`}
            type="button"
            aria-label="WebSocket coming soon"
            title="WebSocket (coming soon)"
            onClick={() => setComingSoonFeature('websocket')}
          >
            W
          </button>
        </nav>

        <section className={styles.centerArea} ref={centerAreaRef}>
          <div className={styles.requestTabsBar}>
            <div className={styles.requestTabsList} role="tablist" aria-label="Request workspace tabs">
              {requestTabs.map((tab) => (
                <div key={tab.id} className={styles.requestTabItem}>
                  <button
                    className={tab.id === activeTab?.id ? styles.requestTabActive : styles.requestTab}
                    type="button"
                    role="tab"
                    aria-selected={tab.id === activeTab?.id}
                    onClick={() => setActiveTabId(tab.id)}
                  >
                    <span className={styles.requestMethod}>{tab.request.method}</span>
                    <span className={styles.requestTabTitle}>{tab.request.name || 'Untitled'}</span>
                  </button>
                  <button
                    className={styles.requestTabClose}
                    type="button"
                    aria-label={`Close ${tab.request.name || 'Untitled'} tab`}
                    onClick={() => closeRequestTab(tab.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
              <div className={styles.requestTabItem}>
                <button className={styles.requestTabAdd} type="button" aria-label="Add request tab" onClick={addNewRequestTab}>
                  +
                </button>
              </div>
            </div>
          </div>

          <section className={styles.requestPane} aria-label="Request Builder">
            <RequestBuilder
              request={activeRequest}
              onRequestChange={updateActiveRequest}
              onSend={runSend}
              onSave={onOpenSaveRequest}
              isSending={isSending}
              elapsedMs={elapsedMs}
              variableValues={activeVariablesMap}
            />
          </section>

          {activeResponse ? (
            <>
              <div
                className={styles.horizontalSplitter}
                role="separator"
                aria-orientation="horizontal"
                aria-label="Resize response panel"
                onMouseDown={(event) => beginResponseResize(event.clientY)}
                onDoubleClick={() => setResponseHeight(320)}
              >
                <span className={styles.splitterGrip} aria-hidden="true" />
              </div>
              <section className={styles.responsePane} style={{ height: `${responseHeight}px` }} aria-label="Response Viewer">
                <ResponseViewer response={activeResponse} />
              </section>
            </>
          ) : null}
        </section>

        <nav className={styles.rightRail} aria-label="Workspace tools">
          <button
            className={styles.railButton}
            type="button"
            aria-label="Collections"
            onClick={() => document.getElementById('collections-panel')?.scrollIntoView({ behavior: 'smooth' })}
          >
            ▦
          </button>
          <button className={styles.railButton} type="button" aria-label="Environments" onClick={() => setShowEnvManager(true)}>
            ◎
          </button>
          <button className={styles.railButton} type="button" aria-label="History" onClick={() => setShowHistory(true)}>
            ◷
          </button>
          <button className={styles.railButton} type="button" aria-label="Sharing">
            ⤴
          </button>
          <button className={styles.railButton} type="button" aria-label="Code generation">
            &lt;/&gt;
          </button>
          <button className={styles.railButton} type="button" aria-label="Response history">
            ☰
          </button>
        </nav>

        <aside className={styles.collectionsPane} id="collections-panel" aria-label="Collections panel">
          <Collections
            workspaceMode
            collections={collections}
            onCreate={(name) => createCollection(name)}
            onLoad={loadRequest}
            onSaveCurrent={onOpenSaveRequest}
            onExport={exportCollections}
            onOpenImport={() => setShowImport(true)}
          />
        </aside>
      </main>

      <footer className={styles.statusBar}>
        <span className={styles.envStatus}>
          Environment: <span className={styles.envName}>{activeEnvironment?.name || 'none'}</span>
          <button type="button" className={styles.envChangeButton} onClick={() => setShowEnvManager(true)}>
            Change
          </button>
        </span>
        {templateVariables.length ? (
          <div className={styles.envVars} aria-label="Environment variable resolution">
            {variableResolution.resolved.slice(0, 2).map((name) => (
              <span
                key={`ok-${name}`}
                className={styles.envVarResolved}
                title={`Resolved from ${activeEnvironment?.name || 'environment'}`}
              >
                {`{{${name}}}${activeVariablesMap[name] !== '' ? `=${String(activeVariablesMap[name]).slice(0, 12)}` : ''}`}
              </span>
            ))}
            {variableResolution.missing.slice(0, 2).map((name) => (
              <span key={`miss-${name}`} className={styles.envVarMissing} title="Missing environment variable">
                {`{{${name}}}`}
              </span>
            ))}
            {templateVariables.length > 4 ? <span className={styles.envVarMore}>+{templateVariables.length - 4}</span> : null}
          </div>
        ) : null}
        <span>Proxy: {proxyStatus}</span>
        <span>Mode: REST</span>
        <span>Version: 1.0.0</span>
        <span>Status: {statusText}</span>
        <span className={styles.statusSpacer} />
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </footer>

      {showHistory ? (
        <>
          <button className={styles.overlay} type="button" aria-hidden="true" onClick={() => setShowHistory(false)} />
          <aside className={styles.drawer} role="dialog" aria-modal="true" aria-label="History Drawer">
            <History history={history} onLoad={loadRequest} onClear={clearHistory} />
          </aside>
        </>
      ) : null}

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImport={(payload) => {
            if (payload.collection) {
              importCollection(payload.collection);
            }
            if (payload.environment) {
              importEnvironment(payload.environment);
            }
            setShowImport(false);
          }}
        />
      )}

      {showSaveRequest && (
        <SaveRequestModal
          request={activeRequest}
          collections={collections}
          onClose={() => setShowSaveRequest(false)}
          onSubmit={onSaveRequestToCollection}
        />
      )}

      {showEnvManager ? (
        <EnvManager
          environment={activeEnvironment}
          environments={environments}
          activeId={activeId}
          onSelectEnvironment={setActiveId}
          onClose={() => setShowEnvManager(false)}
          onCreateEnvironment={createEnvironment}
          onSaveVariables={updateActiveVariables}
        />
      ) : null}

      {comingSoonFeature ? (
        <ComingSoonModal feature={comingSoonFeature} onClose={() => setComingSoonFeature(null)} />
      ) : null}

      {showPalette && (
        <CommandPalette
          onClose={() => setShowPalette(false)}
          actions={[
            { id: 'send', label: 'Send Request', run: runSend },
            { id: 'save', label: 'Save Request', run: onOpenSaveRequest },
            { id: 'new-tab', label: 'New Request Tab', run: addNewRequestTab },
            { id: 'env', label: 'Manage Environments', run: () => setShowEnvManager(true) },
            {
              id: 'collections',
              label: 'Focus Collections',
              run: () => document.getElementById('collections-panel')?.scrollIntoView({ behavior: 'smooth' }),
            },
            {
              id: 'history',
              label: 'Open History',
              run: () => setShowHistory(true),
            },
            { id: 'import', label: 'Open Import', run: () => setShowImport(true) },
          ]}
        />
      )}
    </div>
  );
}
