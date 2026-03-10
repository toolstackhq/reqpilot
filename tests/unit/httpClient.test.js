import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { buildProxyPayload, getDefaultHeadersPreview, sendProxyRequest } from '../../src/utils/httpClient.js';

describe('httpClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test('builds payload, strips disabled headers, and keeps explicit headers', () => {
    const payload = buildProxyPayload({
      method: 'POST',
      url: 'http://localhost:4444/api/users',
      headers: [
        { key: 'Content-Type', value: 'application/json', enabled: true },
        { key: 'X-Skip', value: '1', enabled: false },
      ],
      body: { type: 'json', raw: '{"name":"John"}', form: [] },
    });

    expect(payload.headers).toEqual({ 'Content-Type': 'application/json', Accept: '*/*' });
    expect(payload.body).toBe('{"name":"John"}');
  });

  test('serializes form-urlencoded body', () => {
    const payload = buildProxyPayload({
      method: 'POST',
      url: 'http://localhost:4444/api/echo/form',
      headers: [],
      body: {
        type: 'x-www-form-urlencoded',
        form: [
          { key: 'foo', value: 'bar', enabled: true },
          { key: 'baz', value: 'qux', enabled: true },
        ],
      },
    });

    expect(payload.body).toBe('foo=bar&baz=qux');
    expect(payload.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    expect(payload.headers.Accept).toBe('*/*');
  });

  test('serializes form-data body rows to json payload', () => {
    const payload = buildProxyPayload({
      method: 'POST',
      url: 'http://localhost:4444/api/upload',
      headers: [],
      body: {
        type: 'form-data',
        form: [
          { key: 'name', value: 'ava', enabled: true },
          { key: 'skip', value: 'x', enabled: false },
        ],
      },
    });

    expect(payload.body).toBe('[{"key":"name","value":"ava"}]');
    expect(payload.headers.Accept).toBe('*/*');
  });

  test('empty body for GET', () => {
    const payload = buildProxyPayload({
      method: 'GET',
      url: 'http://localhost:4444/api/users',
      headers: [],
      body: { type: 'json', raw: '{"test":1}' },
    });

    expect(payload.body).toBe('');
    expect(payload.headers).toEqual({ Accept: '*/*' });
  });

  test('adds default json content-type and accept when user did not provide headers', () => {
    const payload = buildProxyPayload({
      method: 'POST',
      url: 'http://localhost:4444/api/users',
      headers: [],
      body: { type: 'json', raw: '{"hello":"world"}', form: [] },
    });

    expect(payload.headers['Content-Type']).toBe('application/json');
    expect(payload.headers.Accept).toBe('*/*');
  });

  test('adds text/plain content type for raw body by default', () => {
    const payload = buildProxyPayload({
      method: 'POST',
      url: 'http://localhost:4444/api/raw',
      headers: [],
      body: { type: 'raw', raw: 'hello' },
    });

    expect(payload.headers['Content-Type']).toBe('text/plain');
    expect(payload.body).toBe('hello');
  });

  test('does not override user supplied accept header', () => {
    const payload = buildProxyPayload({
      method: 'POST',
      url: 'http://localhost:4444/api/users',
      headers: [{ key: 'accept', value: 'application/json', enabled: true }],
      body: { type: 'json', raw: '{"hello":"world"}', form: [] },
    });

    expect(payload.headers.accept).toBe('application/json');
    expect(payload.headers.Accept).toBeUndefined();
  });

  test('forwards tls materials in security payload when present', () => {
    const payload = buildProxyPayload(
      {
        method: 'GET',
        url: 'https://localhost:4444/secure',
        headers: [],
        body: { type: 'none', raw: '', form: [] },
      },
      {
        verifySsl: true,
        ca: '  -----BEGIN CERTIFICATE-----A  ',
        cert: '  -----BEGIN CERTIFICATE-----B  ',
        key: '  -----BEGIN PRIVATE KEY-----C  ',
        passphrase: 'secret',
      }
    );

    expect(payload.security.verifySsl).toBe(true);
    expect(payload.security.useProxy).toBe(true);
    expect(payload.security.ca).toContain('BEGIN CERTIFICATE');
    expect(payload.security.cert).toContain('BEGIN CERTIFICATE');
    expect(payload.security.key).toContain('BEGIN PRIVATE KEY');
    expect(payload.security.passphrase).toBe('secret');
  });

  test('allows disabling system proxy forwarding in security payload', () => {
    const payload = buildProxyPayload(
      {
        method: 'GET',
        url: 'https://localhost:4444/secure',
        headers: [],
        body: { type: 'none', raw: '', form: [] },
      },
      {
        verifySsl: true,
        useProxy: false,
      }
    );

    expect(payload.security.verifySsl).toBe(true);
    expect(payload.security.useProxy).toBe(false);
  });

  test('returns default header preview for json post', () => {
    const defaults = getDefaultHeadersPreview({
      method: 'POST',
      url: 'http://localhost:4444/api/users',
      headers: [],
      body: { type: 'json', raw: '{"hello":"world"}', form: [] },
    });

    expect(defaults).toEqual([
      { key: 'Accept', value: '*/*' },
      { key: 'Content-Type', value: 'application/json' },
    ]);
  });

  test('default header preview excludes user-overridden headers', () => {
    const defaults = getDefaultHeadersPreview({
      method: 'POST',
      url: 'http://localhost:4444/api/users',
      headers: [
        { key: 'accept', value: 'application/json', enabled: true },
        { key: 'Content-Type', value: 'application/custom', enabled: true },
      ],
      body: { type: 'json', raw: '{"hello":"world"}', form: [] },
    });

    expect(defaults).toEqual([]);
  });

  test('auto-generated header rows are ignored as user headers', () => {
    const payload = buildProxyPayload({
      method: 'POST',
      url: 'http://localhost:4444/api/users',
      headers: [
        { key: 'Accept', value: 'text/plain', enabled: true, autoGenerated: true },
        { key: 'Content-Type', value: 'application/custom', enabled: true, autoGenerated: true },
      ],
      body: { type: 'json', raw: '{"hello":"world"}', form: [] },
    });

    expect(payload.headers.Accept).toBe('*/*');
    expect(payload.headers['Content-Type']).toBe('application/json');
  });

  test('sendProxyRequest returns normalized error object when backend fails', async () => {
    fetch.mockResolvedValueOnce({
      json: async () => ({ ok: false, status: 502 }),
    });

    const result = await sendProxyRequest(
      {
        method: 'GET',
        url: 'http://localhost:4444/api/users',
        headers: [],
        body: { type: 'none' },
      },
      '/proxy',
      {}
    );

    expect(result.error).toBe('Request failed');
    expect(result.status).toBe(502);
  });

  test('sendProxyRequest maps successful response defaults', async () => {
    fetch.mockResolvedValueOnce({
      json: async () => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: null,
        body: '',
        time: 10,
        size: 20,
      }),
    });

    const result = await sendProxyRequest(
      {
        method: 'GET',
        url: 'http://localhost:4444/api/users',
        headers: [],
        body: { type: 'none' },
      },
      '/proxy',
      {}
    );

    expect(result).toEqual({
      status: 200,
      statusText: 'OK',
      headers: {},
      body: '',
      time: 10,
      size: 20,
      error: null,
    });
  });
});
