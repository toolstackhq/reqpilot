import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createProxyApp } from '../../src/server/proxyApp.js';

const proxyPort = 5562;
const proxyUrl = `http://localhost:${proxyPort}`;
let proxy;
let repoDir;

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
}

async function gitApi(pathname, payload) {
  const response = await fetch(`${proxyUrl}${pathname}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const body = await response.json();
  return { status: response.status, body };
}

beforeAll(async () => {
  repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reqpilot-git-test-'));
  runGit(['init'], repoDir);
  runGit(['config', 'user.name', 'ReqPilot Test'], repoDir);
  runGit(['config', 'user.email', 'reqpilot@example.com'], repoDir);

  fs.writeFileSync(path.join(repoDir, 'notes.txt'), 'one\n', 'utf8');
  runGit(['add', '-A'], repoDir);
  runGit(['commit', '-m', 'initial'], repoDir);

  proxy = createProxyApp().listen(proxyPort);
});

afterAll(async () => {
  if (proxy) {
    await new Promise((resolve) => proxy.close(resolve));
  }

  if (repoDir && fs.existsSync(repoDir)) {
    fs.rmSync(repoDir, { recursive: true, force: true });
  }
});

describe('git api integration', () => {
  test('returns status for valid repositories', async () => {
    const result = await gitApi('/git/status', { repoPath: repoDir });

    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);
    expect(result.body.clean).toBe(true);
    expect(typeof result.body.branch).toBe('string');
  });

  test('stage + commit flow works through API', async () => {
    fs.writeFileSync(path.join(repoDir, 'notes.txt'), `updated-${Date.now()}\n`, 'utf8');

    const dirty = await gitApi('/git/status', { repoPath: repoDir });
    expect(dirty.body.clean).toBe(false);

    const staged = await gitApi('/git/add', { repoPath: repoDir });
    expect(staged.status).toBe(200);
    expect(staged.body.ok).toBe(true);

    const committed = await gitApi('/git/commit', {
      repoPath: repoDir,
      message: 'api commit',
    });
    expect(committed.status).toBe(200);
    expect(committed.body.ok).toBe(true);

    const clean = await gitApi('/git/status', { repoPath: repoDir });
    expect(clean.body.clean).toBe(true);
  });

  test('validates input for bad repo path and missing commit message', async () => {
    const badRepo = await gitApi('/git/status', { repoPath: '/tmp/not-a-git-repo' });
    expect(badRepo.status).toBe(400);

    const missingMessage = await gitApi('/git/commit', { repoPath: repoDir, message: '' });
    expect(missingMessage.status).toBe(400);
  });
});
