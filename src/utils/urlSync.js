function normalizeRow(row, index = 0) {
  return {
    id: row.id || `row-${Date.now()}-${index}`,
    key: row.key || '',
    value: row.value || '',
    enabled: row.enabled !== false,
  };
}

export function parseParamsFromUrl(url) {
  try {
    const parsed = new URL(url);
    return [...parsed.searchParams.entries()].map(([key, value], index) =>
      normalizeRow({ key, value, enabled: true }, index)
    );
  } catch {
    return [];
  }
}

export function applyParamsToUrl(url, params = []) {
  try {
    const parsed = new URL(url);
    parsed.search = '';

    for (const row of params) {
      if (row.enabled !== false && row.key) {
        parsed.searchParams.append(row.key, row.value || '');
      }
    }

    return parsed.toString();
  } catch {
    return url;
  }
}
