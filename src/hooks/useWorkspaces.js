import { useEffect, useMemo, useState } from 'react';

const WORKSPACES_KEY = 'reqpilot_workspaces_v2';
const ACTIVE_WORKSPACE_KEY = 'reqpilot_active_workspace_v2';

const DEFAULT_WORKSPACE = {
  id: 'ws-personal',
  name: 'Personal Workspace',
  repoPath: '',
  workspacePath: '',
  remoteUrl: '',
  gitManaged: false,
  createdAt: '2026-01-01T00:00:00.000Z',
};

function normalizeWorkspace(workspace = {}, index = 0) {
  return {
    id: workspace.id || `ws-${Date.now()}-${index}`,
    name: workspace.name || `Workspace ${index + 1}`,
    repoPath: typeof workspace.repoPath === 'string' ? workspace.repoPath : '',
    workspacePath: typeof workspace.workspacePath === 'string' ? workspace.workspacePath : '',
    remoteUrl: typeof workspace.remoteUrl === 'string' ? workspace.remoteUrl : '',
    gitManaged: Boolean(workspace.gitManaged),
    createdAt: workspace.createdAt || new Date().toISOString(),
  };
}

function loadWorkspaces() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(WORKSPACES_KEY) || '[]');
    if (Array.isArray(parsed) && parsed.length) {
      return parsed.map(normalizeWorkspace);
    }
  } catch {
    // noop
  }

  return [DEFAULT_WORKSPACE];
}

function selectInitialActiveId(workspaces) {
  const fallback = workspaces[0]?.id || DEFAULT_WORKSPACE.id;
  try {
    const stored = window.localStorage.getItem(ACTIVE_WORKSPACE_KEY);
    if (stored && workspaces.some((workspace) => workspace.id === stored)) {
      return stored;
    }
  } catch {
    // noop
  }

  return fallback;
}

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState(() => (typeof window === 'undefined' ? [DEFAULT_WORKSPACE] : loadWorkspaces()));
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(() =>
    typeof window === 'undefined' ? DEFAULT_WORKSPACE.id : selectInitialActiveId(loadWorkspaces())
  );

  useEffect(() => {
    if (!workspaces.length) {
      setWorkspaces([DEFAULT_WORKSPACE]);
      setActiveWorkspaceId(DEFAULT_WORKSPACE.id);
      return;
    }

    if (!workspaces.some((workspace) => workspace.id === activeWorkspaceId)) {
      setActiveWorkspaceId(workspaces[0].id);
    }
  }, [workspaces, activeWorkspaceId]);

  useEffect(() => {
    window.localStorage.setItem(WORKSPACES_KEY, JSON.stringify(workspaces));
  }, [workspaces]);

  useEffect(() => {
    window.localStorage.setItem(ACTIVE_WORKSPACE_KEY, activeWorkspaceId);
  }, [activeWorkspaceId]);

  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === activeWorkspaceId) || workspaces[0] || DEFAULT_WORKSPACE,
    [workspaces, activeWorkspaceId]
  );

  function createWorkspace({ name, repoPath = '', workspacePath = '', remoteUrl = '', gitManaged = false }) {
    const workspace = {
      id: `ws-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      name: String(name || '').trim() || 'Untitled Workspace',
      repoPath: String(repoPath || '').trim(),
      workspacePath: String(workspacePath || '').trim(),
      remoteUrl: String(remoteUrl || '').trim(),
      gitManaged: Boolean(gitManaged),
      createdAt: new Date().toISOString(),
    };

    setWorkspaces((prev) => [workspace, ...prev]);
    setActiveWorkspaceId(workspace.id);
    return workspace;
  }

  function updateWorkspace(workspaceId, patch = {}) {
    setWorkspaces((prev) =>
      prev.map((workspace) =>
        workspace.id === workspaceId
          ? {
              ...workspace,
              ...patch,
              repoPath:
                Object.prototype.hasOwnProperty.call(patch, 'repoPath')
                  ? String(patch.repoPath || '').trim()
                  : workspace.repoPath,
              workspacePath:
                Object.prototype.hasOwnProperty.call(patch, 'workspacePath')
                  ? String(patch.workspacePath || '').trim()
                  : workspace.workspacePath,
              remoteUrl:
                Object.prototype.hasOwnProperty.call(patch, 'remoteUrl')
                  ? String(patch.remoteUrl || '').trim()
                  : workspace.remoteUrl,
              gitManaged:
                Object.prototype.hasOwnProperty.call(patch, 'gitManaged')
                  ? Boolean(patch.gitManaged)
                  : workspace.gitManaged,
            }
          : workspace
      )
    );
  }

  return {
    workspaces,
    activeWorkspace,
    activeWorkspaceId,
    setActiveWorkspaceId,
    createWorkspace,
    updateWorkspace,
  };
}
