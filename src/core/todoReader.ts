import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import type { ClaudeTask, ClaudeSession } from './types.js';

const SKIP_FILES = new Set(['.lock', '.highwatermark']);

/**
 * Reads all sessions from ~/.claude/tasks/ directory.
 * Each subdirectory is a session containing numbered JSON task files.
 */
export function readSessions(claudeDir: string): ClaudeSession[] {
  const tasksDir = join(claudeDir, 'tasks');

  if (!existsSync(tasksDir)) {
    return [];
  }

  const entries = readdirSync(tasksDir, { withFileTypes: true });
  const sessions: ClaudeSession[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const session = readSession(tasksDir, entry.name);
    if (session && session.tasks.length > 0) {
      sessions.push(session);
    }
  }

  // Sort by most recent activity (updatedAt desc)
  sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return sessions;
}

/**
 * Reads tasks for a specific session.
 */
export function readSession(tasksDir: string, sessionId: string): ClaudeSession | null {
  const sessionDir = join(tasksDir, sessionId);

  if (!existsSync(sessionDir)) {
    return null;
  }

  const tasks = readSessionTasks(sessionDir);

  if (tasks.length === 0) {
    return null;
  }

  // Derive timestamps from file stats
  let earliestCreated = Infinity;
  let latestModified = 0;

  const files = readdirSync(sessionDir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    try {
      const stat = statSync(join(sessionDir, file));
      const created = stat.birthtime.getTime();
      const modified = stat.mtime.getTime();
      if (created < earliestCreated) earliestCreated = created;
      if (modified > latestModified) latestModified = modified;
    } catch { /* skip */ }
  }

  return {
    id: sessionId,
    tasks,
    createdAt: earliestCreated === Infinity
      ? new Date().toISOString()
      : new Date(earliestCreated).toISOString(),
    updatedAt: latestModified === 0
      ? new Date().toISOString()
      : new Date(latestModified).toISOString()
  };
}

/**
 * Reads all task JSON files from a session directory.
 */
function readSessionTasks(sessionDir: string): ClaudeTask[] {
  const entries = readdirSync(sessionDir);
  const tasks: ClaudeTask[] = [];

  for (const entry of entries) {
    // Skip non-JSON and meta files
    if (!entry.endsWith('.json') || SKIP_FILES.has(entry)) continue;

    try {
      const content = readFileSync(join(sessionDir, entry), 'utf-8');
      const parsed = JSON.parse(content);
      const task = validateClaudeTask(parsed);
      if (task) {
        tasks.push(task);
      }
    } catch { /* skip invalid files */ }
  }

  // Sort by numeric ID
  tasks.sort((a, b) => {
    const numA = parseInt(a.id, 10);
    const numB = parseInt(b.id, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.id.localeCompare(b.id);
  });

  return tasks;
}

/**
 * Validates and normalizes a parsed JSON object into a ClaudeTask.
 */
function validateClaudeTask(obj: unknown): ClaudeTask | null {
  if (!obj || typeof obj !== 'object') return null;

  const record = obj as Record<string, unknown>;

  if (typeof record.id !== 'string') return null;
  if (typeof record.status !== 'string') return null;

  const validStatuses = ['pending', 'in_progress', 'completed'];
  if (!validStatuses.includes(record.status)) return null;

  return {
    id: record.id,
    subject: typeof record.subject === 'string' ? record.subject : '',
    description: typeof record.description === 'string' ? record.description : '',
    activeForm: typeof record.activeForm === 'string' ? record.activeForm : '',
    status: record.status as ClaudeTask['status'],
    blocks: Array.isArray(record.blocks) ? record.blocks.filter((b): b is string => typeof b === 'string') : [],
    blockedBy: Array.isArray(record.blockedBy) ? record.blockedBy.filter((b): b is string => typeof b === 'string') : []
  };
}
