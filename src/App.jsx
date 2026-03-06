import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './App.module.css';
import { RequestBuilder } from './components/RequestBuilder/RequestBuilder.jsx';
import { ResponseViewer } from './components/ResponseViewer/ResponseViewer.jsx';
import { History } from './components/Sidebar/History.jsx';
import { Collections } from './components/Sidebar/Collections.jsx';
import { ThemeToggle } from './components/ThemeToggle/ThemeToggle.jsx';
import { EnvSelector } from './components/Environment/EnvSelector.jsx';
import { EnvManager } from './components/Environment/EnvManager.jsx';
import { ImportModal } from './components/Import/ImportModal.jsx';
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
    name: 'New Request',
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

export default function App() {
  const [request, setRequest] = useState(createDefaultRequest);
  const [response, setResponse] = useState(null);
  const [drawer, setDrawer] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [showEnvManager, setShowEnvManager] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [proxyStatus, setProxyStatus] = useState('checking');

  const { theme, toggleTheme } = useTheme();
  const { history, addHistory, clearHistory } = useHistory();
  const { collections, createCollection, saveRequestToCollection, importCollection, replaceAllCollections } =
    useCollections();
  const {
    environments,
    activeId,
    setActiveId,
    activeEnvironment,
    activeVariablesMap,
    createEnvironment,
    updateActiveVariables,
    upsertVariable,
    importEnvironment,
  } = useEnvironments();

  const { sendRequest, isSending, elapsedMs } = useRequestSender({
    variables: activeVariablesMap,
    updateVariable: upsertVariable,
  });

  const mainRef = useRef(null);
  const importTriggerRef = useRef(null);

  async function runSend() {
    const result = await sendRequest(request);
    setResponse(result);
    addHistory({
      id: `hist-${Date.now()}`,
      timestamp: new Date().toISOString(),
      request: structuredClone(request),
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
        setDrawer(null);
        setShowImport(false);
        setShowPalette(false);
        setShowEnvManager(false);
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        onSaveRequestToCollection();
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        setRequest(createDefaultRequest());
        setResponse(null);
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        const input = document.getElementById('request-url-input');
        input?.focus();
      }
    }

    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  });

  function loadRequest(entry) {
    setRequest(structuredClone(entry.request || entry));
    if (entry.response) {
      setResponse(entry.response);
    }
    setDrawer(null);
  }

  function onSaveRequestToCollection() {
    let target = collections[0];
    if (!target) {
      const name = window.prompt('Collection name', 'Default Collection');
      if (!name) return;
      target = createCollection(name);
    }

    const requestName = window.prompt('Request name', request.name || `${request.method} ${request.url}`);
    saveRequestToCollection(target.id, request, requestName);
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

  function importCollectionsFromFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '[]'));
        if (Array.isArray(parsed)) {
          replaceAllCollections(parsed);
        }
      } catch {
        // noop
      }
    };
    reader.readAsText(file);
  }

  const statusText = useMemo(() => {
    if (!response) {
      return 'No response yet';
    }

    if (response.error) {
      return 'Request failed';
    }

    return `${response.status} ${response.statusText}`;
  }, [response]);

  return (
    <div className={styles.appRoot}>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <header className={styles.topBar}>
        <div className={styles.brand}>ReqPilot</div>
        <EnvSelector
          environments={environments}
          activeId={activeId}
          onChange={setActiveId}
          onManage={() => setShowEnvManager(true)}
        />
        <button className={styles.navButton} type="button" onClick={() => setDrawer('collections')}>
          Collections
        </button>
        <button className={styles.navButton} type="button" onClick={() => setDrawer('history')}>
          History
        </button>
        <button
          className={styles.navButton}
          ref={importTriggerRef}
          type="button"
          onClick={() => setShowImport(true)}
          aria-haspopup="dialog"
        >
          Import
        </button>
        <button className={styles.navButton} type="button" onClick={() => setShowPalette(true)}>
          Command Palette
        </button>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      <main id="main-content" className={styles.main} ref={mainRef} tabIndex={-1}>
        <section className={styles.requestPane} aria-label="Request Builder">
          <RequestBuilder
            request={request}
            onRequestChange={setRequest}
            onSend={runSend}
            isSending={isSending}
            elapsedMs={elapsedMs}
          />
        </section>
        <section className={styles.responsePane} aria-label="Response Viewer">
          <ResponseViewer response={response} />
        </section>
      </main>

      <footer className={styles.statusBar}>
        <span>Environment: {activeEnvironment?.name || 'none'}</span>
        <span>Proxy: {proxyStatus}</span>
        <span>Version: 1.0.0</span>
        <span>Status: {statusText}</span>
      </footer>

      {drawer && <button className={styles.overlay} type="button" aria-hidden="true" onClick={() => setDrawer(null)} />}

      {drawer === 'history' && (
        <aside className={styles.drawer} role="dialog" aria-modal="true" aria-label="History Drawer">
          <History history={history} onLoad={loadRequest} onClear={clearHistory} />
        </aside>
      )}

      {drawer === 'collections' && (
        <aside className={styles.drawer} role="dialog" aria-modal="true" aria-label="Collections Drawer">
          <Collections
            collections={collections}
            onCreate={(name) => createCollection(name)}
            onLoad={loadRequest}
            onSaveCurrent={onSaveRequestToCollection}
            onExport={exportCollections}
            onImportFile={importCollectionsFromFile}
          />
        </aside>
      )}

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
          initialFocusRef={importTriggerRef}
        />
      )}

      {showEnvManager && (
        <EnvManager
          environment={activeEnvironment}
          onClose={() => setShowEnvManager(false)}
          onCreateEnvironment={createEnvironment}
          onSaveVariables={updateActiveVariables}
        />
      )}

      {showPalette && (
        <CommandPalette
          onClose={() => setShowPalette(false)}
          actions={[
            { id: 'send', label: 'Send Request', run: runSend },
            { id: 'collections', label: 'Open Collections', run: () => setDrawer('collections') },
            { id: 'history', label: 'Open History', run: () => setDrawer('history') },
            { id: 'import', label: 'Open Import', run: () => setShowImport(true) },
          ]}
        />
      )}
    </div>
  );
}
