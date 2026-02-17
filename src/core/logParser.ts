import type { LogEvent } from './types.js';

export interface LogParseResult {
  events: LogEvent[];
  errors: string[];
}

/**
 * Parses a JSONL execution log file.
 * Keeps only the latest event per task based on ISO-8601 timestamp comparison.
 */
export function parseLog(content: string): LogParseResult {
  const errors: string[] = [];
  const eventsByTask = new Map<string, LogEvent>();

  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNumber = i + 1;

    // Skip empty lines
    if (!line) {
      continue;
    }

    // Try to parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch (error) {
      errors.push(`Line ${lineNumber}: Invalid JSON`);
      continue;
    }

    // Validate schema
    const validation = validateLogEvent(parsed, lineNumber);
    if (validation.errors.length > 0) {
      errors.push(...validation.errors);
      continue;
    }

    const event = validation.event!;

    // Keep only latest event per task
    const existing = eventsByTask.get(event.task_id);
    if (!existing || event.timestamp > existing.timestamp) {
      eventsByTask.set(event.task_id, event);
    }
  }

  return {
    events: Array.from(eventsByTask.values()),
    errors
  };
}

/**
 * Validates that an object conforms to the LogEvent schema.
 */
function validateLogEvent(obj: unknown, lineNumber: number): { event: LogEvent | null; errors: string[] } {
  const errors: string[] = [];

  if (typeof obj !== 'object' || obj === null) {
    errors.push(`Line ${lineNumber}: Event must be an object`);
    return { event: null, errors };
  }

  const event = obj as Record<string, unknown>;

  // Validate task_id
  if (typeof event.task_id !== 'string' || !event.task_id) {
    errors.push(`Line ${lineNumber}: Missing or invalid task_id`);
  }

  // Validate status
  if (event.status !== 'DONE' && event.status !== 'FAILED' && event.status !== 'BLOCKED') {
    errors.push(`Line ${lineNumber}: Invalid status (must be DONE, FAILED, or BLOCKED)`);
  }

  // Validate reason (required for BLOCKED)
  if (event.status === 'BLOCKED') {
    if (typeof event.reason !== 'string' || !event.reason) {
      errors.push(`Line ${lineNumber}: reason is required when status is BLOCKED`);
    }
  }

  // Validate timestamp
  if (typeof event.timestamp !== 'string' || !isValidISO8601(event.timestamp)) {
    errors.push(`Line ${lineNumber}: Missing or invalid timestamp (must be ISO-8601)`);
  }

  // Validate agent
  if (typeof event.agent !== 'string' || !event.agent) {
    errors.push(`Line ${lineNumber}: Missing or invalid agent`);
  }

  // Validate meta (optional)
  if (event.meta !== undefined) {
    if (typeof event.meta !== 'object' || event.meta === null || Array.isArray(event.meta)) {
      errors.push(`Line ${lineNumber}: meta must be an object if provided`);
    }
  }

  if (errors.length > 0) {
    return { event: null, errors };
  }

  // At this point, all validations passed, so we can safely construct a LogEvent
  const validEvent: LogEvent = {
    task_id: event.task_id as string,
    status: event.status as "DONE" | "FAILED" | "BLOCKED",
    timestamp: event.timestamp as string,
    agent: event.agent as string,
    ...(event.reason !== undefined && { reason: event.reason as string }),
    ...(event.meta !== undefined && { meta: event.meta as Record<string, unknown> })
  };

  return {
    event: validEvent,
    errors: []
  };
}

/**
 * Basic ISO-8601 timestamp validation.
 */
function isValidISO8601(timestamp: string): boolean {
  // Check basic format and that it can be parsed as a date
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?$/;
  if (!iso8601Regex.test(timestamp)) {
    return false;
  }

  const date = new Date(timestamp);
  return !isNaN(date.getTime());
}
