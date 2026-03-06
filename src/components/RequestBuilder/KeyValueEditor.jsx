import styles from './RequestBuilder.module.css';

function makeRow() {
  return {
    id: `row-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    key: '',
    value: '',
    enabled: true,
  };
}

export function KeyValueEditor({ label, rows = [], onChange, keySuggestions = [], valueSuggestions = [] }) {
  const effectiveRows = rows.length ? rows : [makeRow()];

  function updateRow(index, field, value) {
    onChange(
      effectiveRows.map((row, rowIndex) => {
        if (index !== rowIndex) {
          return row;
        }

        return {
          ...row,
          [field]: value,
        };
      })
    );
  }

  function removeRow(index) {
    const next = effectiveRows.filter((_, rowIndex) => rowIndex !== index);
    onChange(next.length ? next : [makeRow()]);
  }

  return (
    <div className={styles.keyValueWrap}>
      <table className={styles.table}>
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr>
            <th scope="col">Enabled</th>
            <th scope="col">Key</th>
            <th scope="col">Value</th>
            <th scope="col">Action</th>
          </tr>
        </thead>
        <tbody>
          {effectiveRows.map((row, index) => (
            <tr key={row.id || index}>
              <td>
                <input
                  type="checkbox"
                  checked={row.enabled !== false}
                  onChange={(event) => updateRow(index, 'enabled', event.target.checked)}
                  aria-label={`Enable ${label} row ${index + 1}`}
                />
              </td>
              <td>
                <input
                  list={`${label}-keys`}
                  value={row.key}
                  onChange={(event) => updateRow(index, 'key', event.target.value)}
                  aria-label={`${label} key`}
                />
              </td>
              <td>
                <input
                  list={`${label}-values`}
                  value={row.value}
                  onChange={(event) => updateRow(index, 'value', event.target.value)}
                  aria-label={`${label} value`}
                />
              </td>
              <td>
                <button type="button" onClick={() => removeRow(index)} aria-label={`Delete ${label} row ${index + 1}`}>
                  Delete
                </button>
              </td>
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
      <button type="button" className={styles.addRowButton} onClick={() => onChange([...effectiveRows, makeRow()])}>
        Add row
      </button>
    </div>
  );
}
