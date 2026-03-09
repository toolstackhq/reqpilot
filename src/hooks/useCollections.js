import { useEffect, useState } from 'react';

const STORAGE_KEY = 'reqpilot_collections_v2';

function loadCollectionMap() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // noop
  }

  // migration from v1 flat structure
  try {
    const legacy = JSON.parse(window.localStorage.getItem('reqpilot_collections') || '[]');
    if (Array.isArray(legacy)) {
      return { 'ws-personal': legacy };
    }
  } catch {
    // noop
  }

  return {};
}

export function useCollections(workspaceId = 'ws-personal') {
  const [collectionMap, setCollectionMap] = useState(() => (typeof window === 'undefined' ? {} : loadCollectionMap()));
  const collections = collectionMap[workspaceId] || [];

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(collectionMap));
  }, [collectionMap]);

  function updateWorkspaceCollections(updater) {
    setCollectionMap((prev) => {
      const current = prev[workspaceId] || [];
      const nextCollections = updater(current);
      return {
        ...prev,
        [workspaceId]: nextCollections,
      };
    });
  }

  const createCollection = (name) => {
    const collection = { id: `col-${Date.now()}`, name, requests: [] };
    updateWorkspaceCollections((prev) => [collection, ...prev]);
    return collection;
  };

  const saveRequestToCollection = (collectionId, request, name) => {
    updateWorkspaceCollections((prev) =>
      prev.map((collection) => {
        if (collection.id !== collectionId) {
          return collection;
        }

        const newRequest = {
          ...request,
          id: `saved-${Date.now()}`,
          name: name || request.name || `${request.method} ${request.url}`,
        };

        return {
          ...collection,
          requests: [newRequest, ...(collection.requests || [])],
        };
      })
    );
  };

  const importCollection = (collection) => {
    updateWorkspaceCollections((prev) => [collection, ...prev]);
  };

  const replaceAllCollections = (nextCollections) => {
    updateWorkspaceCollections(() => nextCollections);
  };

  return {
    collections,
    createCollection,
    saveRequestToCollection,
    importCollection,
    replaceAllCollections,
  };
}
