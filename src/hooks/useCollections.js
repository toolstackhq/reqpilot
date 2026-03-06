import { useEffect, useState } from 'react';

const STORAGE_KEY = 'reqpilot_collections';

function loadCollections() {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function useCollections() {
  const [collections, setCollections] = useState(() => (typeof window === 'undefined' ? [] : loadCollections()));

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(collections));
  }, [collections]);

  const createCollection = (name) => {
    const collection = { id: `col-${Date.now()}`, name, requests: [] };
    setCollections((prev) => [collection, ...prev]);
    return collection;
  };

  const saveRequestToCollection = (collectionId, request, name) => {
    setCollections((prev) =>
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
    setCollections((prev) => [collection, ...prev]);
  };

  const replaceAllCollections = (nextCollections) => {
    setCollections(nextCollections);
  };

  return {
    collections,
    createCollection,
    saveRequestToCollection,
    importCollection,
    replaceAllCollections,
  };
}
