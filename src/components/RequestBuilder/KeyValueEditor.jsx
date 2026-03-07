import styles from './RequestBuilder.module.css';

function makeRow() {
  return {
    id: `row-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    key: '',
    value: '',
    enabled: true,
  };
}

function isEmptyRow(row = {}) {
  return !(row.key || '').trim() && !(row.value || '').trim() && !(row.description || '').trim();
}

function normalizeRow(row = {}) {
  return {
    id: row.id || makeRow().id,
    key: row.key || '',
    value: row.value || '',
    description: row.description || '',
    enabled: row.enabled !== false,
  };
}

function withDraftRow(rows = []) {
  const safeRows = rows.length ? rows.map(normalizeRow) : [makeRow()];
  let lastNonEmpty = -1;

  for (let index = 0; index < safeRows.length; index += 1) {
    if (!isEmptyRow(safeRows[index])) {
      lastNonEmpty = index;
    }
  }

  if (lastNonEmpty < 0) {
    return [normalizeRow(safeRows[0])];
  }

  const base = safeRows.slice(0, lastNonEmpty + 1).map(normalizeRow);
  const existingDraft = safeRows[lastNonEmpty + 1];
  const draft = existingDraft && isEmptyRow(existingDraft) ? normalizeRow(existingDraft) : makeRow();
  return [...base, draft];
}

export function KeyValueEditor({ label, mode = 'params', rows = [], onChange, keySuggestions = [], valueSuggestions = [] }) {
  const effectiveRows = withDraftRow(rows);

  const showDescription = mode !== 'body';
  const showActions = mode !== 'headers';

  function updateRow(index, field, value) {
    const updated = effectiveRows.map((row, rowIndex) =>
      index === rowIndex
        ? {
            ...row,
            [field]: value,
          }
        : row
    );
    onChange(withDraftRow(updated));
  }

  function removeRow(index) {
    const next = effectiveRows.filter((_, rowIndex) => rowIndex !== index);
    onChange(withDraftRow(next));
  }

  function clearRows() {
    onChange(withDraftRow([]));
  }

  return (
    <div className={styles.keyValueWrap}>
      <header className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>{label}</h3>
        <div className={styles.sectionActions}>
          <button className={styles.iconButton} type="button" aria-label={`${label} help`}>
            <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <path d="M12 17h.01" />
            </svg>
          </button>
          <button className={styles.iconButton} type="button" aria-label={`Clear ${label}`} onClick={clearRows}>
            <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
          </button>
        </div>
      </header>
      <table className={styles.kvTable}>
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr>
            <th scope="col" className={styles.gripHeader}>
              <span className="sr-only">Row</span>
            </th>
            <th scope="col">Key</th>
            <th scope="col">Value</th>
            {showDescription ? <th scope="col">Description</th> : null}
            {showActions ? <th scope="col" className={styles.actionsHeader}>Action</th> : null}
          </tr>
        </thead>
        <tbody>
          {effectiveRows.map((row, index) => (
            <tr key={row.id || index}>
              <td className={styles.gripCell}>
                <button type="button" className={styles.gripButton} aria-label={`Reorder ${label} row ${index + 1}`}>
                  ⋮⋮
                </button>
              </td>
              <td>
                <input
                  list={`${label}-keys`}
                  value={row.key}
                  placeholder="Key"
                  onChange={(event) => updateRow(index, 'key', event.target.value)}
                  aria-label={`${label} key`}
                />
              </td>
              <td>
                <input
                  list={`${label}-values`}
                  value={row.value}
                  placeholder="Value"
                  onChange={(event) => updateRow(index, 'value', event.target.value)}
                  aria-label={`${label} value`}
                />
              </td>
              {showDescription ? (
                <td>
                  <input
                    value={row.description || ''}
                    placeholder="Description"
                    onChange={(event) => updateRow(index, 'description', event.target.value)}
                    aria-label={`${label} description`}
                  />
                </td>
              ) : null}
              {showActions ? (
                <td className={styles.rowActions}>
                  <button
                    type="button"
                    className={styles.actionOk}
                    onClick={() => onChange(withDraftRow(effectiveRows))}
                    aria-label={`Commit ${label} row ${index + 1}`}
                  >
                    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </button>
                  <button type="button" className={styles.actionDelete} onClick={() => removeRow(index)} aria-label={`Delete ${label} row ${index + 1}`}>
                    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
      {!!keySuggestions.length && (
        <datalist id={`${label}-keys`}>
          {keySuggestions.map((entry) => (
            <option key={entry} value={entry} />
          ))}
        </datalist>
      )}
      {!!valueSuggestions.length && (
        <datalist id={`${label}-values`}>
          {valueSuggestions.map((entry) => (
            <option key={entry} value={entry} />
          ))}
        </datalist>
      )}
    </div>
  );
}
