import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { fetchSystemProxyEnv } from '../../src/utils/systemClient.js';

describe('systemClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test('returns normalized proxy values from backend', async () => {
    fetch.mockResolvedValueOnce({
      json: async () => ({
        ok: true,
        proxy: {
          httpProxy: 'http://proxy:8080',
          httpsProxy: 'http://secure-proxy:8443',
          noProxy: 'localhost,127.0.0.1',
        },
      }),
    });

    const result = await fetchSystemProxyEnv();
    expect(result).toEqual({
      available: true,
      httpProxy: 'http://proxy:8080',
      httpsProxy: 'http://secure-proxy:8443',
      noProxy: 'localhost,127.0.0.1',
    });
  });

  test('handles backend unavailable case safely', async () => {
    fetch.mockRejectedValueOnce(new Error('network error'));

    const result = await fetchSystemProxyEnv();
    expect(result).toEqual({
      available: false,
      httpProxy: '',
      httpsProxy: '',
      noProxy: '',
    });
  });

  test('marks unavailable when backend returns ok=false', async () => {
    fetch.mockResolvedValueOnce({
      json: async () => ({
        ok: false,
        proxy: {
          httpProxy: '',
          httpsProxy: '',
          noProxy: '',
        },
      }),
    });

    const result = await fetchSystemProxyEnv();
    expect(result.available).toBe(false);
  });
});
