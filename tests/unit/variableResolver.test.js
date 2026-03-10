import { describe, expect, test } from 'vitest';
import { resolveObjectVariables, resolveVariables } from '../../src/utils/variableResolver.js';

describe('variableResolver', () => {
  test('replaces single and multiple variables', () => {
    expect(resolveVariables('https://{{host}}/api/{{version}}', { host: 'example.com', version: 'v2' })).toBe(
      'https://example.com/api/v2'
    );
  });

  test('unknown variable stays intact', () => {
    expect(resolveVariables('Hello {{unknown}}', {})).toBe('Hello {{unknown}}');
  });

  test('nested braces and empty key', () => {
    expect(resolveVariables('{{{var}}}', { var: 'x' })).toBe('{x}');
    expect(resolveVariables('{{}}', { a: 'b' })).toBe('{{}}');
  });

  test('escaped variables are not replaced', () => {
    expect(resolveVariables('\\{{host\\}} {{host}}', { host: 'a' })).toBe('{{host}} a');
  });

  test('case-sensitive', () => {
    expect(resolveVariables('{{Host}} {{host}}', { host: 'a', Host: 'b' })).toBe('b a');
  });

  test('null and undefined pass through unchanged', () => {
    expect(resolveVariables(null, { host: 'a' })).toBeNull();
    expect(resolveVariables(undefined, { host: 'a' })).toBeUndefined();
  });

  test('resolveObjectVariables handles nested objects, arrays and primitives', () => {
    const input = {
      url: 'https://{{host}}/api',
      params: ['{{id}}', 42, true, null],
      nested: {
        token: 'Bearer {{token}}',
      },
    };

    const resolved = resolveObjectVariables(input, {
      host: 'example.com',
      id: '7',
      token: 'abc',
    });

    expect(resolved).toEqual({
      url: 'https://example.com/api',
      params: ['7', 42, true, null],
      nested: {
        token: 'Bearer abc',
      },
    });
  });
});
