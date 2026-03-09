# ReqPilot

Modern REST API client with a clean, fast workflow for request building, testing, environments, history, and collections.

[![Build Status](https://img.shields.io/github/actions/workflow/status/toolstackhq/reqpilot/ci-build.yml?branch=main&label=build%20status)](https://github.com/toolstackhq/reqpilot/actions/workflows/ci-build.yml)
[![Test Status](https://img.shields.io/github/actions/workflow/status/toolstackhq/reqpilot/ci-tests.yml?branch=main&label=test%20status)](https://github.com/toolstackhq/reqpilot/actions/workflows/ci-tests.yml)
[![Docs Status](https://img.shields.io/github/actions/workflow/status/toolstackhq/reqpilot/docs-pages.yml?branch=main&label=docs%20deploy)](https://github.com/toolstackhq/reqpilot/actions/workflows/docs-pages.yml)

- Live docs: https://toolstackhq.github.io/reqpilot/

## App Screenshot

![ReqPilot application screenshot](./docs/public/reqpilot.png)

## Install and Run (npm)

Browser-first CLI usage (cross-platform):

```bash
npx reqpilot
```

or install globally:

```bash
npm i -g reqpilot
reqpilot
```

The app starts on `http://localhost:5489` and opens in your default browser.

## Optional Desktop Wrapper Scaffold

Generate a separate Electron wrapper project (macOS/Linux/Windows packaging) without changing the core web app flow:

```bash
npm run scaffold:desktop-wrapper -- --out desktop-wrapper
```

Useful options:

```bash
npm run scaffold:desktop-wrapper -- --out desktop-wrapper --port 5490 --force --skip-build
```

## One-shot Desktop Build

Scaffold + install + package in one command:

```bash
npm run desktop:build -- --out desktop-wrapper --force
```

Useful flags:

```bash
# Faster local check (unpacked app only)
npm run desktop:build -- --out desktop-wrapper --force --unpacked
```

Linux launch after build:

```bash
cd desktop-wrapper/dist
chmod +x ReqPilot-*.AppImage
./ReqPilot-*.AppImage
```

Or install `.deb` on Debian/Ubuntu:

```bash
sudo apt install ./desktop-wrapper/dist/reqpilot_*_amd64.deb
reqpilot
```

## Release and npm Publish (GitHub Actions)

`release-publish.yml` publishes to npm and creates GitHub release notes when you push a semver tag (`v*.*.*`).

### Current Release Strategy

ReqPilot currently uses a **manual release trigger** (tag push).  
This is intentional for now: you control exactly when a public npm release is published.

In practice:

1. merge changes to `main`
2. choose the version
3. push a matching tag
4. CI/CD handles test, build, publish, and GitHub release notes

### 1. Add npm token in GitHub

Repository settings:
`Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`

Secret name:

```text
NPM_TOKEN
```

Value:
your npm automation token from npmjs.com.

### 2. Cut a release

1. Update `package.json` version (must match tag).
2. Commit and push to `main`.
3. Create and push a matching tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Example for next patch release:

```bash
# package.json -> 1.0.1
git add package.json package-lock.json
git commit -m "chore(release): 1.0.1"
git push origin main
git tag v1.0.1
git push origin v1.0.1
```

The workflow will:

1. install dependencies
2. run tests + build
3. validate tag matches `package.json`
4. publish to npm
5. create GitHub release notes automatically
