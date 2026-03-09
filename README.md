# ReqPilot

Modern REST API client with a clean, fast workflow for request building, testing, environments, history, and collections.

[![Build Status](https://img.shields.io/github/actions/workflow/status/toolstackhq/reqpilot/ci-build.yml?branch=main&label=build%20status)](https://github.com/toolstackhq/reqpilot/actions/workflows/ci-build.yml)
[![Test Status](https://img.shields.io/github/actions/workflow/status/toolstackhq/reqpilot/ci-tests.yml?branch=main&label=test%20status)](https://github.com/toolstackhq/reqpilot/actions/workflows/ci-tests.yml)
[![Docs Status](https://img.shields.io/github/actions/workflow/status/toolstackhq/reqpilot/docs-pages.yml?branch=main&label=docs%20deploy)](https://github.com/toolstackhq/reqpilot/actions/workflows/docs-pages.yml)

- Live docs: https://toolstackhq.github.io/reqpilot/

## App Screenshot

![ReqPilot application screenshot](./docs/public/reqpilot.png)

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
