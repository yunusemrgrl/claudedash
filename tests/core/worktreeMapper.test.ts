import { describe, it, expect } from 'vitest';
import { mapTasksToWorktrees } from '../../src/core/worktreeMapper.js';
import type { ClaudeSession, WorktreeState } from '../../src/core/types.js';

function makeWorktree(path: string): WorktreeState {
  return { path, branch: 'main', head: 'abc', dirty: false, aheadCount: 0, behindCount: 0 };
}

function makeSession(id: string, cwd?: string, taskIds: string[] = []): ClaudeSession {
  return {
    id,
    tasks: taskIds.map(tid => ({
      id: tid,
      subject: `Task ${tid}`,
      description: '',
      activeForm: '',
      status: 'pending',
      blocks: [],
      blockedBy: [],
    })),
    createdAt: '2026-02-18T00:00:00Z',
    updatedAt: '2026-02-18T00:00:00Z',
    cwd,
  };
}

describe('mapTasksToWorktrees', () => {
  it('should return worktrees with empty associatedTasks when no sessions', () => {
    const worktrees = [makeWorktree('/home/user/project')];
    const result = mapTasksToWorktrees([], worktrees);

    expect(result).toHaveLength(1);
    expect(result[0].associatedTasks).toEqual([]);
  });

  it('should map a session to matching worktree by cwd', () => {
    const worktrees = [makeWorktree('/home/user/project')];
    const sessions = [makeSession('s1', '/home/user/project', ['T1', 'T2'])];

    const result = mapTasksToWorktrees(sessions, worktrees);

    expect(result[0].associatedTasks).toHaveLength(2);
    expect(result[0].associatedTasks![0]).toMatchObject({
      sessionId: 's1',
      taskId: 'T1',
      taskSubject: 'Task T1',
    });
  });

  it('should skip sessions without cwd', () => {
    const worktrees = [makeWorktree('/home/user/project')];
    const sessions = [makeSession('s1', undefined, ['T1'])];

    const result = mapTasksToWorktrees(sessions, worktrees);

    expect(result[0].associatedTasks).toHaveLength(0);
  });

  it('should use longest-prefix matching for nested cwd', () => {
    const worktrees = [
      makeWorktree('/home/user/project'),
      makeWorktree('/home/user/project/sub'),
    ];
    // Session cwd is inside the nested worktree
    const sessions = [makeSession('s1', '/home/user/project/sub/src', ['T1'])];

    const result = mapTasksToWorktrees(sessions, worktrees);

    const main = result.find(w => w.path === '/home/user/project')!;
    const sub = result.find(w => w.path === '/home/user/project/sub')!;

    expect(main.associatedTasks).toHaveLength(0);
    expect(sub.associatedTasks).toHaveLength(1);
    expect(sub.associatedTasks![0].sessionId).toBe('s1');
  });

  it('should handle multiple sessions mapping to same worktree', () => {
    const worktrees = [makeWorktree('/home/user/project')];
    const sessions = [
      makeSession('s1', '/home/user/project', ['T1']),
      makeSession('s2', '/home/user/project', ['T2']),
    ];

    const result = mapTasksToWorktrees(sessions, worktrees);

    expect(result[0].associatedTasks).toHaveLength(2);
  });

  it('should not match cwd that is not under any worktree', () => {
    const worktrees = [makeWorktree('/home/user/project')];
    const sessions = [makeSession('s1', '/tmp/other', ['T1'])];

    const result = mapTasksToWorktrees(sessions, worktrees);

    expect(result[0].associatedTasks).toHaveLength(0);
  });

  it('should not mutate the original worktrees array', () => {
    const worktrees = [makeWorktree('/home/user/project')];
    const sessions = [makeSession('s1', '/home/user/project', ['T1'])];

    mapTasksToWorktrees(sessions, worktrees);

    expect(worktrees[0].associatedTasks).toBeUndefined();
  });

  it('should handle empty tasks in session', () => {
    const worktrees = [makeWorktree('/home/user/project')];
    const sessions = [makeSession('s1', '/home/user/project', [])];

    const result = mapTasksToWorktrees(sessions, worktrees);

    expect(result[0].associatedTasks).toHaveLength(0);
  });
});
