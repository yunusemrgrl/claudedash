import { describe, it, expect } from 'vitest';
import { parseQualityTimeline } from '../../src/core/qualityTimeline.js';

const ts = (suffix: string) => `2026-02-18T12:${suffix}:00Z`;

describe('parseQualityTimeline', () => {
  describe('happy path', () => {
    it('should extract quality events from log', () => {
      const log = `{"task_id":"F1-1","status":"DONE","timestamp":"${ts('01')}","agent":"claude","meta":{"quality":{"lint":true,"typecheck":true,"test":true}}}`;

      const result = parseQualityTimeline(log);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        timestamp: ts('01'),
        taskId: 'F1-1',
        checks: { lint: true, typecheck: true, test: true },
      });
    });

    it('should use meta.file as file field when present', () => {
      const log = `{"task_id":"F1-2","status":"DONE","timestamp":"${ts('02')}","agent":"claude","meta":{"file":"src/core/logParser.ts","quality":{"lint":true}}}`;

      const result = parseQualityTimeline(log);

      expect(result[0].file).toBe('src/core/logParser.ts');
    });

    it('should fall back to task_id when meta.file is absent', () => {
      const log = `{"task_id":"F1-3","status":"DONE","timestamp":"${ts('03')}","agent":"claude","meta":{"quality":{"lint":false}}}`;

      const result = parseQualityTimeline(log);

      expect(result[0].file).toBe('F1-3');
    });

    it('should return multiple events sorted chronologically', () => {
      const log = [
        `{"task_id":"F1-2","status":"DONE","timestamp":"${ts('05')}","agent":"claude","meta":{"quality":{"lint":true}}}`,
        `{"task_id":"F1-1","status":"DONE","timestamp":"${ts('02')}","agent":"claude","meta":{"quality":{"test":false}}}`,
      ].join('\n');

      const result = parseQualityTimeline(log);

      expect(result).toHaveLength(2);
      expect(result[0].taskId).toBe('F1-1');
      expect(result[1].taskId).toBe('F1-2');
    });

    it('should handle partial quality checks', () => {
      const log = `{"task_id":"Q1","status":"DONE","timestamp":"${ts('10')}","agent":"claude","meta":{"quality":{"typecheck":false}}}`;

      const result = parseQualityTimeline(log);

      expect(result[0].checks).toEqual({ typecheck: false });
      expect(result[0].checks.lint).toBeUndefined();
      expect(result[0].checks.test).toBeUndefined();
    });
  });

  describe('missing quality fields', () => {
    it('should skip events with no meta', () => {
      const log = `{"task_id":"F1-1","status":"DONE","timestamp":"${ts('01')}","agent":"claude"}`;

      expect(parseQualityTimeline(log)).toEqual([]);
    });

    it('should skip events with meta but no quality field', () => {
      const log = `{"task_id":"F1-1","status":"DONE","timestamp":"${ts('01')}","agent":"claude","meta":{"duration":42}}`;

      expect(parseQualityTimeline(log)).toEqual([]);
    });

    it('should skip events where quality has no recognized keys', () => {
      const log = `{"task_id":"F1-1","status":"DONE","timestamp":"${ts('01')}","agent":"claude","meta":{"quality":{"coverage":99}}}`;

      expect(parseQualityTimeline(log)).toEqual([]);
    });
  });

  describe('malformed data', () => {
    it('should return empty array for empty log', () => {
      expect(parseQualityTimeline('')).toEqual([]);
    });

    it('should skip invalid JSON lines and still parse valid ones', () => {
      const log = [
        `not json`,
        `{"task_id":"F1-1","status":"DONE","timestamp":"${ts('01')}","agent":"claude","meta":{"quality":{"lint":true}}}`,
      ].join('\n');

      const result = parseQualityTimeline(log);

      expect(result).toHaveLength(1);
      expect(result[0].taskId).toBe('F1-1');
    });

    it('should skip events where quality is not an object', () => {
      // This would be caught by logParser validation already, but test graceful handling
      const log = `{"task_id":"F1-1","status":"DONE","timestamp":"${ts('01')}","agent":"claude","meta":{"quality":{}}}`;

      // Empty quality object has no valid checks
      expect(parseQualityTimeline(log)).toEqual([]);
    });

    it('should only include boolean quality values', () => {
      // Non-boolean quality values are excluded from checks
      const log = `{"task_id":"F1-1","status":"DONE","timestamp":"${ts('01')}","agent":"claude","meta":{"quality":{"lint":true,"test":"yes"}}}`;

      // logParser rejects events with non-boolean quality values, so no events
      expect(parseQualityTimeline(log)).toHaveLength(0);
    });
  });
});
