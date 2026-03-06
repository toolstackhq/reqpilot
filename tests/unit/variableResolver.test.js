import { describe, expect, test } from 'vitest';
import { resolveVariables } from '../../src/utils/variableResolver.js';

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
});
