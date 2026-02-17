import { watch, type FSWatcher } from 'chokidar';
import { EventEmitter } from 'events';
import { existsSync } from 'fs';
import { join } from 'path';

export interface WatcherOptions {
  claudeDir: string;
  agentScopeDir?: string;
}

export interface WatchEvent {
  type: 'sessions' | 'plan';
  timestamp: string;
}

/**
 * Creates a file watcher that emits events when task files change.
 * Watches ~/.claude/tasks/ for Live mode and .agent-scope/ for Plan mode.
 */
export function createWatcher(options: WatcherOptions): { watcher: FSWatcher; emitter: EventEmitter } {
  const emitter = new EventEmitter();
  const watchPaths: string[] = [];

  // Watch Claude tasks directory
  const claudeTasksDir = join(options.claudeDir, 'tasks');
  if (existsSync(claudeTasksDir)) {
    watchPaths.push(join(claudeTasksDir, '**/*.json'));
  }

  // Watch agent-scope files if configured
  if (options.agentScopeDir && existsSync(options.agentScopeDir)) {
    const queuePath = join(options.agentScopeDir, 'queue.md');
    const logPath = join(options.agentScopeDir, 'execution.log');
    if (existsSync(queuePath)) watchPaths.push(queuePath);
    if (existsSync(logPath)) watchPaths.push(logPath);
  }

  if (watchPaths.length === 0) {
    // Nothing to watch, return a no-op watcher
    const noopWatcher = watch([], { persistent: false });
    return { watcher: noopWatcher, emitter };
  }

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingEventType: WatchEvent['type'] | null = null;

  const watcher = watch(watchPaths, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50
    }
  });

  const emitDebounced = (eventType: WatchEvent['type']) => {
    // If we already have a pending event, merge (prefer 'sessions' if mixed)
    if (pendingEventType && pendingEventType !== eventType) {
      pendingEventType = 'sessions'; // both changed, prioritize sessions
    } else {
      pendingEventType = eventType;
    }

    if (debounceTimer) clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      if (pendingEventType) {
        const event: WatchEvent = {
          type: pendingEventType,
          timestamp: new Date().toISOString()
        };
        emitter.emit('change', event);
        pendingEventType = null;
      }
    }, 100);
  };

  watcher.on('change', (path: string) => {
    const eventType = path.includes('.agent-scope') ? 'plan' : 'sessions';
    emitDebounced(eventType);
  });

  watcher.on('add', (path: string) => {
    const eventType = path.includes('.agent-scope') ? 'plan' : 'sessions';
    emitDebounced(eventType);
  });

  watcher.on('unlink', (path: string) => {
    const eventType = path.includes('.agent-scope') ? 'plan' : 'sessions';
    emitDebounced(eventType);
  });

  return { watcher, emitter };
}
