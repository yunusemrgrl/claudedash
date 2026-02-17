import type { Task } from './types.js';

export interface QueueParseConfig {
  id?: string;        // Template: "{slice}-T{n}"
  headings?: {
    slice?: string;   // Template: "# Slice {name}"
    task?: string;    // Template: "## {id}"
  };
}

// Placeholder → regex mapping
const PLACEHOLDER_PATTERNS: Record<string, string> = {
  '{id}': '(\\S+)',
  '{name}': '(\\S+)',
  '{slice}': '(\\S+?)',
  '{n}': '(\\d+)'
};

/**
 * Converts a user-friendly template into a regex string.
 * "## {id}" → "^##\\s+(\S+)$"
 * "# Slice {name}" → "^#\\s+Slice\\s+(\S+)$"
 */
function templateToRegex(template: string): string {
  let regex = template;

  // Escape regex special chars except our placeholders
  regex = regex.replace(/([.+?^${}()|[\]\\])/g, (match) => {
    // Don't escape if it's part of a placeholder like {id}
    if (match === '{' || match === '}') return match;
    return '\\' + match;
  });

  // Replace placeholders with capture groups
  for (const [placeholder, pattern] of Object.entries(PLACEHOLDER_PATTERNS)) {
    regex = regex.replaceAll(placeholder, pattern);
  }

  // Replace spaces with \s+
  regex = regex.replace(/\s+/g, '\\s+');

  return '^' + regex + '$';
}

/**
 * Builds a slice extractor regex from the id template.
 * "{slice}-T{n}" → "^(\S+?)-T" (everything before the last known literal)
 */
function idTemplateToSliceRegex(idTemplate: string): RegExp {
  const sliceIdx = idTemplate.indexOf('{slice}');
  if (sliceIdx === -1) return /^(.+)$/; // No slice in template, use full ID

  // Get the literal text right after {slice}
  const afterSlice = idTemplate.substring(sliceIdx + '{slice}'.length);
  // Take the first literal character(s) before the next placeholder
  const nextPlaceholder = afterSlice.search(/\{/);
  const separator = nextPlaceholder === -1 ? afterSlice : afterSlice.substring(0, nextPlaceholder);

  if (!separator) return /^(.+)$/;

  const escapedSep = separator.replace(/([.+?^${}()|[\]\\])/g, '\\$1');
  return new RegExp('^(\\S+?)' + escapedSep);
}

const DEFAULT_TEMPLATES = {
  id: '{slice}-T{n}',
  headings: {
    slice: '# Slice {name}',
    task: '## {id}'
  }
};

export interface QueueParseResult {
  tasks: Task[];
  errors: string[];
}

/**
 * Parses a markdown queue file into structured tasks.
 * Returns both tasks and any validation errors encountered.
 */
export function parseQueue(content: string, config?: QueueParseConfig): QueueParseResult {
  const tasks: Task[] = [];
  const errors: string[] = [];
  const lines = content.split('\n');

  const sliceTemplate = config?.headings?.slice ?? DEFAULT_TEMPLATES.headings.slice;
  const taskTemplate = config?.headings?.task ?? DEFAULT_TEMPLATES.headings.task;
  const idTemplate = config?.id ?? DEFAULT_TEMPLATES.id;

  const sliceRegex = new RegExp(templateToRegex(sliceTemplate));
  const taskRegex = new RegExp(templateToRegex(taskTemplate));
  const sliceFromIdRegex = idTemplateToSliceRegex(idTemplate);

  let currentTask: Partial<Task> | null = null;
  let lineNumber = 0;

  for (const line of lines) {
    lineNumber++;
    const trimmed = line.trim();

    // Match slice header
    const sliceMatch = trimmed.match(sliceRegex);
    if (sliceMatch) {
      // Slice headers are informational only; task IDs contain slice info
      continue;
    }

    // Match task header
    const taskMatch = trimmed.match(taskRegex);
    if (taskMatch) {
      // Save previous task if exists
      if (currentTask) {
        const validated = validateTask(currentTask, lineNumber - 1);
        if (validated.errors.length > 0) {
          errors.push(...validated.errors);
        }
        if (validated.task) {
          tasks.push(validated.task);
        }
      }

      // Start new task
      const taskId = taskMatch[1];
      const sliceMatch2 = taskId.match(sliceFromIdRegex);
      const sliceId = sliceMatch2 ? sliceMatch2[1] : taskId;

      currentTask = {
        id: taskId,
        slice: sliceId,
        area: '',
        description: '',
        acceptanceCriteria: ''
      };
      continue;
    }

    // Parse task fields
    if (currentTask && trimmed) {
      const areaMatch = trimmed.match(/^Area:\s*(.+)$/);
      if (areaMatch) {
        currentTask.area = areaMatch[1].trim();
        continue;
      }

      const dependsMatch = trimmed.match(/^Depends:\s*(.+)$/);
      if (dependsMatch) {
        const deps = dependsMatch[1].trim();
        if (deps === '-') {
          currentTask.dependsOn = [];
        } else {
          currentTask.dependsOn = deps.split(',').map(d => d.trim()).filter(d => d);
        }
        continue;
      }

      const descMatch = trimmed.match(/^Description:\s*(.+)$/);
      if (descMatch) {
        currentTask.description = descMatch[1].trim();
        continue;
      }

      const acMatch = trimmed.match(/^AC:\s*(.+)$/);
      if (acMatch) {
        currentTask.acceptanceCriteria = acMatch[1].trim();
        continue;
      }
    }
  }

  // Save last task
  if (currentTask) {
    const validated = validateTask(currentTask, lineNumber);
    if (validated.errors.length > 0) {
      errors.push(...validated.errors);
    }
    if (validated.task) {
      tasks.push(validated.task);
    }
  }

  // Check for duplicate IDs
  const idSet = new Set<string>();
  for (const task of tasks) {
    if (idSet.has(task.id)) {
      errors.push(`Duplicate task ID: ${task.id}`);
    }
    idSet.add(task.id);
  }

  // Check for unknown dependencies
  const taskIds = new Set(tasks.map(t => t.id));
  for (const task of tasks) {
    for (const dep of task.dependsOn) {
      if (!taskIds.has(dep)) {
        errors.push(`Task ${task.id} depends on unknown task: ${dep}`);
      }
    }
  }

  // Check for circular dependencies
  const circularErrors = detectCircularDependencies(tasks);
  errors.push(...circularErrors);

  return { tasks, errors };
}

/**
 * Validates that a task has all required fields.
 */
function validateTask(task: Partial<Task>, lineNumber: number): { task: Task | null; errors: string[] } {
  const errors: string[] = [];

  if (!task.id) {
    errors.push(`Task at line ${lineNumber} missing ID`);
    return { task: null, errors };
  }

  if (!task.area) {
    errors.push(`Task ${task.id} missing Area field`);
  }

  if (!task.description) {
    errors.push(`Task ${task.id} missing Description field`);
  }

  if (!task.acceptanceCriteria) {
    errors.push(`Task ${task.id} missing AC field`);
  }

  if (task.dependsOn === undefined) {
    errors.push(`Task ${task.id} missing Depends field`);
  }

  // If any required field is missing, don't return the task
  if (errors.length > 0) {
    return { task: null, errors };
  }

  return {
    task: task as Task,
    errors: []
  };
}

/**
 * Detects circular dependencies using DFS with recursion stack tracking.
 */
function detectCircularDependencies(tasks: Task[]): string[] {
  const errors: string[] = [];
  const graph = new Map<string, string[]>();

  // Build adjacency list
  for (const task of tasks) {
    graph.set(task.id, task.dependsOn);
  }

  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];

  function dfs(taskId: string): boolean {
    visited.add(taskId);
    recursionStack.add(taskId);
    path.push(taskId);

    const dependencies = graph.get(taskId) || [];

    for (const dep of dependencies) {
      if (!visited.has(dep)) {
        if (dfs(dep)) {
          return true;
        }
      } else if (recursionStack.has(dep)) {
        // Found a cycle
        const cycleStart = path.indexOf(dep);
        const cycle = [...path.slice(cycleStart), dep];
        errors.push(`Circular dependency: ${cycle.join(' → ')}`);
        return true;
      }
    }

    recursionStack.delete(taskId);
    path.pop();
    return false;
  }

  // Check each task for cycles
  for (const task of tasks) {
    if (!visited.has(task.id)) {
      dfs(task.id);
    }
  }

  return errors;
}
