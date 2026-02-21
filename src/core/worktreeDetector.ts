import { execFile } from 'child_process';
import { promisify } from 'util';
import { basename } from 'path';
import type { WorktreeState } from './types.js';

const execFileAsync = promisify(execFile);

/** Returns true if the given absolute path lives inside a .claude/worktrees/ directory. */
function isClaudeManagedPath(path: string): boolean {
  return path.includes('/.claude/worktrees/');
}

/**
 * Parses `git worktree list --porcelain` output into WorktreeState objects.
 * Each worktree block is separated by an empty line.
 */
export function parsePorcelainOutput(output: string): WorktreeState[] {
  const worktrees: WorktreeState[] = [];
  const blocks = output.trim().split(/\n\n+/);

  for (const block of blocks) {
    if (!block.trim()) continue;

    const lines = block.split('\n');
    let path = '';
    let head = '';
    let branch = '';

    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        path = line.slice('worktree '.length).trim();
      } else if (line.startsWith('HEAD ')) {
        head = line.slice('HEAD '.length).trim();
      } else if (line.startsWith('branch ')) {
        // branch refs/heads/main -> main
        const ref = line.slice('branch '.length).trim();
        branch = ref.replace(/^refs\/heads\//, '');
      } else if (line === 'detached') {
        branch = '(detached HEAD)';
      } else if (line === 'bare') {
        branch = '(bare)';
      }
    }

    if (!path) continue;

    const managed = isClaudeManagedPath(path);
    worktrees.push({
      path,
      head,
      branch: branch || '(unknown)',
      dirty: false,
      aheadCount: 0,
      behindCount: 0,
      isClaudeManaged: managed,
      worktreeName: managed ? basename(path) : undefined,
    });
  }

  return worktrees;
}

/**
 * Enriches a WorktreeState with dirty status, ahead, and behind counts.
 * Mutates and returns the same object.
 * Handles detached HEAD, bare repos, and missing upstream gracefully.
 */
export async function enrichWorktreeStatus(worktree: WorktreeState): Promise<WorktreeState> {
  const { path } = worktree;

  // Skip bare repos
  if (worktree.branch === '(bare)') return worktree;

  // Check dirty status via `git status --porcelain`
  try {
    const { stdout } = await execFileAsync('git', ['status', '--porcelain'], { cwd: path });
    worktree.dirty = stdout.trim().length > 0;
  } catch {
    // Cannot determine dirty status — leave as false
  }

  // Check ahead/behind via `git rev-list --left-right --count HEAD...@{u}`
  // This fails for detached HEAD or when no upstream is configured — safe to ignore.
  if (worktree.branch !== '(detached HEAD)') {
    try {
      const { stdout } = await execFileAsync(
        'git',
        ['rev-list', '--left-right', '--count', 'HEAD...@{u}'],
        { cwd: path }
      );
      const parts = stdout.trim().split(/\s+/);
      if (parts.length === 2) {
        worktree.aheadCount = parseInt(parts[0], 10) || 0;
        worktree.behindCount = parseInt(parts[1], 10) || 0;
      }
    } catch {
      // No upstream configured or detached — leave counts at 0
    }
  }

  return worktree;
}

/**
 * Detects all git worktrees for the given working directory.
 * Returns an empty array when not in a git repo or git is unavailable.
 */
export async function detectWorktrees(cwd: string): Promise<WorktreeState[]> {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['worktree', 'list', '--porcelain'],
      { cwd }
    );
    return parsePorcelainOutput(stdout);
  } catch {
    // Not a git repo, git not installed, or other error — degrade gracefully
    return [];
  }
}
