# Design Philosophy

This is the product model behind ReqPilot's current UX.

## Product Principles

1. Local-first execution: requests run through your local ReqPilot backend.
2. Fast primary path: method, URL, send, and response should always be one glance away.
3. Progressive disclosure: advanced controls (TLS, proxy values, scripts) appear when needed.
4. Trust through visibility: history snapshots and script console are first-class, not hidden.
5. Collaboration-ready: workspace boundary first, optional Git integration second.

## UI Map

<div class="rp-grid">
  <div><strong>Top Bar</strong><br/>Workspace picker, command search, quick actions.</div>
  <div><strong>Left Rail</strong><br/>API modes and tools (Collections, Environments, History, Console).</div>
  <div><strong>Center</strong><br/>Request tabs and request builder (params/body/headers/auth/settings/scripts).</div>
  <div><strong>Bottom</strong><br/>Response viewer, test results, and script logs.</div>
</div>

<div class="rp-shot">
  <img src="/screenshots/request-builder.png" alt="Request builder panel" />
</div>

## Why This Matters

- New users can send requests immediately.
- Power users can tune auth/headers/scripts/security without context switching.
- Teams can standardize workflow through workspaces and collections.
