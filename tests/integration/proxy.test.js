import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createMockServer } from '../mock-server/mock-api-server.js';
import { createProxyApp } from '../../src/server/proxyApp.js';

let mock;
let proxy;
const proxyPort = 5555;
const mockPort = 4445;
const proxyUrl = `http://localhost:${proxyPort}/proxy`;

async function proxyRequest(payload) {
  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return response.json();
}

beforeAll(async () => {
  mock = createMockServer();
  await mock.start(mockPort);
  const app = createProxyApp();
  proxy = app.listen(proxyPort);
});

afterAll(async () => {
  if (mock) {
    await mock.stop();
  }
  if (proxy) {
    await new Promise((resolve) => proxy.close(resolve));
  }
});

describe('proxy integration', () => {
  test('returns system proxy metadata safely', async () => {
    const response = await fetch(`http://localhost:${proxyPort}/system/proxy`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(typeof data.ok).toBe('boolean');
    expect(data.proxy).toBeDefined();
    expect(typeof data.proxy.httpProxy).toBe('string');
    expect(typeof data.proxy.httpsProxy).toBe('string');
    expect(typeof data.proxy.noProxy).toBe('string');
  });

  test('forwards GET request', async () => {
    const data = await proxyRequest({ method: 'GET', url: `http://localhost:${mockPort}/api/users`, headers: {}, body: '' });

    expect(data.ok).toBe(true);
    expect(data.status).toBe(200);
    const parsed = JSON.parse(data.body);
    expect(parsed).toHaveLength(3);
  });

  test('forwards POST json', async () => {
    const data = await proxyRequest({
      method: 'POST',
      url: `http://localhost:${mockPort}/api/users`,
      headers: { 'Content-Type': 'application/json' },
      body: '{"name":"John"}',
    });

    expect(data.status).toBe(201);
    expect(JSON.parse(data.body).name).toBe('John');
  });

  test('forwards custom headers and response headers', async () => {
    const echoed = await proxyRequest({
      method: 'GET',
      url: `http://localhost:${mockPort}/api/echo/headers`,
      headers: { 'X-Custom': 'hello' },
      body: '',
    });

    expect(JSON.parse(echoed.body)['x-custom']).toBe('hello');

    const headers = await proxyRequest({ method: 'GET', url: `http://localhost:${mockPort}/api/headers/custom`, headers: {}, body: '' });
    expect(headers.headers['x-request-id']).toBe('req-001');
  });

  test('handles auth and status code paths', async () => {
    const bearerOk = await proxyRequest({
      method: 'GET',
      url: `http://localhost:${mockPort}/api/auth/bearer`,
      headers: { Authorization: 'Bearer test-token-123' },
      body: '',
    });
    expect(bearerOk.status).toBe(200);

    const unauthorized = await proxyRequest({
      method: 'GET',
      url: `http://localhost:${mockPort}/api/auth/bearer`,
      headers: {},
      body: '',
    });
    expect(unauthorized.status).toBe(401);

    const codes = [200, 204, 400, 500];
    for (const code of codes) {
      const result = await proxyRequest({ method: 'GET', url: `http://localhost:${mockPort}/api/status/${code}`, headers: {}, body: '' });
      expect(result.status).toBe(code);
    }
  });

  test('preserves query params and handles response types', async () => {
    const params = await proxyRequest({
      method: 'GET',
      url: `http://localhost:${mockPort}/api/echo/params?name=john&age=30`,
      headers: {},
      body: '',
    });

    expect(JSON.parse(params.body).params).toEqual({ name: 'john', age: '30' });

    const html = await proxyRequest({ method: 'GET', url: `http://localhost:${mockPort}/api/response/html`, headers: {}, body: '' });
    expect(html.body).toContain('<html>');
  });

  test('measures timing and handles bad urls/errors', async () => {
    const slow = await proxyRequest({ method: 'GET', url: `http://localhost:${mockPort}/api/slow/200`, headers: {}, body: '' });
    expect(slow.time).toBeGreaterThanOrEqual(180);

    const invalid = await proxyRequest({ method: 'GET', url: 'not-a-url', headers: {}, body: '' });
    expect(invalid.ok).toBe(false);
    expect(invalid.error).toContain('Invalid URL');

    const refused = await proxyRequest({ method: 'GET', url: 'http://localhost:9999/nope', headers: {}, body: '' });
    expect(refused.ok).toBe(false);
  });

  test('supports request chaining flow', async () => {
    const login = await proxyRequest({ method: 'POST', url: `http://localhost:${mockPort}/api/chain/login`, headers: {}, body: '' });
    const token = JSON.parse(login.body).token;

    const protectedResponse = await proxyRequest({
      method: 'GET',
      url: `http://localhost:${mockPort}/api/chain/protected`,
      headers: { Authorization: `Bearer ${token}` },
      body: '',
    });

    expect(protectedResponse.status).toBe(200);
    expect(JSON.parse(protectedResponse.body).data).toBe('secret');
  });
});
