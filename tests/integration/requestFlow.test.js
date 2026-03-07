import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createMockServer } from '../mock-server/mock-api-server.js';
import { createProxyApp } from '../../src/server/proxyApp.js';
import { resolveVariables } from '../../src/utils/variableResolver.js';
import { executeScript } from '../../src/utils/scriptExecutor.js';

let mock;
let proxy;
const proxyUrl = 'http://localhost:5556/proxy';
const mockPort = 4446;

beforeAll(async () => {
  mock = createMockServer();
  await mock.start(mockPort);
  proxy = createProxyApp().listen(5556);
});

afterAll(async () => {
  if (mock) {
    await mock.stop();
  }
  if (proxy) {
    await new Promise((resolve) => proxy.close(resolve));
  }
});

async function sendViaProxy(payload) {
  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return response.json();
}

describe('request flow integration', () => {
  test('resolves variables in URL before call', async () => {
    const url = resolveVariables('{{baseUrl}}/api/users', { baseUrl: `http://localhost:${mockPort}` });
    const result = await sendViaProxy({ method: 'GET', url, headers: {}, body: '' });
    expect(result.status).toBe(200);
  });

  test('pre-request modifies headers and URL', async () => {
    const request = {
      method: 'GET',
      url: `http://localhost:${mockPort}/api/echo/headers`,
      headers: [],
      body: { type: 'none', raw: '', form: [] },
    };

    const pre = executeScript({
      script: `
        rp.request.headers.set('X-Dynamic', '123');
        rp.request.url = 'http://localhost:${mockPort}/api/echo/headers';
      `,
      phase: 'pre-request',
      request,
      response: null,
      environment: {},
    });

    const proxied = await sendViaProxy({
      method: pre.request.method,
      url: pre.request.url,
      headers: Object.fromEntries(pre.request.headers.map((h) => [h.key, h.value])),
      body: '',
    });

    expect(JSON.parse(proxied.body)['x-dynamic']).toBe('123');
  });

  test('test and post scripts run after response', async () => {
    const env = {};
    const response = await sendViaProxy({
      method: 'POST',
      url: `http://localhost:${mockPort}/api/chain/login`,
      headers: {},
      body: '',
    });

    const tests = executeScript({
      script: `
        rp.test('status', () => rp.expect(rp.response.status).toBe(200));
      `,
      phase: 'tests',
      request: { method: 'POST', url: '', headers: [], body: {} },
      response,
      environment: env,
    });

    const post = executeScript({
      script: `
        const body = rp.response.json();
        rp.test('post-status', () => rp.expect(rp.response.status).toBe(200));
        rp.env.set('token', body.token);
      `,
      phase: 'post-request',
      request: { method: 'POST', url: '', headers: [], body: {} },
      response,
      environment: tests.environment,
    });

    expect(tests.testResults[0].pass).toBe(true);
    expect(post.testResults[0].pass).toBe(true);
    expect(post.environment.token).toBe('jwt-token-xyz-123');
  });

  test('script errors do not block response handling', async () => {
    const response = await sendViaProxy({
      method: 'GET',
      url: `http://localhost:${mockPort}/api/users`,
      headers: {},
      body: '',
    });
    const tests = executeScript({
      script: `
        rp.test('throws', () => { throw new Error('bad'); });
      `,
      phase: 'tests',
      request: { method: 'GET', url: '', headers: [], body: {} },
      response,
      environment: {},
    });

    expect(response.status).toBe(200);
    expect(tests.testResults[0].pass).toBe(false);
  });
});
