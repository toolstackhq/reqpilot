import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { gitAdd, gitCommit, gitFetch, gitPull, gitPush, gitStatus } from '../../src/utils/gitClient.js';

describe('gitClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test('posts to git status endpoint', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, branch: 'main' }),
    });

    const result = await gitStatus('/tmp/repo');
    expect(result.branch).toBe('main');
    expect(fetch).toHaveBeenCalledWith(
      '/git/status',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ repoPath: '/tmp/repo' });
  });

  test('uses stderr as fallback error message', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ stderr: 'push failed' }),
    });

    await expect(gitPush('/tmp/repo')).rejects.toThrow('push failed');
  });

  test('falls back to generic error when payload is not json', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error('invalid json');
      },
    });

    await expect(gitFetch('/tmp/repo')).rejects.toThrow('Git command failed (502)');
  });

  test('all helper methods call expected endpoints', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });

    await gitPull('/tmp/repo');
    await gitAdd('/tmp/repo');
    await gitCommit('/tmp/repo', 'message');

    expect(fetch.mock.calls.map((entry) => entry[0])).toEqual(['/git/pull', '/git/add', '/git/commit']);
    expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({ repoPath: '/tmp/repo', message: 'message' });
  });
});
