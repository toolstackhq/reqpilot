# Workspaces and Git

Workspaces isolate collections, environment values, history, and console logs.

## Workspace Model

- `Personal Workspace` exists by default.
- New workspaces can be created for projects or teams.
- Switching workspace swaps your API context immediately.

<div class="rp-shot">
  <img src="/screenshots/workspace-manager.png" alt="Workspace manager with Git options" />
</div>

## Git-enabled Workspace (Managed Layout)

When `Git-enabled (managed layout)` is selected on workspace creation, ReqPilot scaffolds a safe local structure and enables Git actions from the UI.

Supported actions inside ReqPilot:

- `Fetch`
- `Pull`
- `Stage All`
- `Commit`
- `Push`

Conflict resolution is intentionally external (your Git client/editor) for safety and clarity.

## Suggested Team Flow

1. Create one workspace per service/domain.
2. Connect remote repository URL.
3. Save collections and environments in that workspace.
4. Stage/commit/push from ReqPilot for normal sync.
5. Resolve conflicts externally, then refresh status.
