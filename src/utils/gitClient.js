async function postGit(pathname, payload = {}) {
  const response = await fetch(pathname, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    const error = new Error(data.error || data.stderr || `Git command failed (${response.status})`);
    error.details = data;
    throw error;
  }

  return data;
}

export async function gitStatus(repoPath) {
  return postGit('/git/status', { repoPath });
}

export async function gitFetch(repoPath) {
  return postGit('/git/fetch', { repoPath });
}

export async function gitPull(repoPath) {
  return postGit('/git/pull', { repoPath });
}

export async function gitAdd(repoPath) {
  return postGit('/git/add', { repoPath });
}

export async function gitCommit(repoPath, message) {
  return postGit('/git/commit', { repoPath, message });
}

export async function gitPush(repoPath) {
  return postGit('/git/push', { repoPath });
}
