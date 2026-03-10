#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createProxyApp } from './src/server/proxyApp.js';

export function startServer({
  port = Number(process.env.PORT) || 5489,
  openBrowser = process.env.REQPILOT_NO_OPEN !== '1',
} = {}) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const app = createProxyApp({ staticDir: path.resolve(here, 'dist') });
  const server = app.listen(port, () => {
    console.log('┌──────────────────────────────────────┐');
    console.log('│  ReqPilot v1.0.0                     │');
    console.log(`│  Running on http://localhost:${port}      │`);
    console.log('└──────────────────────────────────────┘');

    if (openBrowser) {
      const url = `http://localhost:${port}`;
      const cmd =
        process.platform === 'darwin'
          ? `open ${url}`
          : process.platform === 'win32'
            ? `start ${url}`
            : `xdg-open ${url}`;
      exec(cmd, () => {});
    }
  });

  return server;
}

const current = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1];

if (invokedPath) {
  try {
    const resolvedInvoked = fs.realpathSync(path.resolve(invokedPath));
    const resolvedCurrent = fs.realpathSync(current);
    if (resolvedInvoked === resolvedCurrent) {
      startServer();
    }
  } catch {
    // Fallback to previous behavior if symlink resolution fails.
    if (path.resolve(invokedPath) === current) {
      startServer();
    }
  }
}
