# ReqPilot — Complete Build Prompt for Claude Code

You are building a local-first, zero-auth REST API client called "ReqPilot" that runs via `npx reqpilot` and opens a browser-based UI on localhost. Think of it as a modern, lightweight Postman replacement — no Electron, no cloud, no signup.

## Tech Stack
- **Frontend**: React 18 + Vite, no component library — all custom components
- **Backend**: Express.js proxy server (to avoid CORS issues when hitting APIs from browser)
- **Styling**: Plain CSS modules — NO Tailwind, NO styled-components. Hand-crafted CSS that looks like a real developer tool (think VS Code / Insomnia / HTTPie desktop vibes), NOT generic AI-generated gradient slop
- **Storage**: LocalStorage + JSON file export/import for collections
- **Testing**: Vitest for unit + integration tests, Playwright for E2E tests
- **Package**: Set up as an npx-runnable package with bin entry in package.json. Command: `npx reqpilot` should start Express server + serve the built React frontend on a single port (default 5489)

## Core Features (build in this order)

### 1. Request Builder (Priority 1)
- Method selector dropdown: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
- Each method has a distinct color tag (green GET, yellow POST, blue PUT, purple PATCH, red DELETE)
- URL bar with inline query param detection (typing `?foo=bar` auto-populates params tab)
- Tabs below URL bar: Params, Headers, Body, Auth, Pre-request, Tests, Post-request
- **Params tab**: Key-value editor with enable/disable checkbox per row, auto-sync with URL
- **Headers tab**: Same key-value editor, with autocomplete suggestions for common headers (Content-Type, Authorization, Accept, Cache-Control, User-Agent, X-API-Key, etc.)
- **Body tab**: Sub-options — none, JSON, form-data, x-www-form-urlencoded, raw. JSON body should have a proper code editor textarea with line numbers and basic JSON validation (red border + error message if invalid JSON)
- **Auth tab**: Support Bearer Token, Basic Auth, API Key (header/query). When filled, auto-injects into headers
- **Pre-request tab**: JavaScript code editor with line numbers. Runs before request is sent. Provides a `rp` API object:
  - `rp.env.get("key")` / `rp.env.set("key", "value")` — read/write environment variables
  - `rp.request.headers.set("key", "value")` — dynamically modify request headers
  - `rp.request.body` — access/modify request body before sending
  - `rp.request.url` — access/modify URL before sending
  - `console.log()` — output appears in a console panel below the editor
  - Common use: inject auth tokens, generate timestamps, compute HMAC signatures
- **Tests tab**: JavaScript code editor with line numbers + a "Snippets" dropdown button that inserts common test patterns. Provides assertion API:
  - `rp.test("Test name", () => { ... })` — define a named test
  - `rp.expect(value).toBe(expected)` — equality check
  - `rp.expect(value).toBeGreaterThan(n)` / `.toBeLessThan(n)` — numeric comparisons
  - `rp.expect(obj).toHaveProperty("key")` — property existence
  - `rp.expect(value).toContain(substring)` — string/array contains
  - `rp.expect(value).toBeTruthy()` / `.toBeFalsy()` — truthiness checks
  - `rp.response.status` — HTTP status code
  - `rp.response.json()` — parsed response body
  - `rp.response.text()` — raw response body
  - `rp.response.headers.get("key")` — response header value
  - `rp.response.time` — response time in ms
  - Snippet dropdown includes: "Status code is 200", "Response time < 500ms", "Body contains property", "Content-Type is JSON", "Response body matches schema"
- **Post-request tab**: JavaScript code editor with line numbers. Runs after response is received. Same `rp` API as pre-request plus `rp.response`. Common use: save response values to environment for request chaining, log debug info, trigger conditional follow-up logic
- Send button with keyboard shortcut (Ctrl+Enter / Cmd+Enter)
- Loading state with elapsed time counter while request is in-flight

### 2. Response Viewer (Priority 1)
- Status code badge (color-coded: 2xx green, 3xx blue, 4xx yellow, 5xx red) with status text
- Response time in ms and response size in KB
- Tabs: Body, Headers, Cookies, Test Results
- **Test Results tab**: Shows pass/fail results from the Tests tab scripts. Each test displays:
  - Pass/fail icon (green checkmark / red X)
  - Test name
  - PASS/FAIL label
  - Summary bar at top: "X tests — Y passed, Z failed" with a mini progress bar
  - If no tests defined, show empty state: "Add tests in the Tests tab to validate responses"
- **Body tab**: Auto-detect content type. JSON responses get syntax-highlighted pretty-print with collapsible nodes. HTML responses get raw view + rendered preview toggle. Other types get raw text.
- **Headers tab**: Table view of response headers
- Copy response body button
- "No response yet" empty state when nothing has been sent

### 3. Request History (Priority 2)
- Left sidebar section showing last 50 requests
- Each entry shows: method badge, URL (truncated), status code, timestamp
- Click to reload that request into the builder
- Clear history button
- Persist in localStorage

### 4. Collections (Priority 2)
- Left sidebar section above history
- Create named collections (folders)
- Save current request to a collection with a custom name
- Drag/click to load any saved request
- Export collection as JSON file, import from JSON file
- Persist in localStorage

### 5. Environment Variables (Priority 3)
- Environment manager: create named environments (dev, staging, prod)
- Each environment has key-value pairs
- Use `{{variable_name}}` syntax in URL, headers, body — resolved at send time
- Dropdown in top bar to switch active environment
- Visual indicator highlighting `{{variables}}` in the URL bar

### 6. Theme Toggle — Light / Dark (Priority 2)
- Toggle button in the top nav bar (sun/moon icon)
- Default: detect system preference via `prefers-color-scheme` media query, fallback to dark
- Persist choice in localStorage (`reqpilot_theme`)
- Implementation: ALL colors must be defined as CSS custom properties (variables) in `globals.css`
- Two theme classes on `<html>`: `.theme-dark` and `.theme-light`
- Switching theme only changes the CSS variable values — zero JS-based color logic in components
- Dark theme palette (default):
  - `--bg-primary`: #0c0c0c
  - `--bg-secondary`: #111111
  - `--bg-tertiary`: #161616
  - `--border`: #1a1a1a
  - `--border-hover`: #2a2a2a
  - `--text-primary`: #e4e4e7
  - `--text-secondary`: #a1a1aa (must meet 4.5:1 against --bg-primary)
  - `--text-muted`: #555555 (must meet 4.5:1 against --bg-secondary for labels, meets 3:1 for large/bold)
  - `--text-dimmed`: #333333 (decorative only — never used for meaningful text)
  - `--surface`: #1a1a1a
  - `--focus-ring`: #60a5fa
- Light theme palette:
  - `--bg-primary`: #ffffff
  - `--bg-secondary`: #f8f8fa
  - `--bg-tertiary`: #f0f0f3
  - `--border`: #e2e2e8
  - `--border-hover`: #c8c8d0
  - `--text-primary`: #1a1a2e
  - `--text-secondary`: #52525b (must meet 4.5:1 against --bg-primary)
  - `--text-muted`: #71717a (must meet 4.5:1 against --bg-secondary)
  - `--text-dimmed`: #b0b0be (decorative only)
  - `--surface`: #eeeef2
  - `--focus-ring`: #2563eb
- Method colors stay the same in both themes (they're already high-contrast)
- The code editor areas (body, scripts) should use a slightly darker bg even in light theme (like `#f0f0f3`) to visually separate code from UI
- IMPORTANT: Every single `color`, `background`, `border-color`, and `box-shadow` in every CSS module must use these variables. No hardcoded hex values in components.

### 7. Import — Postman & Swagger/OpenAPI (Priority 2)
- Import button in the top nav bar or accessible via ⌘K command palette
- Opens a modal with drag-and-drop zone + file picker button
- Auto-detects file format from content (not file extension)
- Supported import formats:

#### Postman Collection v2.0 (2016+)
- Schema: `https://schema.getpostman.com/json/collection/v2.0.0/`
- Parse `info`, `item` (recursive — items can contain sub-folders of items)
- Map each `item` to a ReqPilot request: method, URL, headers, body, auth
- Map Postman `request.auth` → ReqPilot auth tab
- Map Postman `request.body` (raw, formdata, urlencoded) → ReqPilot body types
- Map Postman `event` scripts (pre-request, test) → ReqPilot script tabs
  - Convert `pm.test()` → `rp.test()`, `pm.expect()` → `rp.expect()`, `pm.environment.get/set()` → `rp.env.get/set()` via basic string replacement
- Preserve folder structure as nested collections

#### Postman Collection v2.1 (2017+)
- Schema: `https://schema.getpostman.com/json/collection/v2.1.0/`
- Nearly identical to v2.0 with minor schema changes (auth structure, variable scopes)
- Handle both `auth` at collection level and request level
- Map Postman `variable` array → ReqPilot environment variables
- Map `{{variable}}` syntax directly (same syntax in ReqPilot)

#### Postman Environment Files
- JSON with `"_postman_variable_scope": "environment"`
- Import as a named ReqPilot environment with all key-value pairs
- Support both enabled and disabled variables

#### Swagger / OpenAPI 2.0 (fka Swagger)
- JSON or YAML format (use `js-yaml` package to parse YAML)
- Parse `swagger: "2.0"` files
- Map each `paths[path][method]` to a ReqPilot request
- Build URL from `host` + `basePath` + path
- Map `parameters` (query, header, path, body) to appropriate tabs
- Map `consumes`/`produces` → Content-Type and Accept headers
- Map `securityDefinitions` → Auth tab (apiKey, basic, oauth2 as bearer)
- Generate example request bodies from `definitions` using schema (fill with type-appropriate defaults: strings→"string", numbers→0, booleans→false, arrays→[])
- Create a collection named after `info.title`

#### OpenAPI 3.0.x
- Parse `openapi: "3.0.x"` files (JSON or YAML)
- Map `paths[path][method]` to requests
- Build URL from `servers[0].url` + path (handle server variables `{var}` → `{{var}}`)
- Map `parameters` (query, header, path, cookie) to appropriate tabs
- Map `requestBody.content["application/json"].schema` → Body tab with example JSON
  - Use `example` field if present, otherwise generate from schema
- Map `components.securitySchemes` → Auth tab
- Map `components.schemas` for body generation
- Resolve `$ref` references recursively (handle `$ref: "#/components/schemas/User"` etc.)

#### OpenAPI 3.1.x
- Parse `openapi: "3.1.x"` files
- Same as 3.0 but handle updated JSON Schema compatibility (nullable → type arrays, etc.)
- Support `webhooks` section (import as a separate collection folder)

#### Import UX Flow
1. User drops/selects file
2. Show a preview: "Found X requests in Y folders" with a tree view
3. User can select/deselect individual requests or folders
4. Option to merge into existing collection or create new
5. "Import" button processes selected items
6. Show success toast: "Imported X requests into Collection Name"
7. If any requests failed to parse, show a warning with details

#### Import Edge Cases to Handle
- Postman collections can have deeply nested folders (5+ levels) — flatten to 2-3 levels max
- Variables like `{{baseUrl}}` should be preserved and added to a new environment if not already defined
- Duplicate request names within same folder — append index (e.g., "Get User (2)")
- Empty requests (no URL) — skip with warning
- Binary/file body types — skip body, add a note in the request
- OAuth2 flows — import as Bearer token with placeholder, add comment about manual setup
- Circular `$ref` in OpenAPI — detect and break cycle with placeholder

### 8. Express Proxy Server
- All requests from the frontend go to `POST /proxy` on the Express server
- The proxy reconstructs the full HTTP request (method, url, headers, body) and forwards it using `node-fetch` or native fetch (Node 18+)
- Returns the full response (status, headers, body, timing) back to frontend
- This avoids all CORS issues
- Also serves the built React frontend as static files from the same Express server

## UI/UX Design Requirements — THIS IS CRITICAL

- **DO NOT** use generic AI aesthetics. No purple gradients, no rounded-everything, no Inter/Roboto fonts, no excessive whitespace
- Use a **dark theme** as default inspired by terminal/IDE aesthetics
- Font: `"JetBrains Mono"` for code/monospace areas, `"Outfit"` for UI text (import from Google Fonts)
- Method color tags:
  - GET: #34d399 (green)
  - POST: #fbbf24 (amber)
  - PUT: #60a5fa (blue)
  - PATCH: #c084fc (purple)
  - DELETE: #f87171 (red)
  - HEAD: #22d3ee (cyan)
  - OPTIONS: #94a3b8 (slate)
- Layout: NO permanent sidebar. History and Collections live in slide-over drawers from the right. Main area is side-by-side: request config (left) and response viewer (right). URL bar is the hero element with generous spacing at the top.
- Command palette (⌘K) as the power-user hub for all actions
- Subtle borders using CSS variables, no heavy shadows
- Active tabs should have a bottom border accent, not background fill
- Inputs and textareas should look like code editor fields — dark bg, subtle border, monospace font
- Key-value editors should feel like a spreadsheet — compact rows, no excessive padding
- Transitions: 150ms ease on interactive elements, no bouncy/playful animations
- Scrollbars: custom styled, thin, unobtrusive (like VS Code)
- The overall feel should be: professional, clean, spacious — a power user tool with room to breathe
- Status bar at the bottom showing: active environment, proxy status, version number

## Accessibility Requirements — WCAG AA Compliance (NON-NEGOTIABLE)

This tool must be accessible. Every component must meet WCAG 2.1 AA standards:

### Semantic HTML
- Use `<header>`, `<main>`, `<nav>`, `<footer>`, `<section>` appropriately — not just divs
- Use `<table>` with proper `<thead>`, `<th>` for key-value editors and response headers
- Use `<ul>`/`<li>` for lists (history, collections, command palette results)
- Use `<button>` for clickable actions, never clickable `<div>` or `<span>`

### ARIA Attributes
- All tab groups use `role="tablist"`, `role="tab"`, `role="tabpanel"` with `aria-selected`, `aria-controls`, `id` linking
- Dropdowns use `aria-haspopup="listbox"`, `aria-expanded`, `role="listbox"`, `role="option"`
- Command palette modal uses `role="dialog"`, `aria-modal="true"`, `aria-label`
- Drawer uses `role="dialog"`, `aria-modal="true"`
- Loading states use `role="status"`, `aria-live="polite"`
- JSON validation status uses `role="status"`, `aria-live="polite"`
- All inputs have associated `<label>` (use visually hidden labels via CSS if no visual label)
- All icon-only buttons have `aria-label`
- Decorative elements use `aria-hidden="true"`
- Test results list uses `role="list"` / `role="listitem"`
- Progress bar uses `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`

### Keyboard Navigation
- All interactive elements must be focusable and operable via keyboard
- Tab order follows logical reading order
- `Escape` closes all modals, dropdowns, drawers
- `Enter` activates buttons, selects options
- Arrow keys navigate within dropdowns and listboxes
- Add a "Skip to main content" link as the first focusable element (visible on focus)
- Focus must be trapped inside modals/dialogs when open
- Focus returns to the trigger element when modal/dialog closes

### Focus Indicators
- All focusable elements must have a visible focus ring: `outline: 2px solid var(--focus-ring); outline-offset: 2px;`
- Use `:focus-visible` (not `:focus`) so mouse users don't see focus rings
- Never use `outline: none` without a replacement indicator

### Color & Contrast
- All text must meet 4.5:1 contrast ratio against its background (WCAG AA)
- Large text (18px+ or 14px+ bold) must meet 3:1
- Do NOT rely on color alone to convey information — always pair with text, icons, or patterns
- Interactive elements must have 3:1 contrast against adjacent colors

### Reduced Motion
- Wrap all animations in `@media (prefers-reduced-motion: no-preference) { ... }`
- Provide instant transitions as fallback for users who prefer reduced motion

### Screen Reader Support
- All form fields have accessible names
- Error messages are associated with their fields via `aria-describedby`
- Dynamic content changes (sending state, response received, test results) are announced via `aria-live` regions
- Visually hidden text class: `.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; }`

## Project Structure

```
reqpilot/
├── package.json
├── server.js
├── vite.config.js
├── vitest.config.js
├── playwright.config.js
├── index.html
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── App.module.css
│   ├── components/
│   │   ├── Sidebar/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Sidebar.module.css
│   │   │   ├── Collections.jsx
│   │   │   └── History.jsx
│   │   ├── RequestBuilder/
│   │   │   ├── RequestBuilder.jsx
│   │   │   ├── RequestBuilder.module.css
│   │   │   ├── UrlBar.jsx
│   │   │   ├── ParamsEditor.jsx
│   │   │   ├── HeadersEditor.jsx
│   │   │   ├── BodyEditor.jsx
│   │   │   ├── AuthEditor.jsx
│   │   │   └── KeyValueEditor.jsx  (reusable component)
│   │   ├── ResponseViewer/
│   │   │   ├── ResponseViewer.jsx
│   │   │   ├── ResponseViewer.module.css
│   │   │   ├── JsonTreeView.jsx
│   │   │   ├── ResponseHeaders.jsx
│   │   │   └── TestResults.jsx
│   │   ├── Import/
│   │   │   ├── ImportModal.jsx
│   │   │   ├── ImportModal.module.css
│   │   │   ├── importPostman.js
│   │   │   ├── importOpenAPI.js
│   │   │   ├── importDetector.js
│   │   │   └── schemaToExample.js
│   │   ├── ThemeToggle/
│   │   │   └── ThemeToggle.jsx
│   │   └── Environment/
│   │       ├── EnvSelector.jsx
│   │       └── EnvManager.jsx
│   ├── hooks/
│   │   ├── useRequestSender.js
│   │   ├── useHistory.js
│   │   ├── useCollections.js
│   │   ├── useEnvironments.js
│   │   └── useTheme.js
│   ├── utils/
│   │   ├── httpClient.js
│   │   ├── syntaxHighlight.js
│   │   ├── variableResolver.js
│   │   └── scriptExecutor.js
│   └── styles/
│       └── globals.css
├── tests/
│   ├── fixtures/
│   │   ├── postman-v2.0-collection.json
│   │   ├── postman-v2.1-collection.json
│   │   ├── postman-environment.json
│   │   ├── swagger-2.0.json
│   │   ├── swagger-2.0.yaml
│   │   ├── openapi-3.0.json
│   │   ├── openapi-3.0.yaml
│   │   ├── openapi-3.1.json
│   │   ├── openapi-3.1-with-webhooks.json
│   │   ├── openapi-circular-ref.json
│   │   └── postman-deeply-nested.json
│   ├── mock-server/
│   │   └── mock-api-server.js
│   ├── unit/
│   │   ├── scriptExecutor.test.js
│   │   ├── variableResolver.test.js
│   │   ├── importDetector.test.js
│   │   ├── importPostman.test.js
│   │   ├── importOpenAPI.test.js
│   │   ├── schemaToExample.test.js
│   │   └── httpClient.test.js
│   ├── integration/
│   │   ├── proxy.test.js
│   │   └── requestFlow.test.js
│   └── e2e/
│       ├── send-request.spec.js
│       ├── collections.spec.js
│       ├── import.spec.js
│       ├── theme.spec.js
│       └── accessibility.spec.js
```

## package.json Setup

```json
{
  "name": "reqpilot",
  "version": "1.0.0",
  "description": "Lightweight local-first REST API client. Modern Postman alternative.",
  "type": "module",
  "bin": {
    "reqpilot": "./server.js"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "start": "node server.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "playwright test",
    "test:all": "vitest run && playwright test",
    "mock-server": "node tests/mock-server/mock-api-server.js"
  },
  "files": [
    "server.js",
    "dist/**"
  ],
  "dependencies": {
    "express": "^4.18.0",
    "js-yaml": "^4.1.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "vitest": "^2.0.0",
    "@playwright/test": "^1.45.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "jsdom": "^24.0.0"
  }
}
```

## server.js Requirements

```
#!/usr/bin/env node
```

- Start Express on port 5489 (or PORT env var)
- Serve `dist/` as static files
- `POST /proxy` endpoint that:
  - Accepts: `{ method, url, headers, body }`
  - Forwards the request using native fetch (Node 18+)
  - Measures response time using `performance.now()`
  - Returns: `{ status, statusText, headers, body, time, size }`
  - Handles errors gracefully (timeouts, DNS failures, connection refused)
- On startup, print a clean banner:
  ```
  ┌─────────────────────────────────┐
  │  ReqPilot v1.0.0               │
  │  Running on http://localhost:5489 │
  └─────────────────────────────────┘
  ```
- Auto-open browser on startup using `child_process.exec` with platform detection (xdg-open / open / start)

## Important Implementation Notes

- The KeyValueEditor component is used in 3 places (params, headers, form-data) — build it once as a reusable component, pass config via props
- JSON body editor needs real-time validation — debounce 300ms, show error inline below the editor
- URL and params must stay in sync bidirectionally (editing URL updates params tab, editing params tab updates URL)
- History should capture the full request AND response so replaying shows the old response immediately while user can re-send
- Ctrl+Enter / Cmd+Enter should work from anywhere in the request builder to send the request
- Empty states matter — show helpful text/illustration when there are no collections, no history, no response yet
- All localStorage keys should be prefixed with `reqpilot_` to avoid conflicts
- Handle large response bodies gracefully — truncate display at 1MB with a "show full" toggle
- JSON tree view should be collapsible — click to expand/collapse objects and arrays, show item count when collapsed

### Script Executor (critical for pre-request, tests, post-request)
- Scripts run in a sandboxed environment using `new Function()` with a controlled scope
- The `rp` object is injected into the scope and provides the API:
  - `rp.env.get(key)` / `rp.env.set(key, value)` — read/write from active environment
  - `rp.request` — mutable request object (headers, body, url) for pre-request scripts
  - `rp.response` — read-only response object (status, headers, body, time) for tests and post-request
  - `rp.test(name, fn)` — registers a test; catches errors to determine pass/fail
  - `rp.expect(value)` — returns an assertion object with `.toBe()`, `.toHaveProperty()`, `.toContain()`, `.toBeGreaterThan()`, `.toBeLessThan()`, `.toBeTruthy()`, `.toBeFalsy()`
- Pre-request scripts execute before the fetch call; can modify headers, body, URL
- Test scripts execute after response is received; results are collected and displayed in Test Results tab
- Post-request scripts execute after tests; can save values to environment
- All script errors should be caught and displayed gracefully (not crash the app)
- Console output from scripts should be captured and displayable

## Keyboard Shortcuts
- `Ctrl/Cmd + Enter` — Send request
- `Ctrl/Cmd + S` — Save request to collection
- `Ctrl/Cmd + N` — New request (clear builder)
- `Ctrl/Cmd + L` — Focus URL bar
- `Esc` — Close any open modal/dropdown

## Error Handling
- Network errors (ECONNREFUSED, ETIMEDOUT, DNS failures) should show a clear error state in the response viewer, not a crash
- Invalid JSON in body editor should prevent sending and show inline validation error
- If the proxy server itself fails, show a connection error banner at the top of the UI

## Performance Note
- Use `vite build` at publish time, ship pre-built `dist/` folder inside the npm package
- server.js should ONLY serve static files + proxy at runtime — no build step at runtime
- This means `npx reqpilot` just starts Express and serves pre-built files — boot time should be under 1 second
- Do NOT run vite dev server at runtime. The frontend is pre-built and served as static files.
- For development, use `npm run dev` to start vite dev server separately

---

## COMPREHENSIVE TEST SUITE

Testing is CRITICAL. Build tests alongside features, not as an afterthought. The test suite has 4 layers.

---

### Layer 1: Mock API Server (`tests/mock-server/mock-api-server.js`)

Build a standalone Express server on port 4444 that exposes every HTTP scenario ReqPilot needs to handle. This server is the backbone of all integration and E2E tests. It must be startable with `node tests/mock-server/mock-api-server.js` and also importable as a module for programmatic start/stop in tests.

```javascript
// The mock server must export:
// createMockServer() → { app, start(port), stop(), baseUrl }
```

#### Endpoints the mock server must expose:

**Basic HTTP Methods — echo back request details:**
```
GET    /api/users              → 200, returns JSON array of 3 users
GET    /api/users/:id          → 200, returns single user JSON; 404 if id > 100
POST   /api/users              → 201, echoes back the request body + adds { id, createdAt }
PUT    /api/users/:id          → 200, echoes back merged user + request body
PATCH  /api/users/:id          → 200, echoes back partial update
DELETE /api/users/:id          → 204, no body
HEAD   /api/users              → 200, same headers as GET but no body
OPTIONS /api/users             → 204, returns Allow header with all methods
```

**Status Code Testing:**
```
GET /api/status/:code         → Returns whatever status code you pass (200, 201, 204, 301, 400, 401, 403, 404, 500, 502, 503)
```

**Header Echo:**
```
GET /api/echo/headers         → 200, returns all received request headers as JSON body
```

**Auth Testing:**
```
GET /api/auth/bearer          → 401 if no Authorization header; 200 with { user: "admin" } if Bearer token = "test-token-123"
GET /api/auth/basic           → 401 if no auth; 200 if Basic auth with username "admin" password "password"
GET /api/auth/apikey          → 401 if no X-API-Key header; 200 if X-API-Key = "key-abc-123"
```

**Body Type Testing:**
```
POST /api/echo/json           → Parses JSON body, returns it back with { received: true, contentType, parsedBody }
POST /api/echo/form           → Parses form-urlencoded body, returns key-value pairs as JSON
POST /api/echo/multipart      → Parses multipart form-data, returns field names and values as JSON
POST /api/echo/raw            → Returns raw body as text with content-length
```

**Query Parameter Testing:**
```
GET /api/echo/params          → Returns all query parameters as JSON { params: { key: value } }
GET /api/echo/params?foo=bar&baz=qux → { params: { foo: "bar", baz: "qux" } }
```

**Response Types:**
```
GET /api/response/json        → 200, Content-Type: application/json, returns JSON
GET /api/response/html        → 200, Content-Type: text/html, returns HTML page
GET /api/response/xml         → 200, Content-Type: application/xml, returns XML
GET /api/response/text        → 200, Content-Type: text/plain, returns plain text
GET /api/response/large       → 200, returns a 2MB JSON response (for large body handling)
GET /api/response/empty       → 204, no body at all
```

**Timing/Performance:**
```
GET /api/slow/:ms             → Waits :ms milliseconds, then returns 200 (for timeout testing)
GET /api/slow/100             → waits 100ms
GET /api/slow/3000            → waits 3 seconds
```

**Cookie Testing:**
```
GET /api/cookies/set          → Sets cookies: session=abc123, theme=dark via Set-Cookie headers
GET /api/cookies/read         → Returns received cookies as JSON
```

**Error Scenarios:**
```
GET /api/error/malformed-json → 200 but body is invalid JSON (broken string)
GET /api/error/connection-reset → Destroys socket immediately (simulate connection reset)
GET /api/error/timeout        → Never responds (for client-side timeout testing)
```

**Environment Variable Testing (for request chaining):**
```
POST /api/chain/login         → Returns { token: "jwt-token-xyz-123" } (used to test saving to env)
GET  /api/chain/protected     → 401 without Bearer token; 200 with { data: "secret" } if token = "jwt-token-xyz-123"
```

**Custom Response Headers:**
```
GET /api/headers/custom       → Returns response with custom headers: X-Request-Id, X-RateLimit-Limit, X-RateLimit-Remaining
```

The mock server should:
- Log all received requests to stdout in a clean format: `[MOCK] GET /api/users → 200`
- Support CORS (allow all origins) for direct browser testing
- Be fully stateless (no database, no persistence)
- Start in under 200ms
- Gracefully shut down when process.exit or SIGTERM received

---

### Layer 2: Unit Tests (`tests/unit/`)

Use **Vitest**. Test all pure utility functions in isolation with no network, no DOM, no server.

#### `scriptExecutor.test.js` — Test the rp.* scripting API
```
Test cases:
- rp.test() registers named test, reports pass when assertion succeeds
- rp.test() reports fail with error message when assertion throws
- rp.expect(5).toBe(5) passes
- rp.expect(5).toBe(3) fails with descriptive message
- rp.expect(10).toBeGreaterThan(5) passes
- rp.expect(3).toBeGreaterThan(5) fails
- rp.expect(3).toBeLessThan(5) passes
- rp.expect({a:1}).toHaveProperty("a") passes
- rp.expect({a:1}).toHaveProperty("b") fails
- rp.expect("hello world").toContain("world") passes
- rp.expect([1,2,3]).toContain(2) passes
- rp.expect(1).toBeTruthy() passes
- rp.expect(0).toBeTruthy() fails
- rp.expect(null).toBeFalsy() passes
- rp.expect("hello").toBeFalsy() fails
- Script syntax errors are caught and returned as a failed test, not a crash
- rp.env.get/set work within script execution context
- rp.request.headers.set modifies the request object in pre-request scripts
- rp.response.status / .json() / .headers.get() return correct values in test scripts
- Console.log output is captured and returned
- Multiple rp.test() calls in one script all execute and return results
- Script with infinite loop (while(true)) should timeout after 5 seconds and return error
```

#### `variableResolver.test.js` — Test {{variable}} replacement
```
Test cases:
- Replaces single {{var}} in string
- Replaces multiple {{var1}} and {{var2}} in same string
- Leaves {{unknown}} as-is when variable not defined (don't strip it)
- Handles nested braces {{{var}}} gracefully (replaces inner)
- Handles empty variable name {{}} — leaves as-is
- Replaces in URLs: "https://{{host}}/api/{{version}}/users" → "https://example.com/api/v2/users"
- Replaces in JSON body strings
- Replaces in header values
- Case-sensitive: {{Host}} ≠ {{host}}
- Does not replace inside escaped \{\{var\}\}
- Performance: resolves 1000 variables in under 10ms
```

#### `importDetector.test.js` — Test format auto-detection
```
Test cases:
- Detects Postman v2.0 from schema URL in info.schema
- Detects Postman v2.1 from schema URL in info.schema
- Detects Postman environment from _postman_variable_scope field
- Detects Swagger 2.0 from "swagger": "2.0" field
- Detects OpenAPI 3.0 from "openapi": "3.0.x" field
- Detects OpenAPI 3.1 from "openapi": "3.1.x" field
- Detects YAML format and parses before detecting
- Returns "unknown" for unrecognized formats
- Handles malformed JSON gracefully (returns error, not crash)
- Handles empty string input
- Handles null/undefined input
```

#### `importPostman.test.js` — Test Postman collection parsing
```
Use fixture files. Test cases:
- Parses v2.0 collection: correct number of requests extracted
- Parses v2.1 collection: correct number of requests extracted
- Maps GET/POST/PUT/DELETE methods correctly
- Extracts URL from request.url (both string and object formats)
- Extracts headers as key-value pairs
- Extracts raw JSON body
- Extracts form-data body fields
- Extracts urlencoded body fields
- Extracts bearer auth → maps to auth tab
- Extracts basic auth → maps to auth tab
- Extracts API key auth → maps to auth tab
- Preserves folder/subfolder structure
- Handles deeply nested folders (5+ levels) — flattens to 3
- Converts pm.test() → rp.test() in test scripts
- Converts pm.expect() → rp.expect() in test scripts
- Converts pm.environment.get() → rp.env.get()
- Converts pm.environment.set() → rp.env.set()
- Converts pm.response.to.have.status(200) → rp.expect(rp.response.status).toBe(200)
- Extracts collection-level variables
- Handles requests with no body (GET)
- Handles empty collection (zero items)
- Handles request with no name — falls back to method + URL
- Parses Postman environment files → key-value pairs with enabled/disabled
```

#### `importOpenAPI.test.js` — Test OpenAPI/Swagger parsing
```
Use fixture files. Test cases:
- Parses Swagger 2.0 JSON: correct paths and methods
- Parses Swagger 2.0 YAML: same result as JSON
- Parses OpenAPI 3.0 JSON: correct paths and methods
- Parses OpenAPI 3.0 YAML: same result as JSON
- Parses OpenAPI 3.1: correct paths and methods
- Builds URL from Swagger 2.0 host + basePath + path
- Builds URL from OpenAPI 3.0 servers[0].url + path
- Handles server URL variables: {protocol}://api.example.com → {{protocol}}://api.example.com
- Extracts query parameters as params tab entries
- Extracts header parameters as headers tab entries
- Extracts path parameters and builds URL with {{param}} syntax
- Maps requestBody JSON schema → example JSON body
- Uses example field when present instead of generating
- Resolves $ref references (single level)
- Resolves $ref references (nested — schema referencing another schema)
- Detects and breaks circular $ref (marks as { "$circular": "SchemaName" })
- Maps securitySchemes: apiKey → API Key auth
- Maps securitySchemes: http/bearer → Bearer auth
- Maps securitySchemes: http/basic → Basic auth
- Generates collection name from info.title
- Groups requests by path tags into folders
- Handles OpenAPI 3.1 webhooks → separate folder
- Handles paths with no parameters
- Handles paths with no requestBody
- Empty paths object → empty collection with warning
```

#### `schemaToExample.test.js` — Test JSON Schema → example generation
```
Test cases:
- { type: "string" } → "string"
- { type: "string", example: "hello" } → "hello"
- { type: "number" } → 0
- { type: "integer" } → 0
- { type: "boolean" } → false
- { type: "array", items: { type: "string" } } → ["string"]
- { type: "object", properties: { name: { type: "string" }, age: { type: "integer" } } } → { name: "string", age: 0 }
- Nested objects generate nested examples
- { type: "string", enum: ["A", "B", "C"] } → "A" (first enum value)
- { type: "string", format: "email" } → "user@example.com"
- { type: "string", format: "date-time" } → "2024-01-01T00:00:00Z"
- { type: "string", format: "uuid" } → "00000000-0000-0000-0000-000000000000"
- { type: "string", format: "uri" } → "https://example.com"
- Handles nullable types (OpenAPI 3.1: type: ["string", "null"]) → "string"
- Handles allOf (merges properties)
- Handles oneOf (picks first)
- Returns {} for schema with no type
- Max depth of 10 to prevent infinite recursion
```

#### `httpClient.test.js` — Test the frontend HTTP client utility
```
Test cases:
- Builds correct proxy request payload from method, url, headers, body
- Strips disabled headers from the payload
- Serializes JSON body correctly
- Serializes form-urlencoded body correctly
- Handles empty body for GET/HEAD/DELETE
- Parses proxy response into structured format { status, statusText, headers, body, time, size }
- Handles non-JSON response bodies (returns raw text)
- Handles empty response body (204)
- Calculates response size correctly
```

---

### Layer 3: Integration Tests (`tests/integration/`)

Test the proxy server and request flow against the real mock API server. These tests start both the mock server and the ReqPilot proxy, then send requests through the proxy to the mock server.

#### `proxy.test.js`

```javascript
// Setup: before all tests, start mock server on port 4444 and ReqPilot proxy on port 5555
// Teardown: after all tests, stop both servers

Test cases:

// === Basic HTTP Methods ===
- "Proxy forwards GET request and returns response"
  → POST to proxy with { method: "GET", url: "http://localhost:4444/api/users" }
  → Assert: status 200, body is array of 3 users, time > 0, size > 0

- "Proxy forwards POST with JSON body"
  → POST to proxy with { method: "POST", url: "http://localhost:4444/api/users", body: '{"name":"John"}', headers: {"Content-Type":"application/json"} }
  → Assert: status 201, body contains name "John" and has id and createdAt

- "Proxy forwards PUT request"
  → Assert: status 200, body is merged user

- "Proxy forwards PATCH request"
  → Assert: status 200, body is partial update

- "Proxy forwards DELETE request"
  → Assert: status 204, body is empty

- "Proxy forwards HEAD request — returns headers but no body"
  → Assert: status 200, body is empty/null, headers include content-type

- "Proxy forwards OPTIONS request"
  → Assert: status 204, headers include Allow

// === Headers ===
- "Proxy forwards custom request headers"
  → Send GET to /api/echo/headers with custom headers { "X-Custom": "hello", "Accept-Language": "en" }
  → Assert: response body contains those header values

- "Proxy returns all response headers"
  → Send GET to /api/headers/custom
  → Assert: proxy response includes X-Request-Id, X-RateLimit-Limit headers

// === Auth ===
- "Proxy forwards Bearer token — success"
  → Send GET to /api/auth/bearer with header Authorization: "Bearer test-token-123"
  → Assert: status 200, body has user: "admin"

- "Proxy forwards Bearer token — failure"
  → Send GET to /api/auth/bearer without auth header
  → Assert: status 401

- "Proxy forwards Basic auth"
  → Send GET to /api/auth/basic with Authorization: "Basic YWRtaW46cGFzc3dvcmQ="
  → Assert: status 200

- "Proxy forwards API Key header"
  → Send GET to /api/auth/apikey with X-API-Key: "key-abc-123"
  → Assert: status 200

// === Body Types ===
- "Proxy handles JSON body"
  → Assert: /api/echo/json returns the parsed body

- "Proxy handles form-urlencoded body"
  → Assert: /api/echo/form returns parsed fields

- "Proxy handles raw text body"
  → Assert: /api/echo/raw returns raw body text

// === Status Codes ===
- "Proxy returns correct status for each code"
  → Loop through [200, 201, 204, 301, 400, 401, 403, 404, 500, 502, 503]
  → Assert: each returns matching status code

// === Query Parameters ===
- "Proxy preserves query parameters in URL"
  → Send GET to /api/echo/params?name=john&age=30
  → Assert: response body params has name: "john", age: "30"

// === Response Types ===
- "Proxy handles JSON response"
  → Assert: body is valid JSON

- "Proxy handles HTML response"
  → Assert: body contains HTML tags

- "Proxy handles large response body (2MB)"
  → Assert: status 200, body received in full, size approximately 2MB

- "Proxy handles empty response body (204)"
  → Assert: status 204, body is empty

// === Timing ===
- "Proxy measures response time correctly"
  → Send GET to /api/slow/200
  → Assert: response time >= 200ms and < 500ms

// === Error Handling ===
- "Proxy returns error for connection refused"
  → Send request to http://localhost:9999 (nothing running there)
  → Assert: proxy returns error response with meaningful message, does NOT crash

- "Proxy returns error for invalid URL"
  → Send request to "not-a-url"
  → Assert: proxy returns error response

- "Proxy handles malformed JSON response gracefully"
  → Send GET to /api/error/malformed-json
  → Assert: proxy returns body as raw text, does not crash

// === Request Chaining (env variable flow) ===
- "Full chain: login → save token → authenticated request"
  → Step 1: POST to /api/chain/login → get token from response
  → Step 2: GET to /api/chain/protected with Bearer {token}
  → Assert: status 200, body has data: "secret"
```

#### `requestFlow.test.js`

Test the full request pipeline including variable resolution and script execution (no browser, just the logic).

```
Test cases:
- "Variable resolution: URL with {{baseUrl}} resolves before proxy call"
- "Pre-request script modifies headers before sending"
- "Pre-request script modifies URL before sending"
- "Test script executes after response and returns results"
- "Post-request script saves value to environment"
- "Full flow: pre-request injects auth → request → test validates → post-request saves"
- "Script error does not block response from being returned"
```

---

### Layer 4: End-to-End Tests (`tests/e2e/`)

Use **Playwright**. These tests run the real ReqPilot UI in a browser and interact with it. They use the mock API server as the target.

```javascript
// Global setup: start mock server on 4444, start ReqPilot (npm run dev) on 5173
// Global teardown: stop both
```

#### `send-request.spec.js`
```
Test cases:
- "Can type URL and send GET request"
  → Type "http://localhost:4444/api/users" in URL bar
  → Click Send
  → Assert: response panel shows status 200, body contains users

- "Can switch method to POST and send with body"
  → Select POST from method dropdown
  → Type URL
  → Switch to Body tab, select JSON, type body
  → Click Send
  → Assert: status 201

- "Can add custom headers"
  → Switch to Headers tab
  → Type "X-Custom" in key, "test-value" in value
  → Send request to /api/echo/headers
  → Assert: response body contains x-custom: test-value

- "Can set Bearer auth"
  → Switch to Auth tab, select Bearer, type "test-token-123"
  → Send GET to /api/auth/bearer
  → Assert: status 200

- "Keyboard shortcut Ctrl+Enter sends request"
  → Focus URL bar, type URL
  → Press Ctrl+Enter
  → Assert: response appears

- "Params tab syncs with URL query string"
  → Type URL with ?foo=bar
  → Switch to Params tab
  → Assert: key "foo" with value "bar" appears
  → Modify value to "baz"
  → Assert: URL updates to ?foo=baz

- "JSON body validation shows error for invalid JSON"
  → Switch to Body tab, select JSON
  → Type invalid JSON: { broken
  → Assert: red error indicator appears

- "Shows loading state while request is in flight"
  → Send request to /api/slow/1000
  → Assert: loading spinner visible
  → Wait for response
  → Assert: spinner gone, response shown

- "Displays error state for failed requests"
  → Send request to http://localhost:9999 (nothing running)
  → Assert: error message shown in response panel, not a crash
```

#### `collections.spec.js`
```
Test cases:
- "Can open Collections drawer"
- "Can create a new collection"
- "Can save current request to collection"
- "Can load request from collection"
- "Can export collection as JSON"
- "Can import collection from JSON file"
- "Collections persist after page reload"
```

#### `import.spec.js`
```
Test cases:
- "Can open import modal"
- "Can import Postman v2.1 collection file"
  → Upload fixture file
  → Assert: preview shows correct number of requests and folders
  → Click Import
  → Assert: collection appears in Collections drawer with correct requests

- "Can import OpenAPI 3.0 JSON file"
  → Upload fixture file
  → Assert: preview shows correct endpoints
  → Import
  → Assert: collection created with requests matching paths

- "Can import Swagger 2.0 YAML file"
  → Upload YAML fixture
  → Assert: correctly parsed and imported

- "Import shows warning for invalid files"
  → Upload a random .txt file
  → Assert: error message shown

- "Can selectively import requests (uncheck some)"
  → Upload fixture
  → Uncheck 2 requests
  → Import
  → Assert: only selected requests imported
```

#### `theme.spec.js`
```
Test cases:
- "Default theme matches system preference"
- "Can toggle from dark to light theme"
  → Click theme toggle
  → Assert: background color changes to light palette
  → Assert: text colors update

- "Can toggle back to dark"
  → Click theme toggle twice
  → Assert: back to dark palette

- "Theme persists after reload"
  → Switch to light
  → Reload page
  → Assert: still light theme

- "All method colors are visible in both themes"
  → For each theme: check that GET/POST/PUT/DELETE badges are visible and contrast meets 3:1
```

#### `accessibility.spec.js`
```
Test cases:
- "Skip to main content link works"
  → Tab once
  → Assert: skip link focused
  → Press Enter
  → Assert: main content focused

- "All interactive elements are keyboard accessible"
  → Tab through entire UI
  → Assert: every button, input, tab, dropdown is reachable
  → Assert: no focus traps (except inside modals)

- "Method dropdown is keyboard navigable"
  → Tab to method selector
  → Press Enter to open
  → Use arrow keys to navigate
  → Press Enter to select
  → Assert: method changed

- "Command palette is keyboard accessible"
  → Press Cmd+K
  → Assert: dialog opens, search input focused
  → Type "history"
  → Press Enter
  → Assert: history drawer opens

- "All form inputs have accessible labels"
  → Use Playwright accessibility snapshot
  → Assert: no inputs without labels

- "Response tab panel has correct ARIA roles"
  → Assert: tablist, tab, tabpanel roles present
  → Assert: aria-selected updates on tab click

- "Focus is trapped in modal when open"
  → Open import modal
  → Tab repeatedly
  → Assert: focus stays within modal
  → Press Escape
  → Assert: focus returns to trigger button

- "Focus visible indicators appear on keyboard navigation"
  → Tab to a button
  → Assert: focus outline is visible (computed style includes outline)
```

---

### Test Fixture Files

Generate realistic fixture files for all import tests.

#### `tests/fixtures/postman-v2.1-collection.json`
A Postman collection with:
- 3 folders (Users, Auth, Settings)
- 8 total requests across folders
- Mix of GET, POST, PUT, DELETE
- Some requests have Bearer auth
- Some requests have JSON bodies
- 2 requests have pre-request scripts with `pm.environment.set()`
- 2 requests have test scripts with `pm.test()` and `pm.expect()`
- Collection-level variables: `{{baseUrl}}`, `{{apiVersion}}`

#### `tests/fixtures/postman-v2.0-collection.json`
Same logical content as v2.1 but using v2.0 schema format (URL as string not object, etc.)

#### `tests/fixtures/postman-environment.json`
Environment file with 5 variables: baseUrl, apiVersion, authToken (disabled), userId, timeout

#### `tests/fixtures/swagger-2.0.json` and `swagger-2.0.yaml`
Swagger 2.0 spec with:
- host: "api.example.com", basePath: "/v1"
- 4 paths, 8 operations total
- securityDefinitions: apiKey and basic
- definitions with User, Post, Error schemas
- Parameters: mix of query, header, path, body

#### `tests/fixtures/openapi-3.0.json` and `openapi-3.0.yaml`
OpenAPI 3.0.3 spec with:
- servers: [{ url: "https://api.example.com/v2" }]
- 5 paths, 10 operations
- components.securitySchemes: bearer and apiKey
- components.schemas with $ref usage
- requestBody with JSON schemas and examples
- parameters with all types

#### `tests/fixtures/openapi-3.1.json`
OpenAPI 3.1.0 spec with:
- Updated JSON Schema support (type arrays instead of nullable)
- webhooks section with 2 webhooks
- $ref usage across schemas

#### `tests/fixtures/openapi-circular-ref.json`
OpenAPI 3.0 spec where Schema A references Schema B which references Schema A (circular)

#### `tests/fixtures/postman-deeply-nested.json`
Postman collection with 6 levels of nested folders (to test flattening)

---

### Test Configuration

#### `vitest.config.js`
```javascript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    include: ['tests/unit/**/*.test.js', 'tests/integration/**/*.test.js'],
    testTimeout: 15000,
    hookTimeout: 10000,
  },
});
```

#### `playwright.config.js`
```javascript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'node tests/mock-server/mock-api-server.js',
      port: 4444,
      reuseExistingServer: true,
    },
    {
      command: 'npm run dev',
      port: 5173,
      reuseExistingServer: true,
    },
  ],
});
```

---

### npm scripts summary
```
npm test            → runs unit + integration tests (vitest)
npm run test:unit   → unit tests only
npm run test:integration → integration tests only (starts mock server automatically)
npm run test:e2e    → E2E tests (starts mock server + dev server automatically via Playwright)
npm run test:all    → everything: vitest + playwright
npm run mock-server → starts mock server standalone for manual testing
```

---

## Build Order

Build this step by step. Write tests alongside each feature, not after.

1. **Mock API server** — build and test this FIRST. Run it, curl every endpoint, verify responses. This is your test foundation.
2. Express proxy server + proxy tests against mock server
3. Theme system: CSS variables in globals.css, useTheme hook, ThemeToggle component (build EARLY so all subsequent components use variables)
4. Basic React shell with layout
5. Request builder (URL bar, method selector, send button) + E2E test: send GET
6. Key-value editor component (reusable)
7. Params tab with URL sync + unit tests for URL↔params sync
8. Headers tab with autocomplete + E2E test: custom headers
9. Body editor with JSON validation + unit test for validation
10. Auth tab + E2E test: bearer/basic/apikey against mock server
11. Response viewer (status, body, headers) + E2E test: verify response display
12. JSON syntax highlighting + tree view
13. Script executor engine + full unit tests for rp.* API
14. Pre-request script tab + integration test: script modifies request
15. Tests script tab + editor + snippets
16. Post-request script tab
17. Test Results tab in response viewer
18. Integration test: full pre-request → send → test → post-request flow
19. Variable resolver + unit tests
20. Environment variables UI
21. History drawer + E2E test: verify history population
22. Collections drawer + E2E test: save, load, export, import
23. Command palette (⌘K) + E2E test: keyboard navigation
24. Import system: detector + Postman parser + OpenAPI parser + unit tests for each
25. Import modal UI + E2E test: import each fixture file
26. Keyboard shortcuts + E2E tests
27. Full accessibility audit + E2E accessibility tests
28. Reduced motion media queries
29. Theme E2E tests (toggle, persist, contrast)
30. Polish, empty states, error handling
31. Final: run `npm run test:all` — everything must pass
32. Final build + `npx reqpilot` packaging test
