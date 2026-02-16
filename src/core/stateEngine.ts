import type { Task, LogEvent, ComputedTask, Snapshot, TaskStatus } from './types.js';

/**
 * Computes a snapshot of the current system state from tasks and log events.
 */
export function computeSnapshot(tasks: Task[], events: LogEvent[]): Snapshot {
  // Create a map of events by task_id for quick lookup
  const eventMap = new Map<string, LogEvent>();
  for (const event of events) {
    eventMap.set(event.task_id, event);
  }

  // Create a map of tasks by id for dependency resolution
  const taskMap = new Map<string, Task>();
  for (const task of tasks) {
    taskMap.set(task.id, task);
  }

  // Sort tasks by ID for deterministic ordering
  const sortedTasks = [...tasks].sort((a, b) => a.id.localeCompare(b.id));

  // Compute status for each task
  const computedTasks: ComputedTask[] = [];
  const statusCache = new Map<string, TaskStatus>();

  for (const task of sortedTasks) {
    const status = computeTaskStatus(task, eventMap, taskMap, statusCache);
    const lastEvent = eventMap.get(task.id);

    computedTasks.push({
      ...task,
      status,
      lastEvent
    });
  }

  // Aggregate statistics
  const slices = computeSliceStats(computedTasks);
  const summary = computeSummary(computedTasks);

  return {
    tasks: computedTasks,
    slices,
    summary
  };
}

/**
 * Computes the status of a single task based on events and dependencies.
 */
function computeTaskStatus(
  task: Task,
  eventMap: Map<string, LogEvent>,
  taskMap: Map<string, Task>,
  statusCache: Map<string, TaskStatus>
): TaskStatus {
  // Check cache first
  if (statusCache.has(task.id)) {
    return statusCache.get(task.id)!;
  }

  const lastEvent = eventMap.get(task.id);

  // Priority: FAILED > DONE > BLOCKED > READY
  if (lastEvent?.status === 'FAILED') {
    statusCache.set(task.id, 'FAILED');
    return 'FAILED';
  }

  if (lastEvent?.status === 'DONE') {
    statusCache.set(task.id, 'DONE');
    return 'DONE';
  }

  // Check dependencies
  for (const depId of task.dependsOn) {
    const depTask = taskMap.get(depId);
    if (!depTask) {
      // Unknown dependency - treat as blocking
      statusCache.set(task.id, 'BLOCKED');
      return 'BLOCKED';
    }

    const depStatus = computeTaskStatus(depTask, eventMap, taskMap, statusCache);
    if (depStatus !== 'DONE') {
      statusCache.set(task.id, 'BLOCKED');
      return 'BLOCKED';
    }
  }

  // All dependencies are DONE (or no dependencies)
  statusCache.set(task.id, 'READY');
  return 'READY';
}

/**
 * Computes statistics per slice.
 */
function computeSliceStats(tasks: ComputedTask[]): Record<string, {
  total: number;
  done: number;
  failed: number;
  blocked: number;
  ready: number;
  progress: number;
}> {
  const slices: Record<string, {
    total: number;
    done: number;
    failed: number;
    blocked: number;
    ready: number;
    progress: number;
  }> = {};

  for (const task of tasks) {
    if (!slices[task.slice]) {
      slices[task.slice] = {
        total: 0,
        done: 0,
        failed: 0,
        blocked: 0,
        ready: 0,
        progress: 0
      };
    }

    const slice = slices[task.slice];
    slice.total++;

    switch (task.status) {
      case 'DONE':
        slice.done++;
        break;
      case 'FAILED':
        slice.failed++;
        break;
      case 'BLOCKED':
        slice.blocked++;
        break;
      case 'READY':
        slice.ready++;
        break;
    }
  }

  // Calculate progress percentage for each slice
  for (const slice of Object.values(slices)) {
    if (slice.total > 0) {
      slice.progress = Math.round((slice.done / slice.total) * 100);
    }
  }

  return slices;
}

/**
 * Computes global summary statistics.
 */
function computeSummary(tasks: ComputedTask[]): {
  total: number;
  done: number;
  failed: number;
  blocked: number;
  ready: number;
  successRate: number;
} {
  const summary = {
    total: tasks.length,
    done: 0,
    failed: 0,
    blocked: 0,
    ready: 0,
    successRate: 0
  };

  for (const task of tasks) {
    switch (task.status) {
      case 'DONE':
        summary.done++;
        break;
      case 'FAILED':
        summary.failed++;
        break;
      case 'BLOCKED':
        summary.blocked++;
        break;
      case 'READY':
        summary.ready++;
        break;
    }
  }

  // Calculate success rate: done / (done + failed) || 0
  const completed = summary.done + summary.failed;
  if (completed > 0) {
    summary.successRate = Math.round((summary.done / completed) * 100) / 100;
  }

  return summary;
}
