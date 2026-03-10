function normalizeProxyPayload(payload = {}) {
  return {
    available: payload.ok !== false,
    httpProxy: String(payload?.proxy?.httpProxy || ''),
    httpsProxy: String(payload?.proxy?.httpsProxy || ''),
    noProxy: String(payload?.proxy?.noProxy || ''),
  };
}

export async function fetchSystemProxyEnv() {
  try {
    const response = await fetch('/system/proxy');
    const data = await response.json().catch(() => ({}));
    return normalizeProxyPayload(data);
  } catch {
    return {
      available: false,
      httpProxy: '',
      httpsProxy: '',
      noProxy: '',
    };
  }
}
