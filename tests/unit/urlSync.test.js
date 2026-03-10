import { describe, expect, test } from 'vitest';
import { applyParamsToUrl, parseParamsFromUrl } from '../../src/utils/urlSync.js';

describe('urlSync', () => {
  test('parses url query params into rows', () => {
    const rows = parseParamsFromUrl('https://api.example.com/users?status=active&page=2');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ key: 'status', value: 'active', enabled: true });
    expect(rows[1]).toMatchObject({ key: 'page', value: '2', enabled: true });
  });

  test('returns empty list for invalid url', () => {
    expect(parseParamsFromUrl('not-a-url')).toEqual([]);
  });

  test('applies enabled params and skips empty/disabled ones', () => {
    const url = applyParamsToUrl('https://api.example.com/users?stale=true', [
      { key: 'status', value: 'active', enabled: true },
      { key: 'debug', value: '1', enabled: false },
      { key: '', value: 'ignored', enabled: true },
    ]);

    expect(url).toBe('https://api.example.com/users?status=active');
  });

  test('returns original url when base url is invalid', () => {
    expect(applyParamsToUrl('bad-url', [{ key: 'x', value: '1', enabled: true }])).toBe('bad-url');
  });
});
