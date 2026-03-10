# Architecture

This diagram set reflects the current ReqPilot implementation (`React SPA + Node/Express local backend`) and is suitable for enterprise technical review.

## 1. System Context

```mermaid
flowchart LR
    User[Developer / QA / SRE]\n(Browser)] --> SPA[ReqPilot React SPA\nVite-built UI]

    SPA --> LS[(Browser localStorage)]
    SPA --> API[ReqPilot Local Backend\nNode + Express\nhttp://localhost:5489]

    API --> EXT[Target APIs\nREST endpoints]
    API --> PROXY[Corporate Proxy\nHTTP_PROXY / HTTPS_PROXY / NO_PROXY]
    API --> GIT[Git CLI]

    GIT --> LOCALREPO[Local Git Workspace\n~/.reqpilot/workspaces/*]
    GIT --> REMOTE[Remote Git Host\nGitHub / GitLab / Bitbucket]

    API -. optional .-> MOCK[Local Mock API\nhttp://localhost:4444]
```

## 2. Container / Component View

```mermaid
flowchart TB
    subgraph Browser[Browser Runtime]
      App[App.jsx Orchestrator]
      RB[RequestBuilder]
      RV[ResponseViewer]
      SB[Sidebar\nCollections/Env/History/Console]
      WM[WorkspaceManager]

      H1[useRequestSender]
      H2[useSecuritySettings]
      H3[useWorkspaces/useCollections/useEnvironments/useHistory/useConsole]

      U1[utils/httpClient.js]
      U2[utils/scriptExecutor.js]
      U3[utils/variableResolver.js]
      U4[utils/gitClient.js + workspaceClient.js + systemClient.js]

      Store[(localStorage\nworkspace-scoped state)]

      App --> RB
      App --> RV
      App --> SB
      App --> WM
      App --> H1
      App --> H2
      App --> H3

      H1 --> U2
      H1 --> U1
      H1 --> U3
      H2 --> Store
      H3 --> Store
      U4 --> App
    end

    subgraph LocalServer[Local Backend Runtime]
      S1[/POST /proxy/]
      S2[/GET /system/proxy/]
      S3[/POST /git/*/]
      S4[/POST /workspace/*/]
      Core[src/server/proxyApp.js\nexecuteProxyRequest + git orchestration]
    end

    U1 --> S1
    U4 --> S2
    U4 --> S3
    U4 --> S4

    S1 --> Core
    S2 --> Core
    S3 --> Core
    S4 --> Core
```

## 3. Request Execution Sequence

```mermaid
sequenceDiagram
    participant U as User
    participant UI as React UI
    participant RS as useRequestSender
    participant SE as scriptExecutor
    participant HC as httpClient
    participant BE as /proxy backend
    participant TA as Target API

    U->>UI: Click Send
    UI->>RS: sendRequest(request)

    RS->>SE: Execute pre-request script
    SE-->>RS: mutated request + env updates + logs

    RS->>HC: buildProxyPayload(request, security)
    HC->>BE: POST /proxy
    BE->>TA: HTTP/HTTPS request\n(TLS/proxy policy applied)
    TA-->>BE: response
    BE-->>HC: {status, headers, body, time, size}
    HC-->>RS: normalized response

    RS->>SE: Execute tests script
    SE-->>RS: testResults
    RS->>SE: Execute post-request script
    SE-->>RS: env updates + logs + testResults

    RS-->>UI: response + tests + logs + resolved security
    UI->>UI: Persist history + console entries (localStorage)
```

## 4. Security and Trust Boundaries

```mermaid
flowchart LR
    subgraph TrustedEndpoint[Developer Machine - Trusted Boundary]
      B[Browser UI]
      L[Local ReqPilot Backend\nNode/Express]
      F[(local files + git repos)]
    end

    subgraph External[External Boundary]
      A[Remote APIs]
      P[Enterprise Proxy]
      R[Remote Git Hosting]
    end

    B -->|only localhost calls| L
    L -->|outbound HTTP/HTTPS| A
    L -->|proxy-aware outbound| P
    L -->|git CLI + filesystem| F
    F -->|git push/pull| R
```

## 5. Backend API Surface (Current)

| Endpoint | Method | Purpose |
|---|---|---|
| `/proxy` | POST | Execute outbound API request with TLS/proxy settings |
| `/health` | GET | Backend health probe |
| `/system/proxy` | GET | Read masked system proxy environment values |
| `/git/status` | POST | Git status for workspace repo |
| `/git/fetch` | POST | `git fetch --all --prune` |
| `/git/pull` | POST | `git pull --rebase --autostash` with conflict signaling |
| `/git/add` | POST | `git add -A` |
| `/git/commit` | POST | `git commit -m` |
| `/git/push` | POST | `git push` |
| `/workspace/bootstrap` | POST | Create managed workspace layout and initialize repo |
| `/workspace/set-remote` | POST | Configure `origin` remote URL |
| `/workspace/publish` | POST | Stage + optional commit + push |

## 6. Non-Functional Characteristics

- Local-first persistence: browser `localStorage` by workspace for requests, collections, envs, history, console, security settings.
- No server-side database dependency in current architecture.
- Enterprise network compatibility via backend-side proxy support (`ProxyAgent`) and request-level proxy overrides.
- TLS control at global + host + request scope, including optional CA/client cert/key/passphrase.
- Collaboration model: Git-native workspace sync via backend git command wrappers.

