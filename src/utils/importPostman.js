function flattenItems(items = [], depth = 0, parent = []) {
  const rows = [];

  for (const item of items) {
    const nextParent = depth >= 2 ? parent : [...parent, item.name || 'Folder'];

    if (item.item) {
      rows.push(...flattenItems(item.item, depth + 1, nextParent));
      continue;
    }

    rows.push({ ...item, folders: parent.slice(0, 2) });
  }

  return rows;
}

function normalizeUrl(url) {
  if (!url) return '';
  if (typeof url === 'string') return url;
  if (Array.isArray(url.raw)) return url.raw.join('');
  if (url.raw) return url.raw;

  const protocol = url.protocol ? `${url.protocol}://` : '';
  const host = Array.isArray(url.host) ? url.host.join('.') : url.host || '';
  const path = Array.isArray(url.path) ? `/${url.path.join('/')}` : url.path || '';
  return `${protocol}${host}${path}`;
}

function convertScripts(script = '') {
  return script
    .replaceAll('pm.test(', 'rp.test(')
    .replaceAll('pm.expect(', 'rp.expect(')
    .replaceAll('pm.environment.get(', 'rp.env.get(')
    .replaceAll('pm.environment.set(', 'rp.env.set(')
    .replace(/pm\.response\.to\.have\.status\(([^)]+)\)/g, 'rp.expect(rp.response.status).toBe($1)');
}

function extractAuth(auth) {
  if (!auth || !auth.type) return { type: 'none' };

  if (auth.type === 'bearer') {
    return { type: 'bearer', token: auth.bearer?.[0]?.value || '' };
  }

  if (auth.type === 'basic') {
    const username = auth.basic?.find((item) => item.key === 'username')?.value || '';
    const password = auth.basic?.find((item) => item.key === 'password')?.value || '';
    return { type: 'basic', username, password };
  }

  if (auth.type === 'apikey') {
    const key = auth.apikey?.find((item) => item.key === 'key')?.value || 'X-API-Key';
    const value = auth.apikey?.find((item) => item.key === 'value')?.value || '';
    const addTo = auth.apikey?.find((item) => item.key === 'in')?.value === 'query' ? 'query' : 'header';
    return { type: 'apikey', key, value, addTo };
  }

  return { type: 'none' };
}

function extractBody(body = {}) {
  if (!body.mode) {
    return { type: 'none', raw: '', form: [] };
  }

  if (body.mode === 'raw') {
    return {
      type: 'json',
      raw: body.raw || '',
      form: [],
    };
  }

  if (body.mode === 'formdata') {
    return {
      type: 'form-data',
      raw: '',
      form: (body.formdata || []).map((item, index) => ({
        id: `${Date.now()}-${index}`,
        key: item.key || '',
        value: item.value || '',
        enabled: !item.disabled,
      })),
    };
  }

  if (body.mode === 'urlencoded') {
    return {
      type: 'x-www-form-urlencoded',
      raw: '',
      form: (body.urlencoded || []).map((item, index) => ({
        id: `${Date.now()}-${index}`,
        key: item.key || '',
        value: item.value || '',
        enabled: !item.disabled,
      })),
    };
  }

  return { type: 'raw', raw: body.raw || '', form: [] };
}

function requestName(item, request) {
  if (item.name?.trim()) return item.name.trim();
  return `${request.method || 'GET'} ${normalizeUrl(request.url)}`.trim();
}

function dedupeNames(requests = []) {
  const counter = new Map();
  return requests.map((request) => {
    const key = `${request.folders.join('/')}-${request.name}`;
    const value = (counter.get(key) || 0) + 1;
    counter.set(key, value);
    if (value > 1) {
      return { ...request, name: `${request.name} (${value})` };
    }
    return request;
  });
}

export function importPostmanCollection(input) {
  if (!input) {
    return { collection: null, warnings: ['No input provided'] };
  }

  if (input._postman_variable_scope === 'environment') {
    return {
      environment: {
        name: input.name || 'Imported Environment',
        variables: (input.values || []).map((entry) => ({
          key: entry.key,
          value: entry.value,
          enabled: !entry.disabled,
        })),
      },
      warnings: [],
    };
  }

  const rawItems = flattenItems(input.item || []);
  const warnings = [];

  const requests = rawItems
    .map((item, index) => {
      const request = item.request || {};
      const url = normalizeUrl(request.url);
      if (!url) {
        warnings.push(`Skipped empty URL request at index ${index}`);
        return null;
      }

      const events = item.event || [];
      const preRequest = events.find((event) => event.listen === 'prerequest')?.script?.exec?.join('\n') || '';
      const tests = events.find((event) => event.listen === 'test')?.script?.exec?.join('\n') || '';

      return {
        id: `postman-${index}-${Date.now()}`,
        name: requestName(item, request),
        folders: item.folders || [],
        method: (request.method || 'GET').toUpperCase(),
        url,
        params: [],
        headers: (request.header || []).map((header, hIndex) => ({
          id: `hdr-${index}-${hIndex}`,
          key: header.key || '',
          value: header.value || '',
          enabled: !header.disabled,
        })),
        body: extractBody(request.body),
        auth: extractAuth(request.auth || input.auth),
        scripts: {
          preRequest: convertScripts(preRequest),
          tests: convertScripts(tests),
          postRequest: '',
        },
      };
    })
    .filter(Boolean);

  const deduped = dedupeNames(requests);

  const collection = {
    id: `collection-${Date.now()}`,
    name: input.info?.name || 'Imported Postman Collection',
    requests: deduped,
    variables: (input.variable || []).map((entry) => ({
      key: entry.key,
      value: entry.value,
      enabled: true,
    })),
  };

  return { collection, warnings };
}
