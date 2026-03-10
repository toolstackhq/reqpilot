import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createProxyApp } from '../../src/server/proxyApp.js';

const proxyPort = 5563;
const proxyUrl = `http://localhost:${proxyPort}`;

let proxy;
let tempRoot;
let remoteBareRepoPath;
let bootstrappedRepoPath = '';
let previousWorkspaceRootEnv;

function runGit(args, cwd) {
  const result = spawnSync('git', args, {
    cwd,
    stdio: 'pipe',
  });

  if (result.status !== 0) {
    const stderr = result.stderr?.toString('utf8') || '';
    const stdout = result.stdout?.toString('utf8') || '';
    throw new Error(`git ${args.join(' ')} failed\n${stdout}\n${stderr}`);
  }

  return {
    stdout: result.stdout?.toString('utf8') || '',
    stderr: result.stderr?.toString('utf8') || '',
  };
}

async function workspaceApi(pathname, payload) {
  const response = await fetch(`${proxyUrl}${pathname}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const body = await response.json();
  return { status: response.status, body };
}

beforeAll(async () => {
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'reqpilot-workspace-test-'));
  remoteBareRepoPath = path.join(tempRoot, 'remote.git');
  fs.mkdirSync(remoteBareRepoPath, { recursive: true });
  runGit(['init', '--bare'], remoteBareRepoPath);

  previousWorkspaceRootEnv = process.env.REQPILOT_WORKSPACES_ROOT;
  process.env.REQPILOT_WORKSPACES_ROOT = path.join(tempRoot, 'workspaces');

  proxy = createProxyApp().listen(proxyPort);
});

afterAll(async () => {
  if (proxy) {
    await new Promise((resolve) => proxy.close(resolve));
  }

  if (typeof previousWorkspaceRootEnv === 'string') {
    process.env.REQPILOT_WORKSPACES_ROOT = previousWorkspaceRootEnv;
  } else {
    delete process.env.REQPILOT_WORKSPACES_ROOT;
  }

  if (tempRoot && fs.existsSync(tempRoot)) {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

describe('workspace api integration', () => {
  test('validates bootstrap payload', async () => {
    const result = await workspaceApi('/workspace/bootstrap', { workspaceId: '', name: '' });
    expect(result.status).toBe(400);
    expect(result.body.ok).toBe(false);
  });

  test('bootstraps managed workspace layout and git repo', async () => {
    const result = await workspaceApi('/workspace/bootstrap', {
      workspaceId: 'ws-e2e-bootstrap',
      name: 'QA Workspace',
    });

    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);
    expect(typeof result.body.repoPath).toBe('string');
    expect(result.body.repoPath).toContain(path.join(tempRoot, 'workspaces'));

    bootstrappedRepoPath = result.body.repoPath;

    expect(fs.existsSync(path.join(bootstrappedRepoPath, '.git'))).toBe(true);
    expect(fs.existsSync(path.join(bootstrappedRepoPath, '.reqpilot', 'workspace.json'))).toBe(true);
    expect(fs.existsSync(path.join(bootstrappedRepoPath, '.reqpilot', 'collections', '.gitkeep'))).toBe(true);
    expect(fs.existsSync(path.join(bootstrappedRepoPath, '.reqpilot', 'environments', '.gitkeep'))).toBe(true);
  });

  test('configures origin and publishes workspace to remote', async () => {
    runGit(['config', 'user.name', 'ReqPilot Test'], bootstrappedRepoPath);
    runGit(['config', 'user.email', 'reqpilot@example.com'], bootstrappedRepoPath);

    const setRemote = await workspaceApi('/workspace/set-remote', {
      repoPath: bootstrappedRepoPath,
      remoteUrl: remoteBareRepoPath,
    });

    expect(setRemote.status).toBe(200);
    expect(setRemote.body.ok).toBe(true);

    const requestPath = path.join(bootstrappedRepoPath, '.reqpilot', 'collections', 'users.json');
    fs.writeFileSync(requestPath, '{"name":"Users"}\n', 'utf8');

    const publish = await workspaceApi('/workspace/publish', {
      repoPath: bootstrappedRepoPath,
      message: 'chore: publish workspace assets',
    });

    expect(publish.status).toBe(200);
    expect(publish.body.ok).toBe(true);

    const refs = runGit(['show-ref'], remoteBareRepoPath);
    expect(refs.stdout).toContain('refs/heads/main');
  });
});
