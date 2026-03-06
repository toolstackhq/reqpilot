import { describe, expect, test } from 'vitest';
import { buildProxyPayload } from '../../src/utils/httpClient.js';

describe('httpClient', () => {
  test('builds payload and strips disabled headers', () => {
    const payload = buildProxyPayload({
      method: 'POST',
      url: 'http://localhost:4444/api/users',
      headers: [
        { key: 'Content-Type', value: 'application/json', enabled: true },
        { key: 'X-Skip', value: '1', enabled: false },
      ],
      body: { type: 'json', raw: '{"name":"John"}', form: [] },
    });

    expect(payload.headers).toEqual({ 'Content-Type': 'application/json' });
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
  });

  test('empty body for GET', () => {
    const payload = buildProxyPayload({
      method: 'GET',
      url: 'http://localhost:4444/api/users',
      headers: [],
      body: { type: 'json', raw: '{"test":1}' },
    });

    expect(payload.body).toBe('');
  });
});
