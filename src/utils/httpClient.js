const BODYLESS_METHODS = new Set(['GET', 'HEAD']);

function buildBody(request) {
  const bodyType = request.body?.type || 'none';

  if (BODYLESS_METHODS.has(request.method?.toUpperCase())) {
    return '';
  }

  if (bodyType === 'none') return '';

  if (bodyType === 'json') return request.body.raw || '';
  if (bodyType === 'raw') return request.body.raw || '';

  if (bodyType === 'x-www-form-urlencoded') {
    const params = new URLSearchParams();
    for (const entry of request.body.form || []) {
      if (entry.enabled !== false && entry.key) {
        params.append(entry.key, entry.value || '');
      }
    }
    return params.toString();
  }

  if (bodyType === 'form-data') {
    return JSON.stringify(
      (request.body.form || []).filter((entry) => entry.enabled !== false).map(({ key, value }) => ({ key, value }))
    );
  }

  return request.body.raw || '';
}

export function buildProxyPayload(request) {
  const headers = Object.fromEntries(
    (request.headers || [])
      .filter((entry) => entry.enabled !== false && entry.key)
      .map((entry) => [entry.key, entry.value || ''])
  );

  return {
    method: request.method,
    url: request.url,
    headers,
    body: buildBody(request),
  };
}

export async function sendProxyRequest(request, endpoint = '/proxy') {
  const payload = buildProxyPayload(request);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!data.ok) {
    return {
      ...data,
      error: data.error || 'Request failed',
    };
  }

  return {
    status: data.status,
    statusText: data.statusText,
    headers: data.headers || {},
    body: data.body || '',
    time: data.time,
    size: data.size,
    error: null,
  };
}
