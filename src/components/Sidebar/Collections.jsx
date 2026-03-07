import { useEffect, useMemo, useState } from 'react';
import styles from './Sidebar.module.css';
import { CreateCollectionModal } from './CreateCollectionModal.jsx';

export function Collections({
  collections,
  onCreate,
  onLoad,
  onSaveCurrent,
  onExport,
  onOpenImport,
  workspaceMode = false,
}) {
  const [collapsedIds, setCollapsedIds] = useState(() => new Set(collections.map((collection) => collection.id)));
  const [query, setQuery] = useState('');
  const [showCreateCollection, setShowCreateCollection] = useState(false);

  const knownIds = useMemo(() => new Set(collections.map((collection) => collection.id)), [collections]);
  const filteredCollections = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return collections;

    return collections
      .map((collection) => ({
        ...collection,
        requests: (collection.requests || []).filter((request) => {
          const name = (request.name || request.url || '').toLowerCase();
          return name.includes(term);
        }),
      }))
      .filter((collection) => {
        const inCollectionName = collection.name.toLowerCase().includes(term);
        return inCollectionName || collection.requests.length > 0;
      });
  }, [collections, query]);

  useEffect(() => {
    setCollapsedIds((prev) => {
      const next = new Set([...prev].filter((id) => knownIds.has(id)));
      for (const collection of collections) {
        if (!next.has(collection.id)) {
          next.add(collection.id);
        }
      }
      return next;
    });
  }, [collections, knownIds]);

  function isCollapsed(id) {
    return collapsedIds.has(id);
  }

  function toggleCollection(id) {
    setCollapsedIds((prev) => {
      const next = new Set([...prev].filter((entry) => knownIds.has(entry)));
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function openCreateCollection() {
    setShowCreateCollection(true);
  }

  function closeCreateCollection() {
    setShowCreateCollection(false);
  }

  function submitCreateCollection(name) {
    onCreate(name);
    setShowCreateCollection(false);
  }

  return (
    <div className={`${styles.panel} ${workspaceMode ? styles.workspacePanel : ''}`}>
      <header className={styles.header}>
        {workspaceMode ? (
          <div>
            <div className={styles.breadcrumbs}>Personal Workspace &nbsp;›&nbsp; Collections</div>
            <h2 className={styles.workspaceHeading}>Collections</h2>
          </div>
        ) : (
          <h2>Collections</h2>
        )}
        <div className={styles.actions}>
          {workspaceMode ? (
            <>
              <button type="button" onClick={openCreateCollection}>
                + New
              </button>
              <button type="button" onClick={onOpenImport} aria-label="Import collection">
                ⤓
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={openCreateCollection}>
                New
              </button>
              <button type="button" onClick={onSaveCurrent}>
                Save Request
              </button>
              <button type="button" onClick={onExport}>
                Export
              </button>
              <button type="button" onClick={onOpenImport}>
                Import
              </button>
            </>
          )}
        </div>
      </header>

      {workspaceMode ? (
        <div className={styles.searchWrap}>
          <input
            type="text"
            className={styles.searchInput}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            aria-label="Search collections"
          />
        </div>
      ) : null}

      {!filteredCollections.length ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyArt} aria-hidden="true" />
          <p className={styles.emptyTitle}>Collections are empty</p>
          <p className={styles.empty}>Import or create a collection</p>
          <div className={styles.emptyActions}>
            <button type="button" onClick={onOpenImport}>
              Import
            </button>
            <button type="button" onClick={openCreateCollection}>
              Add new
            </button>
          </div>
        </div>
      ) : null}

      <ul className={styles.tree}>
        {filteredCollections.map((collection) => (
          <li key={collection.id}>
            <button
              type="button"
              className={styles.folderButton}
              aria-expanded={!isCollapsed(collection.id)}
              aria-controls={`collection-list-${collection.id}`}
              onClick={() => toggleCollection(collection.id)}
            >
              <span className={`${styles.chevron} ${isCollapsed(collection.id) ? styles.chevronCollapsed : ''}`} aria-hidden="true">
                ▾
              </span>
              <span className={styles.folderIcon} aria-hidden="true" />
              <span className={styles.folderTitle}>{collection.name}</span>
            </button>
            <ul
              id={`collection-list-${collection.id}`}
              className={`${styles.list} ${isCollapsed(collection.id) ? styles.listCollapsed : ''}`}
            >
              {(collection.requests || []).map((request) => (
                <li key={request.id}>
                  <button className={styles.row} type="button" onClick={() => onLoad(request)}>
                    <span className={styles.method}>{request.method}</span>
                    <span className={styles.url}>{request.name || request.url}</span>
                  </button>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      {showCreateCollection ? (
        <CreateCollectionModal onClose={closeCreateCollection} onSubmit={submitCreateCollection} />
      ) : null}
    </div>
  );
}
