import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { importPostmanCollection } from '../../src/utils/importPostman.js';

function fixture(name) {
  const filePath = path.resolve('tests/fixtures', name);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

describe('importPostman', () => {
  test('parses v2.1 collection', () => {
    const result = importPostmanCollection(fixture('postman-v2.1-collection.json'));
    expect(result.collection.requests.length).toBeGreaterThan(5);
    expect(result.collection.requests.some((request) => request.auth.type === 'bearer')).toBe(true);
    expect(result.collection.variables).toHaveLength(2);
  });

  test('parses v2.0 collection and fallback names', () => {
    const result = importPostmanCollection(fixture('postman-v2.0-collection.json'));
    expect(result.collection.requests.length).toBe(3);
    expect(result.collection.requests.find((request) => request.name.startsWith('DELETE'))).toBeTruthy();
  });

  test('converts script APIs', () => {
    const result = importPostmanCollection(fixture('postman-v2.1-collection.json'));
    const withTests = result.collection.requests.find((request) => request.scripts.tests);
    expect(withTests.scripts.tests).toContain('rp.test');
  });

  test('parses postman environment file', () => {
    const result = importPostmanCollection(fixture('postman-environment.json'));
    expect(result.environment.variables).toHaveLength(5);
  });

  test('flattens deeply nested folders', () => {
    const result = importPostmanCollection(fixture('postman-deeply-nested.json'));
    expect(result.collection.requests[0].folders.length).toBeLessThanOrEqual(2);
  });
});
