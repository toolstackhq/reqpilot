import { useMemo, useEffect, useState } from 'react';

const STORAGE_KEY = 'reqpilot_environments_v2';
const ACTIVE_KEY = 'reqpilot_active_environment_v2';

function defaultEnvironment() {
  return {
    id: 'env-default',
    name: 'dev',
    variables: [],
  };
}

function normalizeEnvironment(environment = {}, index = 0) {
  return {
    id: environment.id || `env-${Date.now()}-${index}`,
    name: environment.name || `Environment ${index + 1}`,
    variables: Array.isArray(environment.variables) ? environment.variables : [],
  };
}

function loadEnvironmentMap() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.fromEntries(
        Object.entries(parsed).map(([workspaceId, environments]) => [
          workspaceId,
          Array.isArray(environments) && environments.length
            ? environments.map(normalizeEnvironment)
            : [defaultEnvironment()],
        ])
      );
    }
  } catch {
    // noop
  }

  try {
    const legacy = JSON.parse(window.localStorage.getItem('reqpilot_environments') || '[]');
    if (Array.isArray(legacy) && legacy.length) {
      return { 'ws-personal': legacy.map(normalizeEnvironment) };
    }
  } catch {
    // noop
  }

  return { 'ws-personal': [defaultEnvironment()] };
}

function loadActiveEnvironmentMap() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(ACTIVE_KEY) || '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // noop
  }

  try {
    const legacy = window.localStorage.getItem('reqpilot_active_environment');
    if (legacy) {
      return { 'ws-personal': legacy };
    }
  } catch {
    // noop
  }

  return { 'ws-personal': 'env-default' };
}

export function useEnvironments(workspaceId = 'ws-personal') {
  const [environmentMap, setEnvironmentMap] = useState(() =>
    typeof window === 'undefined' ? { [workspaceId]: [defaultEnvironment()] } : loadEnvironmentMap()
  );
  const [activeIdMap, setActiveIdMap] = useState(() =>
    typeof window === 'undefined' ? { [workspaceId]: 'env-default' } : loadActiveEnvironmentMap()
  );

  const environments = environmentMap[workspaceId] || [defaultEnvironment()];
  const activeId = activeIdMap[workspaceId] || environments[0]?.id || 'env-default';

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(environmentMap));
  }, [environmentMap]);

  useEffect(() => {
    window.localStorage.setItem(ACTIVE_KEY, JSON.stringify(activeIdMap));
  }, [activeIdMap]);

  useEffect(() => {
    if (environments.length === 0) {
      setEnvironmentMap((prev) => ({
        ...prev,
        [workspaceId]: [defaultEnvironment()],
      }));
      setActiveIdMap((prev) => ({
        ...prev,
        [workspaceId]: 'env-default',
      }));
      return;
    }

    if (!environments.some((environment) => environment.id === activeId)) {
      setActiveIdMap((prev) => ({
        ...prev,
        [workspaceId]: environments[0].id,
      }));
    }
  }, [workspaceId, environments, activeId]);

  const activeEnvironment = useMemo(
    () => environments.find((environment) => environment.id === activeId) || environments[0],
    [activeId, environments]
  );

  const activeVariablesMap = useMemo(
    () =>
      Object.fromEntries(
        (activeEnvironment?.variables || [])
          .filter((entry) => entry.enabled !== false)
          .map((entry) => [entry.key, entry.value])
      ),
    [activeEnvironment]
  );

  function updateWorkspaceEnvironments(updater) {
    setEnvironmentMap((prev) => {
      const current = prev[workspaceId] || [defaultEnvironment()];
      const next = updater(current);
      return {
        ...prev,
        [workspaceId]: next.length ? next : [defaultEnvironment()],
      };
    });
  }

  const setActiveId = (nextActiveId) => {
    setActiveIdMap((prev) => ({
      ...prev,
      [workspaceId]: nextActiveId,
    }));
  };

  const upsertVariable = (key, value) => {
    if (!activeEnvironment) return;

    updateWorkspaceEnvironments((prev) =>
      prev.map((environment) => {
        if (environment.id !== activeEnvironment.id) return environment;

        const existing = (environment.variables || []).find((entry) => entry.key === key);
        if (existing) {
          return {
            ...environment,
            variables: (environment.variables || []).map((entry) =>
              entry.key === key ? { ...entry, value, enabled: true } : entry
            ),
          };
        }

        return {
          ...environment,
          variables: [...(environment.variables || []), { key, value, enabled: true }],
        };
      })
    );
  };

  const createEnvironment = (name) => {
    const newEnvironment = {
      id: `env-${Date.now()}`,
      name,
      variables: [],
    };

    updateWorkspaceEnvironments((prev) => [...prev, newEnvironment]);
    setActiveId(newEnvironment.id);
    return newEnvironment;
  };

  const updateActiveVariables = (variables) => {
    if (!activeEnvironment) return;

    updateWorkspaceEnvironments((prev) =>
      prev.map((environment) =>
        environment.id === activeEnvironment.id ? { ...environment, variables } : environment
      )
    );
  };

  const importEnvironment = (environment) => {
    const mapped = {
      id: `env-${Date.now()}`,
      name: environment.name || 'Imported Environment',
      variables: environment.variables || [],
    };

    updateWorkspaceEnvironments((prev) => [...prev, mapped]);
  };

  return {
    environments,
    activeId,
    setActiveId,
    activeEnvironment,
    activeVariablesMap,
    upsertVariable,
    createEnvironment,
    updateActiveVariables,
    importEnvironment,
  };
}
