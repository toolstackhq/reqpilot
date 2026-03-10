async function postWorkspace(pathname, payload = {}) {
  const response = await fetch(pathname, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    const error = new Error(data.error || `Workspace operation failed (${response.status})`);
    error.details = data;
    throw error;
  }

  return data;
}

export async function bootstrapWorkspace(payload) {
  return postWorkspace('/workspace/bootstrap', payload);
}

export async function setWorkspaceRemote(repoPath, remoteUrl) {
  return postWorkspace('/workspace/set-remote', { repoPath, remoteUrl });
}

export async function publishWorkspace(repoPath, message) {
  return postWorkspace('/workspace/publish', { repoPath, message });
}
