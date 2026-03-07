import { useState } from 'react';
import { sendProxyRequest } from '../utils/httpClient.js';
import { executeScript } from '../utils/scriptExecutor.js';
import { resolveVariables } from '../utils/variableResolver.js';

function withResolvedVariables(request, variables) {
  const resolved = structuredClone(request);
  resolved.url = resolveVariables(request.url, variables);

  resolved.headers = (request.headers || []).map((entry) => ({
    ...entry,
    value: resolveVariables(entry.value || '', variables),
  }));

  if (resolved.body?.raw) {
    resolved.body.raw = resolveVariables(resolved.body.raw, variables);
  }

  if (resolved.body?.form) {
    resolved.body.form = resolved.body.form.map((entry) => ({
      ...entry,
      value: resolveVariables(entry.value || '', variables),
    }));
  }

  return resolved;
}

function applyAuth(request) {
  const next = structuredClone(request);
  const auth = request.auth || { type: 'none' };
  const enabled = auth.enabled !== false;

  if (!enabled || auth.type === 'none') {
    return next;
  }

  if (auth.type === 'bearer' && auth.token) {
    next.headers.push({ id: `auth-${Date.now()}`, key: 'Authorization', value: `Bearer ${auth.token}`, enabled: true });
  }

  if (auth.type === 'basic' && auth.username) {
    const encoded = btoa(`${auth.username}:${auth.password || ''}`);
    next.headers.push({ id: `auth-${Date.now()}`, key: 'Authorization', value: `Basic ${encoded}`, enabled: true });
  }

  if (auth.type === 'apikey' && auth.key) {
    if (auth.addTo === 'query') {
      const parsed = new URL(next.url);
      parsed.searchParams.set(auth.key, auth.value || '');
      next.url = parsed.toString();
    } else {
      next.headers.push({ id: `auth-${Date.now()}`, key: auth.key, value: auth.value || '', enabled: true });
    }
  }

  return next;
}

export function useRequestSender({ variables, updateVariable, proxyEndpoint = '/proxy' } = {}) {
  const [isSending, setIsSending] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  async function sendRequest(request) {
    const envStore = { ...variables };
    const cloned = applyAuth(withResolvedVariables(request, envStore));

    const start = performance.now();
    setIsSending(true);
    setElapsedMs(0);

    const timer = window.setInterval(() => {
      setElapsedMs(Math.round(performance.now() - start));
    }, 100);

    const pre = executeScript({
      script: request.scripts?.preRequest,
      phase: 'pre-request',
      request: cloned,
      response: null,
      environment: envStore,
    });

    const response = await sendProxyRequest(pre.request, proxyEndpoint);

    const tests = executeScript({
      script: request.scripts?.tests,
      phase: 'tests',
      request: pre.request,
      response,
      environment: envStore,
    });

    const post = executeScript({
      script: request.scripts?.postRequest,
      phase: 'post-request',
      request: pre.request,
      response,
      environment: envStore,
    });

    for (const [key, value] of Object.entries(post.environment)) {
      updateVariable(key, value);
    }

    window.clearInterval(timer);
    setElapsedMs(Math.round(performance.now() - start));
    setIsSending(false);

    return {
      ...response,
      testResults: [...(tests.testResults || []), ...(post.testResults || [])],
      logs: [...pre.logs, ...tests.logs, ...post.logs],
      request: pre.request,
    };
  }

  return { sendRequest, isSending, elapsedMs };
}
