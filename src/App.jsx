import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './App.module.css';
import { RequestBuilder } from './components/RequestBuilder/RequestBuilder.jsx';
import { ResponseViewer } from './components/ResponseViewer/ResponseViewer.jsx';
import { History } from './components/Sidebar/History.jsx';
import { Console } from './components/Sidebar/Console.jsx';
import { Collections } from './components/Sidebar/Collections.jsx';
import { EnvManager } from './components/Environment/EnvManager.jsx';
import { ThemeToggle } from './components/ThemeToggle/ThemeToggle.jsx';
import { ImportModal } from './components/Import/ImportModal.jsx';
import { SaveRequestModal } from './components/SaveRequest/SaveRequestModal.jsx';
import { ComingSoonModal } from './components/ComingSoon/ComingSoonModal.jsx';
import { CommandPalette } from './components/CommandPalette/CommandPalette.jsx';
import { SecurityModal } from './components/Security/SecurityModal.jsx';
import { WorkspaceManager } from './components/Workspace/WorkspaceManager.jsx';
import { useTheme } from './hooks/useTheme.js';
import { useHistory } from './hooks/useHistory.js';
import { useConsole } from './hooks/useConsole.js';
import { useCollections } from './hooks/useCollections.js';
import { useEnvironments } from './hooks/useEnvironments.js';
import { useWorkspaces } from './hooks/useWorkspaces.js';
import { useSecuritySettings } from './hooks/useSecuritySettings.js';
import { useRequestSender } from './hooks/useRequestSender.js';

const REQUEST_TABS_KEY = 'reqpilot_request_tabs_v2';
const ACTIVE_TAB_KEY = 'reqpilot_active_tab_v2';

function loadWorkspaceMap(storageKey) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) || '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // noop
  }
  return {};
}

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
    url: 'https://petstore.swagger.io/v2/pet/findByStatus?status=available',
    params: [makeRow()],
    headers: [makeRow()],
    body: {
      type: 'json',
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
    security: {
      sslVerification: 'inherit',
      ca: '',
      cert: '',
      key: '',
      passphrase: '',
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
  const {
    workspaces,
    activeWorkspace,
    activeWorkspaceId,
    setActiveWorkspaceId,
    createWorkspace,
    updateWorkspace,
  } = useWorkspaces();
  const [requestTabs, setRequestTabs] = useState(() => [createRequestTab()]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [apiMode, setApiMode] = useState('rest');
  const [responseHeight, setResponseHeight] = useState(320);
  const [showImport, setShowImport] = useState(false);
  const [showSaveRequest, setShowSaveRequest] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showConsole, setShowConsole] = useState(false);
  const [showEnvManager, setShowEnvManager] = useState(false);
  const [showWorkspaceManager, setShowWorkspaceManager] = useState(false);
  const [showSecuritySettings, setShowSecuritySettings] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [comingSoonFeature, setComingSoonFeature] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [isApiModeExpanded, setIsApiModeExpanded] = useState(true);
  const [isToolsExpanded, setIsToolsExpanded] = useState(true);

  const { theme, toggleTheme } = useTheme();
  const { history, addHistory, clearHistory } = useHistory(activeWorkspaceId);
  const { consoleEntries, addConsoleEntry, clearConsoleEntries } = useConsole(activeWorkspaceId);
  const { collections, createCollection, saveRequestToCollection, importCollection } = useCollections(activeWorkspaceId);
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
  } = useEnvironments(activeWorkspaceId);
  const {
    settings: securitySettings,
    setVerifySslByDefault,
    addHostRule,
    updateHostRule,
    removeHostRule,
    resolveRequestSecurity,
  } = useSecuritySettings();

  const { sendRequest, isSending, elapsedMs } = useRequestSender({
    variables: activeVariablesMap,
    updateVariable: upsertVariable,
    resolveSecurity: resolveRequestSecurity,
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
    if (typeof window === 'undefined') return;
    const tabMap = loadWorkspaceMap(REQUEST_TABS_KEY);
    const activeMap = loadWorkspaceMap(ACTIVE_TAB_KEY);
    const nextTabs = Array.isArray(tabMap[activeWorkspaceId]) && tabMap[activeWorkspaceId].length
      ? tabMap[activeWorkspaceId]
      : [createRequestTab()];

    setRequestTabs(nextTabs);
    setActiveTabId(activeMap[activeWorkspaceId] || nextTabs[0]?.id || null);
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (typeof window === 'undefined' || !activeWorkspaceId) return;
    const tabMap = loadWorkspaceMap(REQUEST_TABS_KEY);
    tabMap[activeWorkspaceId] = requestTabs;
    window.localStorage.setItem(REQUEST_TABS_KEY, JSON.stringify(tabMap));
  }, [activeWorkspaceId, requestTabs]);

  useEffect(() => {
    if (typeof window === 'undefined' || !activeWorkspaceId) return;
    const activeMap = loadWorkspaceMap(ACTIVE_TAB_KEY);
    activeMap[activeWorkspaceId] = activeTabId;
    window.localStorage.setItem(ACTIVE_TAB_KEY, JSON.stringify(activeMap));
  }, [activeWorkspaceId, activeTabId]);

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

  function openFreshRequest() {
    setApiMode('rest');
    addNewRequestTab();
    window.requestAnimationFrame(() => {
      document.getElementById('request-url-input')?.focus();
    });
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

    const logEntries = (result.logEntries || []).length
      ? result.logEntries
      : (result.logs || []).map((message) => ({
          level: 'log',
          phase: 'script',
          message,
          timestamp: new Date().toISOString(),
        }));

    addConsoleEntry({
      id: `console-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      request: {
        method: result.request?.method || activeRequest.method,
        url: result.request?.url || activeRequest.url,
      },
      response: {
        status: result.status,
        statusText: result.statusText,
        time: result.time,
        size: result.size,
        error: result.error,
      },
      logEntries,
      logs: result.logs || [],
    });
  }

  useEffect(() => {
    const interval = window.setInterval(async () => {
      try {
        const result = await fetch('/health');
        setConnectionStatus(result.ok ? 'online' : 'offline');
      } catch {
        setConnectionStatus('offline');
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
        setShowConsole(false);
        setShowEnvManager(false);
        setShowWorkspaceManager(false);
        setShowSecuritySettings(false);
        setShowPalette(false);
        setComingSoonFeature(null);
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        setShowSaveRequest(true);
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        openFreshRequest();
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        setApiMode('rest');
        const input = document.getElementById('request-url-input');
        input?.focus();
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        setShowWorkspaceManager(true);
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

  const hasDrawerOpen = showHistory || showConsole;

  return (
    <div className={`${styles.appRoot} ${hasDrawerOpen ? styles.appRootDrawerOpen : ''}`}>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <header className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <div className={styles.brand}>
            <span className={styles.brandIconWrap} aria-hidden="true">
              <svg className={styles.brandIcon} viewBox="0 0 64 64" fill="none">
                <path className={styles.brandLink} d="M17 18L31 30M17 46L31 34" />
                <circle className={styles.brandNode} cx="17" cy="18" r="5" />
                <circle className={styles.brandNode} cx="17" cy="46" r="5" />
                <circle className={styles.brandNode} cx="31" cy="32" r="5" />
                <path className={styles.brandPlane} d="M36 27L51 32L36 37L39 32L36 27Z" />
              </svg>
            </span>
            <span className={styles.brandText}>REQPILOT</span>
          </div>
          <button
            type="button"
            className={styles.workspaceSelect}
            onClick={() => setShowWorkspaceManager(true)}
            aria-label="Open workspace manager"
          >
            {activeWorkspace?.name || 'Workspace'} ▾
          </button>
        </div>
        <div className={styles.commandSearch} role="search">
          <input
            className={styles.commandInput}
            type="text"
            placeholder="Open commands, requests, shortcuts"
            aria-label="Open command palette"
            onFocus={() => setShowPalette(true)}
          />
          <span className={styles.commandHint}>Ctrl/⌘ K</span>
        </div>
        <div className={styles.topBarActions}>
          <button type="button" className={styles.navButton} onClick={openFreshRequest}>
            New Request
          </button>
          <button type="button" className={styles.navButton} onClick={() => setShowImport(true)}>
            Import
          </button>
          <button type="button" className={styles.navButton} onClick={() => setShowEnvManager(true)}>
            Environments
          </button>
          <button type="button" className={styles.navButtonGhost} onClick={() => setShowHistory(true)}>
            History
          </button>
        </div>
      </header>

      <main id="main-content" className={styles.main} ref={mainRef} tabIndex={-1}>
        <aside className={styles.sidebarShell}>
          <button
            type="button"
            className={styles.sidebarModeTitle}
            aria-expanded={isApiModeExpanded}
            onClick={() => setIsApiModeExpanded((prev) => !prev)}
          >
            API MODE
            <span className={`${styles.sectionChevron} ${!isApiModeExpanded ? styles.sectionChevronCollapsed : ''}`}>▾</span>
          </button>
          {isApiModeExpanded ? (
            <nav className={styles.leftRail} aria-label="Primary sections">
              <button
                className={`${styles.railButton} ${styles.railModeRest} ${apiMode === 'rest' ? styles.railButtonActive : ''}`}
                type="button"
                aria-label="REST requests"
                title="REST (active)"
                onClick={() => {
                  setApiMode('rest');
                  document.getElementById('request-url-input')?.focus();
                }}
              >
                <svg className={styles.railIcon} viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 7h13" />
                  <path d="M5 12h8" />
                  <path d="M5 17h13" />
                  <path d="m14 5 4 2-4 2" />
                </svg>
                <span className={styles.railLabel}>REST</span>
              </button>
              <button
                className={`${styles.railButton} ${styles.railModeGrpc} ${styles.railButtonFuture}`}
                type="button"
                aria-label="gRPC coming soon"
                title="gRPC (coming soon)"
                onClick={() => setComingSoonFeature('grpc')}
              >
                <svg className={styles.railIcon} viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="6" cy="12" r="2.1" />
                  <circle cx="18" cy="7" r="2.1" />
                  <circle cx="18" cy="17" r="2.1" />
                  <path d="M8 11l7-3" />
                  <path d="M8 13l7 3" />
                </svg>
                <span className={styles.railLabel}>gRPC</span>
              </button>
              <button
                className={`${styles.railButton} ${styles.railModeGraphql} ${styles.railButtonFuture}`}
                type="button"
                aria-label="GraphQL coming soon"
                title="GraphQL (coming soon)"
                onClick={() => setComingSoonFeature('graphql')}
              >
                <svg className={styles.railIcon} viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polygon points="12,3.8 19.4,8.1 19.4,15.9 12,20.2 4.6,15.9 4.6,8.1" />
                  <circle cx="12" cy="3.8" r="1.5" />
                  <circle cx="19.4" cy="8.1" r="1.5" />
                  <circle cx="19.4" cy="15.9" r="1.5" />
                  <circle cx="12" cy="20.2" r="1.5" />
                  <circle cx="4.6" cy="15.9" r="1.5" />
                  <circle cx="4.6" cy="8.1" r="1.5" />
                </svg>
                <span className={styles.railLabel}>GraphQL</span>
              </button>
              <button
                className={`${styles.railButton} ${styles.railModeWs} ${styles.railButtonFuture}`}
                type="button"
                aria-label="WebSocket coming soon"
                title="WebSocket (coming soon)"
                onClick={() => setComingSoonFeature('websocket')}
              >
                <svg className={styles.railIcon} viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 8a12 12 0 0 1 16 0" />
                  <path d="M7 11a8 8 0 0 1 10 0" />
                  <path d="M10 14a4 4 0 0 1 4 0" />
                  <circle cx="12" cy="17" r="1.8" />
                </svg>
                <span className={styles.railLabel}>WebSocket</span>
              </button>
            </nav>
          ) : null}

          <button
            type="button"
            className={styles.sidebarModeTitle}
            aria-expanded={isToolsExpanded}
            onClick={() => setIsToolsExpanded((prev) => !prev)}
          >
            TOOLS
            <span className={`${styles.sectionChevron} ${!isToolsExpanded ? styles.sectionChevronCollapsed : ''}`}>▾</span>
          </button>
          {isToolsExpanded ? (
            <div className={styles.sidebarTools}>
              <button
                className={`${styles.railButton} ${styles.railToolCollections}`}
                type="button"
                aria-label="Collections"
                title="Collections"
                onClick={() => document.getElementById('collections-panel')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <svg className={styles.railIcon} viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3.5 7.4a2 2 0 0 1 2-2H10l1.3 1.6h7.2a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2z" />
                </svg>
                <span className={styles.railLabel}>Collections</span>
              </button>
              <button
                className={`${styles.railButton} ${styles.railToolEnv}`}
                type="button"
                aria-label="Environments"
                title="Environments"
                onClick={() => setShowEnvManager(true)}
              >
                <svg className={styles.railIcon} viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="8.4" />
                  <path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h7" />
                </svg>
                <span className={styles.railLabel}>Environments</span>
              </button>
              <button
                className={`${styles.railButton} ${styles.railToolHistory}`}
                type="button"
                aria-label="History"
                title="History"
                onClick={() => setShowHistory(true)}
              >
                <svg className={styles.railIcon} viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3.5 12a8.5 8.5 0 1 0 2.2-5.7" />
                  <path d="M3.5 4.7v3.8h3.8" />
                  <path d="M12 8v4.2l2.8 1.8" />
                </svg>
                <span className={styles.railLabel}>History</span>
              </button>
              <button
                className={`${styles.railButton} ${styles.railToolConsole}`}
                type="button"
                aria-label="Console"
                title="Console"
                onClick={() => setShowConsole(true)}
              >
                <svg className={styles.railIcon} viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4.5 6.2h15a1.6 1.6 0 0 1 1.6 1.6v8.4a1.6 1.6 0 0 1-1.6 1.6h-15a1.6 1.6 0 0 1-1.6-1.6V7.8a1.6 1.6 0 0 1 1.6-1.6z" />
                  <path d="m8.3 10.2 2.1 1.8-2.1 1.8" />
                  <path d="M12.8 14h2.9" />
                </svg>
                <span className={styles.railLabel}>Console</span>
              </button>
            </div>
          ) : null}

          <aside className={styles.collectionsPane} id="collections-panel" aria-label="Collections panel">
            <Collections
              workspaceMode
              collections={collections}
              workspaceName={activeWorkspace?.name || 'Workspace'}
              onOpenWorkspace={() => setShowWorkspaceManager(true)}
              onCreate={(name) => createCollection(name)}
              onLoad={loadRequest}
              onSaveCurrent={onOpenSaveRequest}
              onExport={exportCollections}
              onOpenImport={() => setShowImport(true)}
            />
          </aside>
        </aside>

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
      </main>

      <footer className={styles.statusBar}>
        <span className={styles.envStatus}>
          Workspace: <span className={styles.envName}>{activeWorkspace?.name || 'Personal Workspace'}</span>
          <button type="button" className={styles.envChangeButton} onClick={() => setShowWorkspaceManager(true)}>
            Open
          </button>
        </span>
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
        <span className={styles.connectionStatus}>
          Connection: {connectionStatus === 'online' ? 'Ready' : connectionStatus === 'checking' ? 'Checking' : 'Error'}
          <button type="button" className={styles.envChangeButton} onClick={() => setShowSecuritySettings(true)}>
            SSL
          </button>
        </span>
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
            <History history={history} onLoad={loadRequest} onClear={clearHistory} variableValues={activeVariablesMap} />
          </aside>
        </>
      ) : null}

      {showConsole ? (
        <>
          <button className={styles.overlay} type="button" aria-hidden="true" onClick={() => setShowConsole(false)} />
          <aside className={styles.drawer} role="dialog" aria-modal="true" aria-label="Console Drawer">
            <Console entries={consoleEntries} onClear={clearConsoleEntries} />
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

      {showWorkspaceManager ? (
        <WorkspaceManager
          workspaces={workspaces}
          activeWorkspace={activeWorkspace}
          activeWorkspaceId={activeWorkspaceId}
          onSelectWorkspace={setActiveWorkspaceId}
          onCreateWorkspace={createWorkspace}
          onUpdateWorkspace={updateWorkspace}
          onClose={() => setShowWorkspaceManager(false)}
        />
      ) : null}

      {showSecuritySettings ? (
        <SecurityModal
          settings={securitySettings}
          onClose={() => setShowSecuritySettings(false)}
          onChangeDefaultVerification={setVerifySslByDefault}
          onAddHostRule={addHostRule}
          onUpdateHostRule={updateHostRule}
          onRemoveHostRule={removeHostRule}
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
            { id: 'workspace', label: 'Open Workspace Manager', run: () => setShowWorkspaceManager(true) },
            { id: 'env', label: 'Manage Environments', run: () => setShowEnvManager(true) },
            { id: 'security', label: 'SSL & Security Settings', run: () => setShowSecuritySettings(true) },
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
            {
              id: 'console',
              label: 'Open Console',
              run: () => setShowConsole(true),
            },
            { id: 'import', label: 'Open Import', run: () => setShowImport(true) },
          ]}
        />
      )}
    </div>
  );
}
