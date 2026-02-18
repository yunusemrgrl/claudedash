import { parseLog } from './logParser.js';
import type { QualityEvent, QualityChecks } from './types.js';

/**
 * Builds a quality event timeline from JSONL execution log content.
 * Only includes log entries that have a valid meta.quality object.
 * Returns events in chronological order.
 */
export function parseQualityTimeline(logContent: string): QualityEvent[] {
  const { events } = parseLog(logContent);
  const qualityEvents: QualityEvent[] = [];

  for (const event of events) {
    if (!event.meta || typeof event.meta.quality !== 'object' || event.meta.quality === null || Array.isArray(event.meta.quality)) {
      continue;
    }

    const raw = event.meta.quality as Record<string, unknown>;
    const checks: QualityChecks = {};

    if (typeof raw.lint === 'boolean') checks.lint = raw.lint;
    if (typeof raw.typecheck === 'boolean') checks.typecheck = raw.typecheck;
    if (typeof raw.test === 'boolean') checks.test = raw.test;

    // Only include entries that have at least one quality check result
    if (Object.keys(checks).length === 0) {
      continue;
    }

    const file = typeof event.meta.file === 'string' && event.meta.file
      ? event.meta.file
      : event.task_id;

    qualityEvents.push({
      timestamp: event.timestamp,
      file,
      checks,
      taskId: event.task_id,
    });
  }

  // Sort chronologically
  qualityEvents.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return qualityEvents;
}
