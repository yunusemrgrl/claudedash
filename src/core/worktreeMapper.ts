import type { ClaudeSession, WorktreeState } from './types.js';

/**
 * Maps sessions and their tasks to the worktree whose path best matches
 * the session's cwd. Uses longest-prefix matching to resolve ambiguous cases
 * (e.g. multiple sessions sharing the same worktree).
 *
 * Returns enriched WorktreeState objects with `associatedTasks` populated.
 */
export function mapTasksToWorktrees(
  sessions: ClaudeSession[],
  worktrees: WorktreeState[]
): WorktreeState[] {
  // Clone worktrees to avoid mutating the originals
  const enriched: WorktreeState[] = worktrees.map(w => ({ ...w, associatedTasks: [] }));

  for (const session of sessions) {
    const cwd = session.cwd;
    if (!cwd) continue;

    // Find the worktree whose path is the longest prefix of cwd
    let best: WorktreeState | null = null;
    let bestLen = -1;

    for (const wt of enriched) {
      const normalizedPath = wt.path.endsWith('/') ? wt.path : wt.path + '/';
      const normalizedCwd = cwd.endsWith('/') ? cwd : cwd + '/';

      if (normalizedCwd.startsWith(normalizedPath) && wt.path.length > bestLen) {
        best = wt;
        bestLen = wt.path.length;
      }
    }

    if (!best) continue;

    for (const task of session.tasks) {
      best.associatedTasks!.push({
        sessionId: session.id,
        taskId: task.id,
        taskSubject: task.subject,
      });
    }
  }

  return enriched;
}
