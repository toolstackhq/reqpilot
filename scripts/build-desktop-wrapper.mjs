#!/usr/bin/env node
import fsSync from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function parseArgs(argv) {
  const options = {
    outDir: 'desktop-wrapper',
    port: 5490,
    force: false,
    skipInstall: false,
    skipDist: false,
    unpackedOnly: false,
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

    if (value === '--skip-install') {
      options.skipInstall = true;
      continue;
    }

    if (value === '--skip-dist') {
      options.skipDist = true;
      continue;
    }

    if (value === '--unpacked') {
      options.unpackedOnly = true;
      continue;
    }

    if (value === '--help' || value === '-h') {
      console.log(`
ReqPilot one-shot desktop build

Usage:
  npm run desktop:build -- [--out <dir>] [--port <port>] [--force] [--unpacked]

What it does:
  1) Scaffold Electron wrapper project
  2) npm install in wrapper
  3) Build desktop artifacts with electron-builder

Options:
  --out <dir>      Wrapper folder (default: desktop-wrapper)
  --port <port>    Local embedded server port (default: 5490)
  --force          Replace wrapper folder if it already exists
  --unpacked       Build unpacked app only (faster) using electron-builder --dir
  --skip-install   Skip npm install inside wrapper
  --skip-dist      Skip packaging step
`);
      process.exit(0);
    }
  }

  return options;
}

function run(command, args, cwd = process.cwd()) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: false,
  });

  if (result.status !== 0) {
    const attempted = [command, ...args].join(' ');
    throw new Error(`Command failed: ${attempted}`);
  }
}

function resolveNpmBin() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function runDesktopBuild() {
  const options = parseArgs(process.argv.slice(2));
  const projectRoot = process.cwd();
  const wrapperDir = path.resolve(projectRoot, options.outDir);
  const npmBin = resolveNpmBin();

  const scaffoldArgs = ['run', 'scaffold:desktop-wrapper', '--', '--out', wrapperDir, '--port', String(options.port)];
  if (options.force) {
    scaffoldArgs.push('--force');
  }

  console.log('Step 1/3: scaffolding desktop wrapper...');
  run(npmBin, scaffoldArgs, projectRoot);

  if (!fsSync.existsSync(path.join(wrapperDir, 'package.json'))) {
    throw new Error(`Wrapper generation failed: missing ${path.join(wrapperDir, 'package.json')}`);
  }

  if (!options.skipInstall) {
    console.log('Step 2/3: installing wrapper dependencies...');
    run(npmBin, ['install'], wrapperDir);
  } else {
    console.log('Step 2/3: skipped install (--skip-install).');
  }

  if (!options.skipDist) {
    console.log('Step 3/3: building desktop artifacts...');
    if (options.unpackedOnly) {
      run(npmBin, ['run', 'dist:dir'], wrapperDir);
    } else {
      run(npmBin, ['run', 'dist'], wrapperDir);
    }
  } else {
    console.log('Step 3/3: skipped packaging (--skip-dist).');
  }

  console.log('\nDesktop pipeline complete.');
  console.log(`Wrapper: ${wrapperDir}`);
  console.log(`Artifacts: ${path.join(wrapperDir, 'dist')}`);

  if (!options.skipDist) {
    if (process.platform === 'linux') {
      console.log(`\nLinux run hints:\n  chmod +x ${path.join(wrapperDir, 'dist', '*.AppImage')}\n  ${path.join(wrapperDir, 'dist', '*.AppImage')}`);
    }
  }
}

try {
  runDesktopBuild();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
