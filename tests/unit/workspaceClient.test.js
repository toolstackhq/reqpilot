import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { bootstrapWorkspace, publishWorkspace, setWorkspaceRemote } from '../../src/utils/workspaceClient.js';

describe('workspaceClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test('posts bootstrap payload', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, repoPath: '/tmp/ws' }),
    });

    const result = await bootstrapWorkspace({ workspaceId: 'ws-1', name: 'My Workspace' });
    expect(result.repoPath).toBe('/tmp/ws');
    expect(fetch).toHaveBeenCalledWith(
      '/workspace/bootstrap',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  test('throws workspace-specific error message', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ ok: false, error: 'workspace invalid' }),
    });

    await expect(setWorkspaceRemote('/tmp/ws', '')).rejects.toThrow('workspace invalid');
  });

  test('falls back to generic error message when response body is not json', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('invalid json');
      },
    });

    await expect(publishWorkspace('/tmp/ws', 'sync')).rejects.toThrow('Workspace operation failed (500)');
  });
});
