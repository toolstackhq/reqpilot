import { useEffect, useMemo, useState } from 'react';
import styles from './WorkspaceManager.module.css';
import { gitAdd, gitCommit, gitFetch, gitPull, gitPush, gitStatus } from '../../utils/gitClient.js';

function formatWorkspaceDate(value) {
  if (!value) return 'recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'recently';
  return date.toLocaleDateString();
}

function joinOutput(result = {}) {
  const chunks = [result.stdout, result.stderr].filter(Boolean).map((entry) => String(entry).trim()).filter(Boolean);
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
  const [repoInput, setRepoInput] = useState('');
  const [gitPathInput, setGitPathInput] = useState(activeWorkspace?.repoPath || '');
  const [isRunning, setIsRunning] = useState(false);
  const [gitResult, setGitResult] = useState('');
  const [gitError, setGitError] = useState('');
  const [conflictWarning, setConflictWarning] = useState('');
  const [gitState, setGitState] = useState(null);
  const [commitMessage, setCommitMessage] = useState('Update API assets');

  const hasGitRepo = Boolean((activeWorkspace?.repoPath || '').trim());
  const branchText = useMemo(() => {
    if (!gitState) return 'No git data loaded';
    const ahead = gitState.ahead ? `↑${gitState.ahead}` : '';
    const behind = gitState.behind ? `↓${gitState.behind}` : '';
    return [gitState.branch || 'detached', ahead, behind].filter(Boolean).join(' ');
  }, [gitState]);

  useEffect(() => {
    setGitPathInput(activeWorkspace?.repoPath || '');
    setGitResult('');
    setGitError('');
    setConflictWarning('');
    setGitState(null);
  }, [activeWorkspace?.id, activeWorkspace?.repoPath]);

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

  function saveRepoPath() {
    if (!activeWorkspace) return;
    onUpdateWorkspace(activeWorkspace.id, { repoPath: gitPathInput });
  }

  function onCreateSubmit(event) {
    event.preventDefault();
    const name = nameInput.trim();
    if (!name) return;

    onCreateWorkspace({ name, repoPath: repoInput.trim() });
    setNameInput('');
    setRepoInput('');
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
                    <span className={styles.workspaceMeta}>{workspace.repoPath ? 'Git connected' : 'Git not connected'}</span>
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
            <p className={styles.sidebarHint}>Tip: use the top bar workspace menu to reopen this manager anytime.</p>
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
                <input
                  className={styles.input}
                  value={repoInput}
                  onChange={(event) => setRepoInput(event.target.value)}
                  placeholder="Optional git repo path"
                  aria-label="New workspace git repo path"
                />
                <button type="submit" className={styles.createButton}>
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
                  <dt>Git</dt>
                  <dd>{hasGitRepo ? 'Connected' : 'Not connected'}</dd>
                </div>
              </dl>
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
                <p className={styles.empty}>Set repository path in this workspace to enable Git actions.</p>
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
