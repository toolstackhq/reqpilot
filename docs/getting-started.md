# Quick Start

## Run ReqPilot

### Option A: Run published package (fastest)

```bash
npx @toolstackhq/reqpilot
```

ReqPilot starts at `http://localhost:5489`.

### Option B: Run from source

```bash
npm install
npm run dev
```

- App UI: `http://localhost:5173`
- Backend bridge: `http://localhost:5489`
- Optional mock API (for local testing): `npm run mock-server` (`http://localhost:4444`)

## First Request in 60 Seconds

1. Open ReqPilot.
2. Keep `GET` method.
3. Set URL to `http://localhost:4444/api/users` (or your own endpoint).
4. Click `Send`.
5. Check `Status / Time / Size` and response `JSON` tab.

<div class="rp-shot">
  <img src="/screenshots/app-overview.png" alt="ReqPilot app overview with request and response" />
</div>

## Core Shortcuts

- `Ctrl/Cmd + K`: Command palette
- `Ctrl/Cmd + Enter`: Send request
- `Ctrl/Cmd + S`: Save request
- `Ctrl/Cmd + N`: New request tab
- `Ctrl/Cmd + L`: Focus URL bar
- `Esc`: Close open overlays/drawers

## Validate Your Setup

```bash
npm test
npm run test:e2e
```

## Generate Docs Screenshots Locally

```bash
npm run docs:screenshots
```

This captures fresh UI images into `docs/public/screenshots` for documentation updates.
