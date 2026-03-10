import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createProxyApp: vi.fn(),
  exec: vi.fn(),
}));

vi.mock('../../src/server/proxyApp.js', () => ({
  createProxyApp: mocks.createProxyApp,
}));

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    exec: mocks.exec,
    default: {
      ...(actual.default || actual),
      exec: mocks.exec,
    },
  };
});

async function loadStartServer() {
  vi.resetModules();
  const mod = await import('../../server.js');
  return mod.startServer;
}

describe('server start', () => {
  beforeEach(() => {
    mocks.createProxyApp.mockReset();
    mocks.exec.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('starts server without opening browser when disabled', async () => {
    const serverRef = { close: vi.fn() };
    const listen = vi.fn((port, callback) => {
      callback();
      return serverRef;
    });
    mocks.createProxyApp.mockReturnValue({ listen });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const startServer = await loadStartServer();
    const server = startServer({ port: 5601, openBrowser: false });

    expect(server).toBe(serverRef);
    expect(listen).toHaveBeenCalledWith(5601, expect.any(Function));
    expect(mocks.exec).not.toHaveBeenCalled();
    expect(mocks.createProxyApp).toHaveBeenCalledTimes(1);
    logSpy.mockRestore();
  });

  test('opens browser when enabled', async () => {
    const serverRef = { close: vi.fn() };
    const listen = vi.fn((port, callback) => {
      callback();
      return serverRef;
    });
    mocks.createProxyApp.mockReturnValue({ listen });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const startServer = await loadStartServer();
    startServer({ port: 5602, openBrowser: true });

    expect(mocks.exec).toHaveBeenCalledTimes(1);
    expect(String(mocks.exec.mock.calls[0][0])).toContain('http://localhost:5602');
    logSpy.mockRestore();
  });

  test('falls back to dev version banner when package.json cannot be read', async () => {
    const serverRef = { close: vi.fn() };
    const listen = vi.fn((port, callback) => {
      callback();
      return serverRef;
    });
    mocks.createProxyApp.mockReturnValue({ listen });
    vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
      throw new Error('no package');
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const startServer = await loadStartServer();
    startServer({ port: 5603, openBrowser: false });

    const output = logSpy.mock.calls.map((entry) => String(entry[0])).join('\n');
    expect(output).toContain('ReqPilot vdev');
    logSpy.mockRestore();
  });
});
