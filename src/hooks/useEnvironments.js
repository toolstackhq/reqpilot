import { useMemo, useEffect, useState } from 'react';

const STORAGE_KEY = 'reqpilot_environments';
const ACTIVE_KEY = 'reqpilot_active_environment';

function loadData() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    if (parsed.length) return parsed;
  } catch {
    // noop
  }

  return [
    {
      id: 'env-default',
      name: 'dev',
      variables: [],
    },
  ];
}

export function useEnvironments() {
  const [environments, setEnvironments] = useState(() => (typeof window === 'undefined' ? [] : loadData()));
  const [activeId, setActiveId] = useState(() => {
    if (typeof window === 'undefined') return 'env-default';
    return window.localStorage.getItem(ACTIVE_KEY) || 'env-default';
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(environments));
  }, [environments]);

  useEffect(() => {
    window.localStorage.setItem(ACTIVE_KEY, activeId);
  }, [activeId]);

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

  const upsertVariable = (key, value) => {
    setEnvironments((prev) =>
      prev.map((environment) => {
        if (environment.id !== activeEnvironment.id) return environment;

        const existing = environment.variables.find((entry) => entry.key === key);
        if (existing) {
          return {
            ...environment,
            variables: environment.variables.map((entry) =>
              entry.key === key ? { ...entry, value, enabled: true } : entry
            ),
          };
        }

        return {
          ...environment,
          variables: [...environment.variables, { key, value, enabled: true }],
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
    setEnvironments((prev) => [...prev, newEnvironment]);
    setActiveId(newEnvironment.id);
    return newEnvironment;
  };

  const updateActiveVariables = (variables) => {
    setEnvironments((prev) =>
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
    setEnvironments((prev) => [...prev, mapped]);
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
