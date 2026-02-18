import { describe, it, expect } from 'vitest';
import { parseLog } from '../../src/core/logParser.js';

describe('logParser', () => {
  describe('valid JSONL parsing', () => {
    it('should parse valid JSONL events', () => {
      const content = `{"task_id":"S1-T1","status":"DONE","timestamp":"2026-02-16T14:31:22Z","agent":"claude"}
{"task_id":"S1-T2","status":"FAILED","timestamp":"2026-02-16T14:33:10Z","agent":"claude"}`;

      const result = parseLog(content);

      expect(result.errors).toEqual([]);
      expect(result.events).toHaveLength(2);
      expect(result.events[0]).toEqual({
        task_id: 'S1-T1',
        status: 'DONE',
        timestamp: '2026-02-16T14:31:22Z',
        agent: 'claude'
      });
      expect(result.events[1]).toEqual({
        task_id: 'S1-T2',
        status: 'FAILED',
        timestamp: '2026-02-16T14:33:10Z',
        agent: 'claude'
      });
    });

    it('should parse events with meta field', () => {
      const content = `{"task_id":"S1-T1","status":"DONE","timestamp":"2026-02-16T14:31:22Z","agent":"claude","meta":{"duration":123}}`;

      const result = parseLog(content);

      expect(result.errors).toEqual([]);
      expect(result.events[0].meta).toEqual({ duration: 123 });
    });

    it('should handle empty lines', () => {
      const content = `{"task_id":"S1-T1","status":"DONE","timestamp":"2026-02-16T14:31:22Z","agent":"claude"}

{"task_id":"S1-T2","status":"DONE","timestamp":"2026-02-16T14:32:00Z","agent":"claude"}

`;

      const result = parseLog(content);

      expect(result.errors).toEqual([]);
      expect(result.events).toHaveLength(2);
    });

    it('should handle events without meta field', () => {
      const content = `{"task_id":"S1-T1","status":"DONE","timestamp":"2026-02-16T14:31:22Z","agent":"claude"}`;

      const result = parseLog(content);

      expect(result.errors).toEqual([]);
      expect(result.events[0]).not.toHaveProperty('meta');
    });
  });

  describe('invalid JSON lines', () => {
    it('should report invalid JSON', () => {
      const content = `{"task_id":"S1-T1","status":"DONE"
this is not json`;

      const result = parseLog(content);

      expect(result.errors).toContain('Line 1: Invalid JSON');
      expect(result.errors).toContain('Line 2: Invalid JSON');
      expect(result.events).toHaveLength(0);
    });

    it('should report malformed JSON', () => {
      const content = `{task_id: "S1-T1"}`;

      const result = parseLog(content);

      expect(result.errors).toContain('Line 1: Invalid JSON');
    });

    it('should continue parsing after invalid line', () => {
      const content = `{"task_id":"S1-T1","status":"DONE","timestamp":"2026-02-16T14:31:22Z","agent":"claude"}
invalid json here
{"task_id":"S1-T2","status":"DONE","timestamp":"2026-02-16T14:32:00Z","agent":"claude"}`;

      const result = parseLog(content);

      expect(result.errors).toEqual(['Line 2: Invalid JSON']);
      expect(result.events).toHaveLength(2);
    });
  });

  describe('invalid schema', () => {
    it('should report missing task_id', () => {
      const content = `{"status":"DONE","timestamp":"2026-02-16T14:31:22Z","agent":"claude"}`;

      const result = parseLog(content);

      expect(result.errors).toContain('Line 1: Missing or invalid task_id');
    });

    it('should report invalid status', () => {
      const content = `{"task_id":"S1-T1","status":"PENDING","timestamp":"2026-02-16T14:31:22Z","agent":"claude"}`;

      const result = parseLog(content);

      expect(result.errors).toContain('Line 1: Invalid status (must be DONE, FAILED, or BLOCKED)');
    });

    it('should report missing timestamp', () => {
      const content = `{"task_id":"S1-T1","status":"DONE","agent":"claude"}`;

      const result = parseLog(content);

      expect(result.errors).toContain('Line 1: Missing or invalid timestamp (must be ISO-8601)');
    });

    it('should report invalid timestamp format', () => {
      const content = `{"task_id":"S1-T1","status":"DONE","timestamp":"2026-02-16","agent":"claude"}`;

      const result = parseLog(content);

      expect(result.errors).toContain('Line 1: Missing or invalid timestamp (must be ISO-8601)');
    });

    it('should report missing agent', () => {
      const content = `{"task_id":"S1-T1","status":"DONE","timestamp":"2026-02-16T14:31:22Z"}`;

      const result = parseLog(content);

      expect(result.errors).toContain('Line 1: Missing or invalid agent');
    });

    it('should report invalid meta type', () => {
      const content = `{"task_id":"S1-T1","status":"DONE","timestamp":"2026-02-16T14:31:22Z","agent":"claude","meta":"not an object"}`;

      const result = parseLog(content);

      expect(result.errors).toContain('Line 1: meta must be an object if provided');
    });

    it('should report array meta', () => {
      const content = `{"task_id":"S1-T1","status":"DONE","timestamp":"2026-02-16T14:31:22Z","agent":"claude","meta":[]}`;

      const result = parseLog(content);

      expect(result.errors).toContain('Line 1: meta must be an object if provided');
    });

    it('should report when event is not an object', () => {
      const content = `"just a string"`;

      const result = parseLog(content);

      expect(result.errors).toContain('Line 1: Event must be an object');
    });
  });

  describe('BLOCKED event validation', () => {
    it('should parse valid BLOCKED event with reason', () => {
      const content = `{"task_id":"S1-T1","status":"BLOCKED","reason":"API key missing","timestamp":"2026-02-16T14:31:22Z","agent":"claude"}`;

      const result = parseLog(content);

      expect(result.errors).toEqual([]);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].status).toBe('BLOCKED');
      expect(result.events[0].reason).toBe('API key missing');
    });

    it('should reject BLOCKED event without reason', () => {
      const content = `{"task_id":"S1-T1","status":"BLOCKED","timestamp":"2026-02-16T14:31:22Z","agent":"claude"}`;

      const result = parseLog(content);

      expect(result.errors).toContain('Line 1: reason is required when status is BLOCKED');
    });

    it('should reject BLOCKED event with empty reason', () => {
      const content = `{"task_id":"S1-T1","status":"BLOCKED","reason":"","timestamp":"2026-02-16T14:31:22Z","agent":"claude"}`;

      const result = parseLog(content);

      expect(result.errors).toContain('Line 1: reason is required when status is BLOCKED');
    });
  });

  describe('multiple events per task', () => {
    it('should keep only latest event based on timestamp', () => {
      const content = `{"task_id":"S1-T1","status":"DONE","timestamp":"2026-02-16T14:31:22Z","agent":"claude"}
{"task_id":"S1-T1","status":"FAILED","timestamp":"2026-02-16T14:35:00Z","agent":"claude"}`;

      const result = parseLog(content);

      expect(result.errors).toEqual([]);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].status).toBe('FAILED');
      expect(result.events[0].timestamp).toBe('2026-02-16T14:35:00Z');
    });

    it('should keep earlier event if timestamps are reversed', () => {
      const content = `{"task_id":"S1-T1","status":"FAILED","timestamp":"2026-02-16T14:35:00Z","agent":"claude"}
{"task_id":"S1-T1","status":"DONE","timestamp":"2026-02-16T14:31:22Z","agent":"claude"}`;

      const result = parseLog(content);

      expect(result.errors).toEqual([]);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].status).toBe('FAILED');
    });

    it('should handle multiple updates to same task', () => {
      const content = `{"task_id":"S1-T1","status":"DONE","timestamp":"2026-02-16T14:00:00Z","agent":"claude"}
{"task_id":"S1-T1","status":"FAILED","timestamp":"2026-02-16T14:10:00Z","agent":"claude"}
{"task_id":"S1-T1","status":"DONE","timestamp":"2026-02-16T14:20:00Z","agent":"claude"}`;

      const result = parseLog(content);

      expect(result.errors).toEqual([]);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].status).toBe('DONE');
      expect(result.events[0].timestamp).toBe('2026-02-16T14:20:00Z');
    });
  });

  describe('timestamp comparison', () => {
    it('should use lexicographical comparison for timestamps', () => {
      const content = `{"task_id":"S1-T1","status":"DONE","timestamp":"2026-02-16T09:00:00Z","agent":"claude"}
{"task_id":"S1-T1","status":"FAILED","timestamp":"2026-02-16T10:00:00Z","agent":"claude"}`;

      const result = parseLog(content);

      expect(result.events[0].status).toBe('FAILED');
    });

    it('should handle timestamps with milliseconds', () => {
      const content = `{"task_id":"S1-T1","status":"DONE","timestamp":"2026-02-16T14:31:22.123Z","agent":"claude"}
{"task_id":"S1-T1","status":"FAILED","timestamp":"2026-02-16T14:31:22.456Z","agent":"claude"}`;

      const result = parseLog(content);

      expect(result.errors).toEqual([]);
      expect(result.events[0].status).toBe('FAILED');
    });
  });

  describe('meta.quality field validation', () => {
    it('should accept valid quality field with all checks', () => {
      const content = `{"task_id":"X","status":"DONE","timestamp":"2026-02-16T14:31:22Z","agent":"claude","meta":{"quality":{"lint":true,"test":true,"typecheck":false}}}`;

      const result = parseLog(content);

      expect(result.errors).toEqual([]);
      expect(result.events[0].meta).toEqual({ quality: { lint: true, test: true, typecheck: false } });
    });

    it('should accept quality field with partial checks', () => {
      const content = `{"task_id":"X","status":"DONE","timestamp":"2026-02-16T14:31:22Z","agent":"claude","meta":{"quality":{"lint":true}}}`;

      const result = parseLog(content);

      expect(result.errors).toEqual([]);
      expect(result.events[0].meta?.quality).toEqual({ lint: true });
    });

    it('should accept quality field with empty object', () => {
      const content = `{"task_id":"X","status":"DONE","timestamp":"2026-02-16T14:31:22Z","agent":"claude","meta":{"quality":{}}}`;

      const result = parseLog(content);

      expect(result.errors).toEqual([]);
    });

    it('should reject non-boolean lint value', () => {
      const content = `{"task_id":"X","status":"DONE","timestamp":"2026-02-16T14:31:22Z","agent":"claude","meta":{"quality":{"lint":"yes"}}}`;

      const result = parseLog(content);

      expect(result.errors).toContain('Line 1: meta.quality.lint must be a boolean');
    });

    it('should reject non-boolean typecheck value', () => {
      const content = `{"task_id":"X","status":"DONE","timestamp":"2026-02-16T14:31:22Z","agent":"claude","meta":{"quality":{"typecheck":1}}}`;

      const result = parseLog(content);

      expect(result.errors).toContain('Line 1: meta.quality.typecheck must be a boolean');
    });

    it('should reject non-boolean test value', () => {
      const content = `{"task_id":"X","status":"DONE","timestamp":"2026-02-16T14:31:22Z","agent":"claude","meta":{"quality":{"test":null}}}`;

      const result = parseLog(content);

      expect(result.errors).toContain('Line 1: meta.quality.test must be a boolean');
    });

    it('should reject non-object quality field', () => {
      const content = `{"task_id":"X","status":"DONE","timestamp":"2026-02-16T14:31:22Z","agent":"claude","meta":{"quality":"all-good"}}`;

      const result = parseLog(content);

      expect(result.errors).toContain('Line 1: meta.quality must be an object if provided');
    });

    it('should reject array quality field', () => {
      const content = `{"task_id":"X","status":"DONE","timestamp":"2026-02-16T14:31:22Z","agent":"claude","meta":{"quality":[]}}`;

      const result = parseLog(content);

      expect(result.errors).toContain('Line 1: meta.quality must be an object if provided');
    });

    it('should preserve other meta fields alongside quality', () => {
      const content = `{"task_id":"X","status":"DONE","timestamp":"2026-02-16T14:31:22Z","agent":"claude","meta":{"duration":42,"quality":{"lint":true}}}`;

      const result = parseLog(content);

      expect(result.errors).toEqual([]);
      expect(result.events[0].meta).toEqual({ duration: 42, quality: { lint: true } });
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', () => {
      const result = parseLog('');

      expect(result.events).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it('should handle only whitespace', () => {
      const result = parseLog('   \n\n   \n');

      expect(result.events).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it('should handle mixed valid and invalid events', () => {
      const content = `{"task_id":"S1-T1","status":"DONE","timestamp":"2026-02-16T14:31:22Z","agent":"claude"}
invalid
{"task_id":"S1-T2","status":"FAILED","timestamp":"2026-02-16T14:32:00Z","agent":"claude"}
{}
{"task_id":"S1-T3","status":"DONE","timestamp":"2026-02-16T14:33:00Z","agent":"claude"}`;

      const result = parseLog(content);

      expect(result.events).toHaveLength(3);
      // Line 2: invalid JSON (1 error), Line 4: empty object (4 errors: task_id, status, timestamp, agent)
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('Line 2'))).toBe(true);
      expect(result.errors.some(e => e.includes('Line 4'))).toBe(true);
    });
  });
});
