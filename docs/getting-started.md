# Getting Started

## Install and Run

```bash
npm install
npm run dev
```

ReqPilot opens on:

- App UI: `http://localhost:5173`
- Local proxy/API bridge: `http://localhost:5489`

## Run Tests

```bash
# Unit + integration
npm test

# End-to-end
npm run test:e2e
```

## Build for Production

```bash
npm run build
```

## Core Layout

- Left sidebar: collections, environments, and history.
- Center panel: request tabs, method/URL, parameters/body/headers/auth/scripts.
- Bottom panel: response tabs (JSON, raw, headers, test results) with status/time/size.

## Next Guides

- Import guide: `/importing-collections`
- Environments and variables: `/environments-and-variables`
