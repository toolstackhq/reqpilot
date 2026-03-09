import { describe, expect, test } from 'vitest';
import { parseGitStatusOutput } from '../../src/server/proxyApp.js';

describe('parseGitStatusOutput', () => {
  test('parses branch + ahead/behind + changes', () => {
    const input = `## main...origin/main [ahead 2, behind 1]\n M src/App.jsx\nA  src/new.js\n`;
    const parsed = parseGitStatusOutput(input);

    expect(parsed.branch).toBe('main');
    expect(parsed.ahead).toBe(2);
    expect(parsed.behind).toBe(1);
    expect(parsed.clean).toBe(false);
    expect(parsed.changes).toEqual([
      { code: 'M', path: 'src/App.jsx' },
      { code: 'A', path: 'src/new.js' },
    ]);
  });

  test('handles clean repositories', () => {
    const input = '## main...origin/main\n';
    const parsed = parseGitStatusOutput(input);

    expect(parsed.branch).toBe('main');
    expect(parsed.clean).toBe(true);
    expect(parsed.changes).toHaveLength(0);
  });
});
