import { describe, expect, test } from 'vitest';
import { executeScript } from '../../src/utils/scriptExecutor.js';

function createRequest() {
  return {
    method: 'GET',
    url: 'http://localhost:4444/api/users',
    headers: [],
    body: { type: 'none', raw: '', form: [] },
  };
}

describe('scriptExecutor', () => {
  test('rp.test collects pass/fail results', () => {
    const result = executeScript({
      script: `
        rp.test('pass', () => rp.expect(1).toBe(1));
        rp.test('fail', () => rp.expect(1).toBe(2));
      `,
      request: createRequest(),
      response: { status: 200, body: '{}', headers: {} },
      environment: {},
    });

    expect(result.testResults).toHaveLength(2);
    expect(result.testResults[0].pass).toBe(true);
    expect(result.testResults[1].pass).toBe(false);
  });

  test('expect helpers work', () => {
    const result = executeScript({
      script: `
        rp.test('greater', () => rp.expect(10).toBeGreaterThan(5));
        rp.test('less', () => rp.expect(3).toBeLessThan(4));
        rp.test('property', () => rp.expect({a:1}).toHaveProperty('a'));
        rp.test('contain', () => rp.expect([1,2,3]).toContain(2));
        rp.test('truthy', () => rp.expect(1).toBeTruthy());
        rp.test('falsy', () => rp.expect(null).toBeFalsy());
      `,
      request: createRequest(),
      response: { status: 200, body: '{}', headers: {} },
      environment: {},
    });

    expect(result.testResults.every((entry) => entry.pass)).toBe(true);
  });

  test('env get/set and request header mutation work', () => {
    const request = createRequest();
    const result = executeScript({
      script: `
        rp.env.set('token', 'abc');
        rp.request.headers.set('X-Token', rp.env.get('token'));
      `,
      request,
      response: { status: 200, body: '{}', headers: {} },
      environment: {},
    });

    expect(result.environment.token).toBe('abc');
    expect(result.request.headers.find((entry) => entry.key === 'X-Token')?.value).toBe('abc');
  });

  test('response API and console logs work', () => {
    const result = executeScript({
      script: `
        const body = rp.response.json();
        console.log('name', body.name);
        rp.test('status', () => rp.expect(rp.response.status).toBe(201));
      `,
      request: createRequest(),
      response: { status: 201, body: '{"name":"test"}', headers: { 'x-id': 'a1' } },
      environment: {},
    });

    expect(result.logs[0]).toContain('name');
    expect(result.testResults[0].pass).toBe(true);
  });

  test('syntax errors are captured', () => {
    const result = executeScript({
      script: 'rp.test(',
      request: createRequest(),
      response: { status: 200, body: '{}', headers: {} },
      environment: {},
    });

    expect(result.testResults[0].pass).toBe(false);
  });

  test('infinite loop pattern is blocked', () => {
    const result = executeScript({
      script: 'while(true) {}',
      request: createRequest(),
      response: { status: 200, body: '{}', headers: {} },
      environment: {},
      timeoutMs: 5000,
    });

    expect(result.error).toContain('timed out');
  });
});
