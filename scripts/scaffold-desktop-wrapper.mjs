#!/usr/bin/env node
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function parseArgs(argv) {
  const options = {
    outDir: 'desktop-wrapper',
    port: 5490,
    force: false,
    skipBuild: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];

    if (value === '--out' && argv[i + 1]) {
      options.outDir = argv[i + 1];
      i += 1;
      continue;
    }

    if (value === '--port' && argv[i + 1]) {
      const port = Number(argv[i + 1]);
      if (!Number.isNaN(port) && port > 0) {
        options.port = port;
      }
      i += 1;
      continue;
    }

    if (value === '--force') {
      options.force = true;
      continue;
    }

    if (value === '--skip-build') {
      options.skipBuild = true;
      continue;
    }

    if (value === '--help' || value === '-h') {
      console.log(`
ReqPilot desktop wrapper scaffold

Usage:
  npm run scaffold:desktop-wrapper -- [--out <dir>] [--port <port>] [--force] [--skip-build]

Options:
  --out <dir>      Output folder for wrapper project (default: desktop-wrapper)
  --port <port>    Local port used by embedded proxy/static server (default: 5490)
  --force          Overwrite output directory if it already exists
  --skip-build     Skip running ReqPilot web build before scaffold
`);
      process.exit(0);
    }
  }

  return options;
}

async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function ensureCleanDir(target, force) {
  if (!(await pathExists(target))) {
    await fs.mkdir(target, { recursive: true });
    return;
  }

  const entries = await fs.readdir(target);
  if (entries.length === 0) {
    return;
  }

  if (!force) {
    throw new Error(`Output directory is not empty: ${target}. Use --force to overwrite.`);
  }

  await fs.rm(target, { recursive: true, force: true });
  await fs.mkdir(target, { recursive: true });
}

async function copyDir(source, destination) {
  await fs.mkdir(destination, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      const sourcePath = path.join(source, entry.name);
      const destinationPath = path.join(destination, entry.name);

      if (entry.isDirectory()) {
        await copyDir(sourcePath, destinationPath);
        return;
      }

      if (entry.isFile()) {
        await fs.copyFile(sourcePath, destinationPath);
      }
    })
  );
}

function runBuild(projectRoot) {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(npmCommand, ['run', 'build'], {
    cwd: projectRoot,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error('ReqPilot web build failed. Fix build errors and run scaffold again.');
  }
}

function createPackageJsonTemplate(port) {
  return JSON.stringify(
    {
      name: 'reqpilot-desktop-wrapper',
      private: true,
      version: '0.1.0',
      description: 'Desktop shell for ReqPilot (generated scaffold)',
      homepage: 'https://toolstackhq.github.io/reqpilot/',
      author: {
        name: 'ReqPilot Team',
        email: 'support@reqpilot.dev',
      },
      main: 'electron/main.cjs',
      scripts: {
        'sync:reqpilot': 'node scripts/sync-reqpilot.mjs',
        dev: 'npm run sync:reqpilot && electron .',
        dist: 'npm run sync:reqpilot && electron-builder',
        'dist:dir': 'npm run sync:reqpilot && electron-builder --dir',
      },
      dependencies: {
        express: '^4.21.2',
      },
      devDependencies: {
        electron: '^35.5.1',
        'electron-builder': '^24.13.3',
      },
      build: {
        appId: 'com.reqpilot.desktop',
        productName: 'ReqPilot',
        files: ['electron/**/*', 'app/**/*', 'package.json'],
        mac: {
          target: ['dmg'],
          category: 'public.app-category.developer-tools',
        },
        linux: {
          target: ['AppImage', 'deb'],
          category: 'Development',
          maintainer: 'ReqPilot Team <support@reqpilot.dev>',
        },
        win: {
          target: ['nsis'],
        },
      },
      reqpilot: {
        port,
      },
    },
    null,
    2
  );
}

function createElectronMainTemplate(port) {
  return `const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const PORT = Number(process.env.REQPILOT_PORT || ${port});
let proxyServer;

async function startServer() {
  const modulePath = path.join(__dirname, '..', 'app', 'proxyApp.mjs');
  const { createProxyApp } = await import(pathToFileURL(modulePath).href);
  const staticDir = path.join(__dirname, '..', 'app', 'dist');

  return new Promise((resolve, reject) => {
    const server = createProxyApp({ staticDir }).listen(PORT, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
}

function openMainWindow() {
  const window = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1100,
    minHeight: 700,
    autoHideMenuBar: true,
    backgroundColor: '#10141f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window.loadURL(\`http://127.0.0.1:\${PORT}\`);
}

async function boot() {
  proxyServer = await startServer();
  openMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      openMainWindow();
    }
  });
}

app.whenReady().then(boot).catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to launch ReqPilot desktop wrapper', error);
  app.quit();
});

app.on('before-quit', () => {
  if (proxyServer) {
    proxyServer.close();
    proxyServer = undefined;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
`;
}

function createSyncScriptTemplate() {
  return `#!/usr/bin/env node
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFile = fileURLToPath(import.meta.url);
const scriptsDir = path.dirname(currentFile);
const wrapperRoot = path.resolve(scriptsDir, '..');
const sourceRoot = process.env.REQPILOT_SOURCE
  ? path.resolve(process.env.REQPILOT_SOURCE)
  : path.resolve(wrapperRoot, '..');

const sourceDist = path.join(sourceRoot, 'dist');
const sourceProxy = path.join(sourceRoot, 'src', 'server', 'proxyApp.js');
const targetDist = path.join(wrapperRoot, 'app', 'dist');
const targetProxy = path.join(wrapperRoot, 'app', 'proxyApp.mjs');

async function copyDir(source, destination) {
  await fs.mkdir(destination, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      await copyDir(sourcePath, destinationPath);
      continue;
    }

    if (entry.isFile()) {
      await fs.copyFile(sourcePath, destinationPath);
    }
  }
}

async function run() {
  if (!fsSync.existsSync(sourceDist)) {
    throw new Error(\`Missing source dist at \${sourceDist}. Build ReqPilot first (npm run build).\`);
  }

  if (!fsSync.existsSync(sourceProxy)) {
    throw new Error(\`Missing source proxy app at \${sourceProxy}.\`);
  }

  await fs.rm(targetDist, { recursive: true, force: true });
  await copyDir(sourceDist, targetDist);
  await fs.copyFile(sourceProxy, targetProxy);

  // eslint-disable-next-line no-console
  console.log('Synced ReqPilot assets into desktop wrapper.');
}

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error.message || error);
  process.exit(1);
});
`;
}

function createReadmeTemplate(outDirName, port) {
  return `# ReqPilot Desktop Wrapper

Generated by \`npm run scaffold:desktop-wrapper\` from the ReqPilot repo.

## What this does

- Starts ReqPilot UI and proxy from inside Electron.
- Supports packaging for macOS, Linux, and Windows using Electron Builder.
- Keeps the main ReqPilot web app unchanged unless you use this wrapper.

## Commands

- \`npm install\`
- \`npm run dev\` to launch desktop app locally.
- \`npm run dist\` to build installable packages.

## Syncing updates from ReqPilot web app

Before launching/building, wrapper runs \`npm run sync:reqpilot\` to copy:

- \`../dist\` into \`./app/dist\`
- \`../src/server/proxyApp.js\` into \`./app/proxyApp.mjs\`

If your ReqPilot repo is not adjacent to this folder (${outDirName}), set:

\`REQPILOT_SOURCE=/absolute/path/to/reqpilot npm run sync:reqpilot\`

## Port

The embedded local server runs on port \`${port}\` by default.
Override with \`REQPILOT_PORT\` if needed.
`;
}

async function scaffold() {
  const projectRoot = process.cwd();
  const options = parseArgs(process.argv.slice(2));
  const outputDir = path.resolve(projectRoot, options.outDir);

  console.log(`Scaffolding ReqPilot desktop wrapper at ${outputDir}`);

  if (!options.skipBuild) {
    console.log('Running ReqPilot web build...');
    runBuild(projectRoot);
  }

  const sourceDist = path.join(projectRoot, 'dist');
  const sourceProxy = path.join(projectRoot, 'src', 'server', 'proxyApp.js');

  if (!fsSync.existsSync(sourceDist)) {
    throw new Error(`Missing ${sourceDist}. Run npm run build before scaffolding.`);
  }

  if (!fsSync.existsSync(sourceProxy)) {
    throw new Error(`Missing ${sourceProxy}.`);
  }

  await ensureCleanDir(outputDir, options.force);
  await Promise.all([
    fs.mkdir(path.join(outputDir, 'app'), { recursive: true }),
    fs.mkdir(path.join(outputDir, 'electron'), { recursive: true }),
    fs.mkdir(path.join(outputDir, 'scripts'), { recursive: true }),
  ]);

  await Promise.all([
    fs.writeFile(path.join(outputDir, 'package.json'), createPackageJsonTemplate(options.port), 'utf8'),
    fs.writeFile(path.join(outputDir, '.gitignore'), 'node_modules\ndist\n*.log\n', 'utf8'),
    fs.writeFile(path.join(outputDir, 'electron', 'main.cjs'), createElectronMainTemplate(options.port), 'utf8'),
    fs.writeFile(path.join(outputDir, 'electron', 'preload.cjs'), 'window.addEventListener(\'DOMContentLoaded\', () => {});\n', 'utf8'),
    fs.writeFile(path.join(outputDir, 'scripts', 'sync-reqpilot.mjs'), createSyncScriptTemplate(), 'utf8'),
    fs.writeFile(
      path.join(outputDir, 'README.md'),
      createReadmeTemplate(path.basename(outputDir), options.port),
      'utf8'
    ),
  ]);

  await copyDir(sourceDist, path.join(outputDir, 'app', 'dist'));
  await fs.copyFile(sourceProxy, path.join(outputDir, 'app', 'proxyApp.mjs'));

  console.log('Desktop wrapper scaffold complete.');
  console.log(`Next:\n  cd ${path.relative(projectRoot, outputDir) || '.'}\n  npm install\n  npm run dev`);
}

scaffold().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
