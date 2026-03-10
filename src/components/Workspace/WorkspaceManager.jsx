import { useEffect, useMemo, useState } from 'react';
import styles from './WorkspaceManager.module.css';
import { gitAdd, gitCommit, gitFetch, gitPull, gitPush, gitStatus } from '../../utils/gitClient.js';
import { bootstrapWorkspace, publishWorkspace, setWorkspaceRemote } from '../../utils/workspaceClient.js';

function formatWorkspaceDate(value) {
  if (!value) return 'recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'recently';
  return date.toLocaleDateString();
}

function joinOutput(result = {}) {
  const chunks = [result.stdout, result.stderr, result.output]
    .filter(Boolean)
    .map((entry) => String(entry).trim())
    .filter(Boolean);
  return chunks.length ? chunks.join('\n\n') : 'Done';
}

export function WorkspaceManager({
  workspaces,
  activeWorkspace,
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
  onUpdateWorkspace,
  onClose,
}) {
  const [nameInput, setNameInput] = useState('');
  const [gitEnabledInput, setGitEnabledInput] = useState(false);
  const [createRemoteInput, setCreateRemoteInput] = useState('');
  const [remoteInput, setRemoteInput] = useState(activeWorkspace?.remoteUrl || '');
  const [gitPathInput, setGitPathInput] = useState(activeWorkspace?.repoPath || '');
  const [isRunning, setIsRunning] = useState(false);
  const [gitResult, setGitResult] = useState('');
  const [gitError, setGitError] = useState('');
  const [conflictWarning, setConflictWarning] = useState('');
  const [gitState, setGitState] = useState(null);
  const [commitMessage, setCommitMessage] = useState('Update API assets');

  const hasGitRepo = Boolean((activeWorkspace?.repoPath || '').trim());
  const isManagedWorkspace = Boolean(activeWorkspace?.gitManaged);
  const branchText = useMemo(() => {
    if (!gitState) return 'No git data loaded';
    const ahead = gitState.ahead ? `↑${gitState.ahead}` : '';
    const behind = gitState.behind ? `↓${gitState.behind}` : '';
    return [gitState.branch || 'detached', ahead, behind].filter(Boolean).join(' ');
  }, [gitState]);

  useEffect(() => {
    setGitPathInput(activeWorkspace?.repoPath || '');
    setRemoteInput(activeWorkspace?.remoteUrl || '');
    setGitResult('');
    setGitError('');
    setConflictWarning('');
    setGitState(null);
  }, [activeWorkspace?.id, activeWorkspace?.repoPath, activeWorkspace?.remoteUrl]);

  async function refreshGitStatus(customPath) {
    const repoPath = String(customPath || activeWorkspace?.repoPath || '').trim();
    if (!repoPath) return;

    setIsRunning(true);
    setGitError('');
    try {
      const data = await gitStatus(repoPath);
      setGitState(data);
      setGitResult(joinOutput(data));
    } catch (error) {
      setGitError(error.message || 'Failed to load git status');
      setGitResult(joinOutput(error.details || {}));
    } finally {
      setIsRunning(false);
    }
  }

  async function runGitAction(actionLabel, actionFn) {
    const repoPath = String(activeWorkspace?.repoPath || '').trim();
    if (!repoPath) return;

    setIsRunning(true);
    setGitError('');
    setConflictWarning('');
    try {
      const result = await actionFn(repoPath);
      setGitResult(`${actionLabel}\n\n${joinOutput(result)}`);
      await refreshGitStatus(repoPath);
    } catch (error) {
      const details = error.details || {};
      const combined = joinOutput(details);
      if (details.conflict || /conflict/i.test(combined)) {
        setConflictWarning('Pull conflict detected. Resolve conflicts in an external Git client, then refresh status.');
      }
      setGitError(error.message || `${actionLabel} failed`);
      setGitResult(`${actionLabel}\n\n${combined}`);
      await refreshGitStatus(repoPath);
    } finally {
      setIsRunning(false);
    }
  }

  async function publishNow() {
    const repoPath = String(activeWorkspace?.repoPath || '').trim();
    if (!repoPath) return;

    setIsRunning(true);
    setGitError('');
    setConflictWarning('');
    try {
      const result = await publishWorkspace(repoPath, commitMessage.trim() || undefined);
      setGitResult(`Publish\n\n${joinOutput(result)}`);
      await refreshGitStatus(repoPath);
    } catch (error) {
      setGitError(error.message || 'Publish failed');
      setGitResult(`Publish\n\n${joinOutput(error.details || {})}`);
      await refreshGitStatus(repoPath);
    } finally {
      setIsRunning(false);
    }
  }

  async function saveRemote() {
    const repoPath = String(activeWorkspace?.repoPath || '').trim();
    const remoteUrl = String(remoteInput || '').trim();
    if (!repoPath || !remoteUrl) return;

    setIsRunning(true);
    setGitError('');
    try {
      const result = await setWorkspaceRemote(repoPath, remoteUrl);
      onUpdateWorkspace(activeWorkspace.id, { remoteUrl });
      setGitResult(`Remote configured\n\n${joinOutput(result)}`);
      await refreshGitStatus(repoPath);
    } catch (error) {
      setGitError(error.message || 'Failed to save remote');
      setGitResult(joinOutput(error.details || {}));
    } finally {
      setIsRunning(false);
    }
  }

  function saveRepoPath() {
    if (!activeWorkspace) return;
    onUpdateWorkspace(activeWorkspace.id, { repoPath: gitPathInput });
  }

  async function bootstrapManagedWorkspace(workspace) {
    const remoteUrl = String(workspace.remoteUrl || '').trim();
    const result = await bootstrapWorkspace({
      workspaceId: workspace.id,
      name: workspace.name,
      remoteUrl,
    });

    onUpdateWorkspace(workspace.id, {
      gitManaged: true,
      repoPath: result.repoPath,
      workspacePath: result.workspacePath || result.repoPath,
      remoteUrl: result.remoteUrl || remoteUrl,
    });

    if (Array.isArray(result.warnings) && result.warnings.length) {
      setConflictWarning(result.warnings.join(' '));
    }

    setGitResult(result.output || 'Workspace scaffold created.');
    await refreshGitStatus(result.repoPath);
  }

  async function initializeManagedLayout() {
    if (!activeWorkspace) return;
    setIsRunning(true);
    setGitError('');
    setConflictWarning('');
    try {
      await bootstrapManagedWorkspace(activeWorkspace);
    } catch (error) {
      setGitError(error.message || 'Failed to initialize managed workspace');
      setGitResult(joinOutput(error.details || {}));
    } finally {
      setIsRunning(false);
    }
  }

  async function onCreateSubmit(event) {
    event.preventDefault();
    const name = nameInput.trim();
    if (!name) return;

    if (!gitEnabledInput) {
      onCreateWorkspace({ name });
      setNameInput('');
      setCreateRemoteInput('');
      return;
    }

    const workspace = onCreateWorkspace({
      name,
      gitManaged: true,
      remoteUrl: createRemoteInput.trim(),
    });

    setIsRunning(true);
    setGitError('');
    setConflictWarning('');
    try {
      await bootstrapManagedWorkspace(workspace);
      setNameInput('');
      setCreateRemoteInput('');
      setGitEnabledInput(false);
    } catch (error) {
      setGitError(error.message || 'Workspace was created but bootstrap failed');
      setGitResult(joinOutput(error.details || {}));
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <>
      <button type="button" className={styles.overlay} aria-hidden="true" onClick={onClose} />
      <section className={styles.modal} role="dialog" aria-modal="true" aria-label="Workspace Manager">
        <header className={styles.header}>
          <div className={styles.headerCopy}>
            <h2>Workspace Manager</h2>
            <p>Switch workspaces and configure Git sync safely.</p>
          </div>
          <button type="button" className={styles.close} onClick={onClose}>
            Close
          </button>
        </header>

        <div className={styles.body}>
          <aside className={styles.sidebar}>
            <span className={styles.label}>Workspaces</span>
            <div className={styles.workspaceList}>
              {workspaces.map((workspace) => {
                const isActive = workspace.id === activeWorkspaceId;
                return (
                  <article
                    key={workspace.id}
                    className={`${styles.workspaceCard} ${isActive ? styles.workspaceCardActive : ''}`}
                  >
                    <div className={styles.workspaceNameRow}>
                      <span className={styles.workspaceName}>{workspace.name}</span>
                      {isActive ? <span className={styles.badge}>Active</span> : null}
                    </div>
                    <span className={styles.workspaceMeta}>{workspace.gitManaged ? 'Managed Git workspace' : workspace.repoPath ? 'Git connected' : 'Local workspace'}</span>
                    <div className={styles.workspaceCardActions}>
                      <span className={styles.workspaceMeta}>Created {formatWorkspaceDate(workspace.createdAt)}</span>
                      {isActive ? (
                        <span className={styles.statePill}>Opened</span>
                      ) : (
                        <button type="button" className={styles.openButton} onClick={() => onSelectWorkspace(workspace.id)}>
                          Open
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            <p className={styles.sidebarHint}>Tip: managed Git workspaces are scaffolded in a safe ReqPilot location automatically.</p>
          </aside>

          <div className={styles.main}>
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Create Workspace</h3>
              <form className={styles.createInline} onSubmit={onCreateSubmit}>
                <input
                  className={styles.input}
                  value={nameInput}
                  onChange={(event) => setNameInput(event.target.value)}
                  placeholder="Workspace name"
                  aria-label="New workspace name"
                />
                <label className={styles.toggleRow}>
                  <input
                    type="checkbox"
                    checked={gitEnabledInput}
                    onChange={(event) => setGitEnabledInput(event.target.checked)}
                  />
                  Git-enabled (managed layout)
                </label>
                {gitEnabledInput ? (
                  <>
                    <input
                      className={styles.input}
                      value={createRemoteInput}
                      onChange={(event) => setCreateRemoteInput(event.target.value)}
                      placeholder="Optional remote repository URL"
                      aria-label="New workspace remote URL"
                    />
                    <p className={styles.helper}>ReqPilot creates this workspace under `~/.reqpilot/workspaces` with a standard `.reqpilot` layout.</p>
                  </>
                ) : null}
                <button type="submit" className={styles.createButton} disabled={isRunning}>
                  Create & Open
                </button>
              </form>
            </section>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Selected Workspace</h3>
              <dl className={styles.metaGrid}>
                <div>
                  <dt>Name</dt>
                  <dd>{activeWorkspace?.name || 'Workspace'}</dd>
                </div>
                <div>
                  <dt>Created</dt>
                  <dd>{formatWorkspaceDate(activeWorkspace?.createdAt)}</dd>
                </div>
                <div>
                  <dt>Mode</dt>
                  <dd>{isManagedWorkspace ? 'Managed Git' : hasGitRepo ? 'Git Linked' : 'Local'}</dd>
                </div>
              </dl>

              {isManagedWorkspace ? (
                <>
                  <input
                    className={`${styles.input} ${styles.inputReadonly}`}
                    value={activeWorkspace?.workspacePath || activeWorkspace?.repoPath || ''}
                    readOnly
                    placeholder="Workspace path"
                    aria-label="Managed workspace path"
                  />

                  {!hasGitRepo ? (
                    <div className={styles.row}>
                      <button
                        type="button"
                        className={`${styles.action} ${styles.actionPrimary}`}
                        onClick={initializeManagedLayout}
                        disabled={isRunning}
                      >
                        Initialize Layout
                      </button>
                    </div>
                  ) : null}

                  <div className={styles.row}>
                    <input
                      className={styles.input}
                      value={remoteInput}
                      onChange={(event) => setRemoteInput(event.target.value)}
                      placeholder="Remote URL (origin)"
                      aria-label="Workspace remote URL"
                    />
                    <button
                      type="button"
                      className={styles.action}
                      onClick={saveRemote}
                      disabled={isRunning || !hasGitRepo || !remoteInput.trim()}
                    >
                      Save Remote
                    </button>
                    <button
                      type="button"
                      className={`${styles.action} ${styles.actionPrimary}`}
                      onClick={publishNow}
                      disabled={isRunning || !hasGitRepo || !remoteInput.trim()}
                    >
                      Publish
                    </button>
                  </div>
                </>
              ) : (
                <div className={styles.row}>
                  <input
                    className={styles.input}
                    value={gitPathInput}
                    onChange={(event) => setGitPathInput(event.target.value)}
                    placeholder="Git repository path (local)"
                    aria-label="Workspace git repository path"
                  />
                  <button type="button" className={styles.action} onClick={saveRepoPath}>
                    Save
                  </button>
                  <button
                    type="button"
                    className={styles.action}
                    onClick={() => refreshGitStatus(gitPathInput)}
                    disabled={!gitPathInput.trim() || isRunning}
                  >
                    Check Repo
                  </button>
                </div>
              )}
              <p className={styles.helper}>
                Keep conflicts external for safety. ReqPilot supports fetch, pull, stage/add, commit, and push.
              </p>
            </section>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Git Sync</h3>
              {hasGitRepo ? (
                <>
                  <p className={styles.meta}>Branch: {branchText}</p>
                  <div className={styles.row}>
                    <button
                      type="button"
                      className={styles.action}
                      disabled={isRunning}
                      onClick={() => runGitAction('Fetch', gitFetch)}
                    >
                      Fetch
                    </button>
                    <button
                      type="button"
                      className={styles.action}
                      disabled={isRunning}
                      onClick={() => runGitAction('Pull', gitPull)}
                    >
                      Pull
                    </button>
                    <button
                      type="button"
                      className={styles.action}
                      disabled={isRunning}
                      onClick={() => runGitAction('Stage All', gitAdd)}
                    >
                      Stage All
                    </button>
                    <button
                      type="button"
                      className={styles.action}
                      disabled={isRunning}
                      onClick={() => runGitAction('Push', gitPush)}
                    >
                      Push
                    </button>
                  </div>

                  <div className={styles.row}>
                    <input
                      className={styles.input}
                      value={commitMessage}
                      onChange={(event) => setCommitMessage(event.target.value)}
                      placeholder="Commit message"
                      aria-label="Git commit message"
                    />
                    <button
                      type="button"
                      className={`${styles.action} ${styles.actionPrimary}`}
                      disabled={isRunning || !commitMessage.trim()}
                      onClick={() =>
                        runGitAction('Commit', (repoPath) => gitCommit(repoPath, commitMessage.trim()))
                      }
                    >
                      Commit
                    </button>
                  </div>

                  {gitState?.changes?.length ? (
                    <ul className={styles.changes} aria-label="Git changed files">
                      {gitState.changes.slice(0, 12).map((entry, index) => (
                        <li key={`${entry.path}-${index}`}>
                          <span className={styles.code}>{entry.code}</span>
                          <span>{entry.path}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.empty}>No local file changes.</p>
                  )}
                </>
              ) : (
                <p className={styles.empty}>Create a git-enabled workspace or connect a local repository path to enable Git actions.</p>
              )}

              {conflictWarning ? <p className={styles.warning}>{conflictWarning}</p> : null}
              {gitError ? <p className={styles.warning}>{gitError}</p> : null}
              <pre className={styles.output}>{gitResult || 'Run a git action to see output.'}</pre>
            </section>
          </div>
        </div>
      </section>
    </>
  );
}
