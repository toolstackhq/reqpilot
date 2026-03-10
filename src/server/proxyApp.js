import express from 'express';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import os from 'node:os';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

function sanitizeHeaders(headers = {}) {
  return Object.fromEntries(
    Object.entries(headers).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

function resolveRepoPath(repoPath) {
  if (typeof repoPath !== 'string' || !repoPath.trim()) return null;
  const resolved = path.resolve(repoPath.trim());
  if (!fs.existsSync(resolved)) return null;
  const gitPath = path.join(resolved, '.git');
  if (!fs.existsSync(gitPath)) return null;
  return resolved;
}

function runGitCommand(repoPath, args = []) {
  return new Promise((resolve) => {
    const child = spawn('git', args, {
      cwd: repoPath,
      env: process.env,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });

    child.on('error', (error) => {
      resolve({
        ok: false,
        code: 1,
        stdout,
        stderr: error?.message || 'Failed to execute git',
      });
    });

    child.on('close', (code) => {
      resolve({
        ok: code === 0,
        code,
        stdout,
        stderr,
      });
    });
  });
}

export function parseGitStatusOutput(output = '') {
  const lines = String(output || '')
    .split(/\r?\n/g)
    .filter(Boolean);

  const result = {
    branch: '',
    ahead: 0,
    behind: 0,
    changes: [],
    clean: true,
  };

  for (const line of lines) {
    if (line.startsWith('## ')) {
      const branchPart = line.slice(3);
      const [branchName] = branchPart.split('...');
      result.branch = branchName || branchPart;

      const aheadMatch = branchPart.match(/ahead (\d+)/);
      const behindMatch = branchPart.match(/behind (\d+)/);
      result.ahead = aheadMatch ? Number(aheadMatch[1]) : 0;
      result.behind = behindMatch ? Number(behindMatch[1]) : 0;
      continue;
    }

    const code = line.slice(0, 2).trim() || '??';
    const rawPath = line.slice(3).trim();
    const pathPart = rawPath.includes(' -> ') ? rawPath.split(' -> ').at(-1) : rawPath;
    result.changes.push({
      code,
      path: pathPart || rawPath,
    });
  }

  result.clean = result.changes.length === 0;
  return result;
}

function hasGitConflict(result = {}) {
  const combined = `${result.stdout || ''}\n${result.stderr || ''}`;
  return /CONFLICT|Resolve all conflicts|Automatic merge failed/i.test(combined);
}

function joinCommandOutput(result = {}) {
  return [result.stdout, result.stderr]
    .filter(Boolean)
    .map((entry) => String(entry).trim())
    .filter(Boolean)
    .join('\n\n');
}

function safeWorkspaceRoot() {
  const custom = String(process.env.REQPILOT_WORKSPACES_ROOT || '').trim();
  if (custom) return path.resolve(custom);
  return path.join(os.homedir(), '.reqpilot', 'workspaces');
}

function slugifyName(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'workspace';
}

function workspaceFolderName({ workspaceId, name }) {
  const suffix = String(workspaceId || `${Date.now()}`)
    .replace(/[^a-zA-Z0-9]+/g, '')
    .slice(-8)
    .toLowerCase();
  return `${slugifyName(name)}-${suffix || Date.now()}`;
}

function writeFileIfMissing(filePath, content) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
}

function ensureWorkspaceLayout({ workspaceId, name }) {
  const root = safeWorkspaceRoot();
  const folder = workspaceFolderName({ workspaceId, name });
  const workspacePath = path.join(root, folder);
  const reqpilotPath = path.join(workspacePath, '.reqpilot');
  const collectionsPath = path.join(reqpilotPath, 'collections');
  const environmentsPath = path.join(reqpilotPath, 'environments');

  fs.mkdirSync(collectionsPath, { recursive: true });
  fs.mkdirSync(environmentsPath, { recursive: true });

  writeFileIfMissing(path.join(collectionsPath, '.gitkeep'), '');
  writeFileIfMissing(path.join(environmentsPath, '.gitkeep'), '');

  writeFileIfMissing(
    path.join(reqpilotPath, 'workspace.json'),
    `${JSON.stringify(
      {
        id: workspaceId,
        name,
        createdAt: new Date().toISOString(),
      },
      null,
      2
    )}\n`
  );

  writeFileIfMissing(
    path.join(reqpilotPath, 'README.md'),
    [
      '# ReqPilot Workspace',
      '',
      'Git-native API assets for this workspace:',
      '',
      '- `collections/` for request collections',
      '- `environments/` for environment sets',
      '',
      'Use ReqPilot workspace Git actions for fetch/pull/stage/commit/push.',
      '',
    ].join('\n')
  );

  return {
    workspacePath,
    reqpilotPath,
    collectionsPath,
    environmentsPath,
  };
}

async function ensureGitRepoInitialized(repoPath) {
  const gitDir = path.join(repoPath, '.git');
  if (fs.existsSync(gitDir)) {
    return { ok: true, initialized: false, stdout: '', stderr: '' };
  }

  let result = await runGitCommand(repoPath, ['init', '-b', 'main']);
  if (!result.ok) {
    result = await runGitCommand(repoPath, ['init']);
    if (result.ok) {
      await runGitCommand(repoPath, ['branch', '-M', 'main']);
    }
  }

  return {
    ...result,
    initialized: result.ok,
  };
}

async function setOriginRemote(repoPath, remoteUrl) {
  const origin = await runGitCommand(repoPath, ['remote', 'get-url', 'origin']);
  if (origin.ok) {
    return runGitCommand(repoPath, ['remote', 'set-url', 'origin', remoteUrl]);
  }
  return runGitCommand(repoPath, ['remote', 'add', 'origin', remoteUrl]);
}

export async function executeProxyRequest({ method, url, headers, body, security }) {
  const start = performance.now();
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return {
      ok: false,
      error: 'Invalid URL',
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      body: '',
      time: 0,
      size: 0,
    };
  }

  return new Promise((resolve) => {
    const reqHeaders = sanitizeHeaders(headers);
    const normalizedMethod = (method || 'GET').toUpperCase();
    const hasBody = !['GET', 'HEAD'].includes(normalizedMethod) && body !== undefined && body !== null && body !== '';
    const requestBody = hasBody ? (typeof body === 'string' ? body : JSON.stringify(body)) : '';
    const isHttps = parsedUrl.protocol === 'https:';
    const transport = isHttps ? https : http;
    const verifySsl = security?.verifySsl !== false;
    const ca = typeof security?.ca === 'string' && security.ca.trim() ? security.ca : undefined;
    const cert = typeof security?.cert === 'string' && security.cert.trim() ? security.cert : undefined;
    const key = typeof security?.key === 'string' && security.key.trim() ? security.key : undefined;
    const passphrase = typeof security?.passphrase === 'string' ? security.passphrase : undefined;

    const requestOptions = {
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || undefined,
      method: normalizedMethod,
      path: `${parsedUrl.pathname}${parsedUrl.search}`,
      headers: reqHeaders,
      rejectUnauthorized: verifySsl,
      ca,
      cert,
      key,
      passphrase,
    };

    if (hasBody && !requestOptions.headers['Content-Length'] && !requestOptions.headers['content-length']) {
      requestOptions.headers['Content-Length'] = Buffer.byteLength(requestBody, 'utf8');
    }

    const req = transport.request(requestOptions, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const text = buffer.toString('utf8');
        const responseHeaders = Object.fromEntries(
          Object.entries(res.headers).map(([key, value]) => [key, Array.isArray(value) ? value.join(', ') : String(value ?? '')])
        );
        const time = Math.round(performance.now() - start);

        resolve({
          ok: true,
          status: res.statusCode || 0,
          statusText: res.statusMessage || '',
          headers: responseHeaders,
          body: text,
          time,
          size: buffer.length,
        });
      });
    });

    req.setTimeout(30000, () => {
      req.destroy(new Error('Request timed out'));
    });

    req.on('error', (error) => {
      const time = Math.round(performance.now() - start);
      resolve({
        ok: false,
        error: error?.message || 'Request failed',
        status: 502,
        statusText: 'Bad Gateway',
        headers: {},
        body: '',
        time,
        size: 0,
      });
    });

    if (hasBody) {
      req.write(requestBody);
    }

    req.end();
  });
}

export function createProxyApp({ staticDir } = {}) {
  const app = express();
  app.use(express.json({ limit: '20mb' }));

  app.post('/proxy', async (req, res) => {
    const result = await executeProxyRequest(req.body || {});
    const code = result.ok ? 200 : result.status || 500;
    res.status(code).json(result);
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/git/status', async (req, res) => {
    const repoPath = resolveRepoPath(req.body?.repoPath);
    if (!repoPath) {
      res.status(400).json({ ok: false, error: 'Invalid repository path' });
      return;
    }

    const statusResult = await runGitCommand(repoPath, ['status', '--porcelain=1', '--branch']);
    const parsed = parseGitStatusOutput(statusResult.stdout);
    const ok = statusResult.ok;

    res.status(ok ? 200 : 500).json({
      ok,
      repoPath,
      ...parsed,
      stdout: statusResult.stdout,
      stderr: statusResult.stderr,
    });
  });

  app.post('/git/fetch', async (req, res) => {
    const repoPath = resolveRepoPath(req.body?.repoPath);
    if (!repoPath) {
      res.status(400).json({ ok: false, error: 'Invalid repository path' });
      return;
    }

    const result = await runGitCommand(repoPath, ['fetch', '--all', '--prune']);
    res.status(result.ok ? 200 : 500).json(result);
  });

  app.post('/git/pull', async (req, res) => {
    const repoPath = resolveRepoPath(req.body?.repoPath);
    if (!repoPath) {
      res.status(400).json({ ok: false, error: 'Invalid repository path' });
      return;
    }

    const result = await runGitCommand(repoPath, ['pull', '--rebase', '--autostash']);
    const conflict = hasGitConflict(result);
    if (!result.ok && conflict) {
      res.status(409).json({
        ...result,
        conflict: true,
        error: 'Pull conflict detected. Resolve externally and refresh status.',
      });
      return;
    }

    res.status(result.ok ? 200 : 500).json(result);
  });

  app.post('/git/add', async (req, res) => {
    const repoPath = resolveRepoPath(req.body?.repoPath);
    if (!repoPath) {
      res.status(400).json({ ok: false, error: 'Invalid repository path' });
      return;
    }

    const result = await runGitCommand(repoPath, ['add', '-A']);
    res.status(result.ok ? 200 : 500).json(result);
  });

  app.post('/git/commit', async (req, res) => {
    const repoPath = resolveRepoPath(req.body?.repoPath);
    if (!repoPath) {
      res.status(400).json({ ok: false, error: 'Invalid repository path' });
      return;
    }

    const message = String(req.body?.message || '').trim();
    if (!message) {
      res.status(400).json({ ok: false, error: 'Commit message is required' });
      return;
    }

    const result = await runGitCommand(repoPath, ['commit', '-m', message]);
    res.status(result.ok ? 200 : 500).json(result);
  });

  app.post('/git/push', async (req, res) => {
    const repoPath = resolveRepoPath(req.body?.repoPath);
    if (!repoPath) {
      res.status(400).json({ ok: false, error: 'Invalid repository path' });
      return;
    }

    const result = await runGitCommand(repoPath, ['push']);
    res.status(result.ok ? 200 : 500).json(result);
  });

  app.post('/workspace/bootstrap', async (req, res) => {
    const workspaceId = String(req.body?.workspaceId || '').trim();
    const name = String(req.body?.name || '').trim();
    const remoteUrl = String(req.body?.remoteUrl || '').trim();

    if (!workspaceId || !name) {
      res.status(400).json({ ok: false, error: 'workspaceId and name are required' });
      return;
    }

    try {
      const { workspacePath } = ensureWorkspaceLayout({ workspaceId, name });
      const logs = [];
      const warnings = [];

      const initResult = await ensureGitRepoInitialized(workspacePath);
      if (!initResult.ok) {
        res.status(500).json({
          ok: false,
          error: 'Failed to initialize Git repository',
          workspacePath,
          repoPath: workspacePath,
          ...initResult,
        });
        return;
      }
      if (joinCommandOutput(initResult)) logs.push(`git init\n${joinCommandOutput(initResult)}`);

      const addResult = await runGitCommand(workspacePath, ['add', '-A']);
      if (!addResult.ok) {
        res.status(500).json({
          ok: false,
          error: 'Failed to stage workspace files',
          workspacePath,
          repoPath: workspacePath,
          ...addResult,
        });
        return;
      }

      const stagedStatus = await runGitCommand(workspacePath, ['status', '--porcelain']);
      if (stagedStatus.ok && stagedStatus.stdout.trim()) {
        const commitResult = await runGitCommand(workspacePath, ['commit', '-m', 'chore: bootstrap reqpilot workspace']);
        if (!commitResult.ok) {
          warnings.push(
            'Initial commit was not created. Configure Git user.name/user.email and use Publish later.'
          );
          logs.push(`git commit\n${joinCommandOutput(commitResult)}`);
        } else if (joinCommandOutput(commitResult)) {
          logs.push(`git commit\n${joinCommandOutput(commitResult)}`);
        }
      }

      let remoteSet = false;
      let pushed = false;
      if (remoteUrl) {
        const remoteResult = await setOriginRemote(workspacePath, remoteUrl);
        if (!remoteResult.ok) {
          res.status(500).json({
            ok: false,
            error: 'Failed to configure origin remote',
            workspacePath,
            repoPath: workspacePath,
            remoteUrl,
            ...remoteResult,
          });
          return;
        }
        remoteSet = true;
        if (joinCommandOutput(remoteResult)) logs.push(`git remote\n${joinCommandOutput(remoteResult)}`);

        const pushResult = await runGitCommand(workspacePath, ['push', '-u', 'origin', 'HEAD']);
        if (!pushResult.ok) {
          warnings.push('Remote configured but initial push failed. Verify remote access and run Publish again.');
          logs.push(`git push\n${joinCommandOutput(pushResult)}`);
        } else {
          pushed = true;
          if (joinCommandOutput(pushResult)) logs.push(`git push\n${joinCommandOutput(pushResult)}`);
        }
      }

      res.status(200).json({
        ok: true,
        workspacePath,
        repoPath: workspacePath,
        remoteUrl,
        remoteSet,
        pushed,
        warnings,
        output: logs.join('\n\n').trim() || 'Workspace scaffold created.',
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error?.message || 'Failed to bootstrap workspace',
      });
    }
  });

  app.post('/workspace/set-remote', async (req, res) => {
    const repoPath = resolveRepoPath(req.body?.repoPath);
    const remoteUrl = String(req.body?.remoteUrl || '').trim();
    if (!repoPath) {
      res.status(400).json({ ok: false, error: 'Invalid repository path' });
      return;
    }
    if (!remoteUrl) {
      res.status(400).json({ ok: false, error: 'remoteUrl is required' });
      return;
    }

    const result = await setOriginRemote(repoPath, remoteUrl);
    if (!result.ok) {
      res.status(500).json({
        ok: false,
        error: 'Failed to configure origin remote',
        remoteUrl,
        ...result,
      });
      return;
    }

    res.status(200).json({
      ok: true,
      repoPath,
      remoteUrl,
      ...result,
    });
  });

  app.post('/workspace/publish', async (req, res) => {
    const repoPath = resolveRepoPath(req.body?.repoPath);
    const message = String(req.body?.message || '').trim() || 'chore: sync reqpilot workspace';
    if (!repoPath) {
      res.status(400).json({ ok: false, error: 'Invalid repository path' });
      return;
    }

    const remoteCheck = await runGitCommand(repoPath, ['remote', 'get-url', 'origin']);
    if (!remoteCheck.ok) {
      res.status(400).json({
        ok: false,
        error: 'Origin remote is not configured for this workspace',
        ...remoteCheck,
      });
      return;
    }

    const addResult = await runGitCommand(repoPath, ['add', '-A']);
    if (!addResult.ok) {
      res.status(500).json({
        ok: false,
        error: 'Failed to stage files',
        ...addResult,
      });
      return;
    }

    const statusResult = await runGitCommand(repoPath, ['status', '--porcelain']);
    let commitResult = { ok: true, stdout: '', stderr: '' };
    if (statusResult.ok && statusResult.stdout.trim()) {
      commitResult = await runGitCommand(repoPath, ['commit', '-m', message]);
      if (!commitResult.ok) {
        res.status(500).json({
          ok: false,
          error: 'Commit failed. Ensure git user.name/user.email are configured.',
          ...commitResult,
        });
        return;
      }
    }

    const pushResult = await runGitCommand(repoPath, ['push', '-u', 'origin', 'HEAD']);
    if (!pushResult.ok) {
      res.status(500).json({
        ok: false,
        error: 'Push failed. Check remote access/credentials.',
        ...pushResult,
      });
      return;
    }

    res.status(200).json({
      ok: true,
      repoPath,
      message,
      committed: Boolean(statusResult.stdout.trim()),
      stdout: [commitResult.stdout, pushResult.stdout].filter(Boolean).join('\n'),
      stderr: [commitResult.stderr, pushResult.stderr].filter(Boolean).join('\n'),
    });
  });

  if (staticDir) {
    app.use(express.static(staticDir));
    app.get('*', (req, res, next) => {
      if (
        req.path.startsWith('/proxy') ||
        req.path.startsWith('/health') ||
        req.path.startsWith('/git') ||
        req.path.startsWith('/workspace')
      ) {
        return next();
      }
      return res.sendFile(path.join(staticDir, 'index.html'));
    });
  }

  return app;
}
