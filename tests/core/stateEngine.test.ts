import { describe, it, expect } from 'vitest';
import { computeSnapshot } from '../../src/core/stateEngine.js';
import type { Task, LogEvent } from '../../src/core/types.js';

describe('stateEngine', () => {
  describe('dependency blocking', () => {
    it('should mark task as BLOCKED when dependency is not DONE', () => {
      const tasks: Task[] = [
        {
          id: 'S1-T1',
          slice: 'S1',
          area: 'Auth',
          description: 'Task 1',
          acceptanceCriteria: 'Done',
          dependsOn: []
        },
        {
          id: 'S1-T2',
          slice: 'S1',
          area: 'Auth',
          description: 'Task 2',
          acceptanceCriteria: 'Done',
          dependsOn: ['S1-T1']
        }
      ];

      const events: LogEvent[] = [];

      const snapshot = computeSnapshot(tasks, events);

      expect(snapshot.tasks[0].status).toBe('READY');
      expect(snapshot.tasks[1].status).toBe('BLOCKED');
    });

    it('should mark task as READY when all dependencies are DONE', () => {
      const tasks: Task[] = [
        {
          id: 'S1-T1',
          slice: 'S1',
          area: 'Auth',
          description: 'Task 1',
          acceptanceCriteria: 'Done',
          dependsOn: []
        },
        {
          id: 'S1-T2',
          slice: 'S1',
          area: 'Auth',
          description: 'Task 2',
          acceptanceCriteria: 'Done',
          dependsOn: ['S1-T1']
        }
      ];

      const events: LogEvent[] = [
        {
          task_id: 'S1-T1',
          status: 'DONE',
          timestamp: '2026-02-16T14:00:00Z',
          agent: 'claude'
        }
      ];

      const snapshot = computeSnapshot(tasks, events);

      expect(snapshot.tasks[0].status).toBe('DONE');
      expect(snapshot.tasks[1].status).toBe('READY');
    });

    it('should handle multiple dependencies', () => {
      const tasks: Task[] = [
        {
          id: 'S1-T1',
          slice: 'S1',
          area: 'Auth',
          description: 'Task 1',
          acceptanceCriteria: 'Done',
          dependsOn: []
        },
        {
          id: 'S1-T2',
          slice: 'S1',
          area: 'Auth',
          description: 'Task 2',
          acceptanceCriteria: 'Done',
          dependsOn: []
        },
        {
          id: 'S1-T3',
          slice: 'S1',
          area: 'Auth',
          description: 'Task 3',
          acceptanceCriteria: 'Done',
          dependsOn: ['S1-T1', 'S1-T2']
        }
      ];

      const events: LogEvent[] = [
        {
          task_id: 'S1-T1',
          status: 'DONE',
          timestamp: '2026-02-16T14:00:00Z',
          agent: 'claude'
        }
      ];

      const snapshot = computeSnapshot(tasks, events);

      expect(snapshot.tasks[2].status).toBe('BLOCKED');
    });

    it('should make task READY when all multiple dependencies are DONE', () => {
      const tasks: Task[] = [
        {
          id: 'S1-T1',
          slice: 'S1',
          area: 'Auth',
          description: 'Task 1',
          acceptanceCriteria: 'Done',
          dependsOn: []
        },
        {
          id: 'S1-T2',
          slice: 'S1',
          area: 'Auth',
          description: 'Task 2',
          acceptanceCriteria: 'Done',
          dependsOn: []
        },
        {
          id: 'S1-T3',
          slice: 'S1',
          area: 'Auth',
          description: 'Task 3',
          acceptanceCriteria: 'Done',
          dependsOn: ['S1-T1', 'S1-T2']
        }
      ];

      const events: LogEvent[] = [
        {
          task_id: 'S1-T1',
          status: 'DONE',
          timestamp: '2026-02-16T14:00:00Z',
          agent: 'claude'
        },
        {
          task_id: 'S1-T2',
          status: 'DONE',
          timestamp: '2026-02-16T14:01:00Z',
          agent: 'claude'
        }
      ];

      const snapshot = computeSnapshot(tasks, events);

      expect(snapshot.tasks[2].status).toBe('READY');
    });
  });

  describe('DONE resolution', () => {
    it('should mark task as DONE when event status is DONE', () => {
      const tasks: Task[] = [
        {
          id: 'S1-T1',
          slice: 'S1',
          area: 'Auth',
          description: 'Task 1',
          acceptanceCriteria: 'Done',
          dependsOn: []
        }
      ];

      const events: LogEvent[] = [
        {
          task_id: 'S1-T1',
          status: 'DONE',
          timestamp: '2026-02-16T14:00:00Z',
          agent: 'claude'
        }
      ];

      const snapshot = computeSnapshot(tasks, events);

      expect(snapshot.tasks[0].status).toBe('DONE');
      expect(snapshot.tasks[0].lastEvent).toEqual(events[0]);
    });
  });

  describe('FAILED precedence', () => {
    it('should mark task as FAILED when event status is FAILED', () => {
      const tasks: Task[] = [
        {
          id: 'S1-T1',
          slice: 'S1',
          area: 'Auth',
          description: 'Task 1',
          acceptanceCriteria: 'Done',
          dependsOn: []
        }
      ];

      const events: LogEvent[] = [
        {
          task_id: 'S1-T1',
          status: 'FAILED',
          timestamp: '2026-02-16T14:00:00Z',
          agent: 'claude',
          meta: { reason: 'timeout' }
        }
      ];

      const snapshot = computeSnapshot(tasks, events);

      expect(snapshot.tasks[0].status).toBe('FAILED');
      expect(snapshot.tasks[0].lastEvent?.meta).toEqual({ reason: 'timeout' });
    });

    it('should NOT propagate FAILED status to dependent tasks', () => {
      const tasks: Task[] = [
        {
          id: 'S1-T1',
          slice: 'S1',
          area: 'Auth',
          description: 'Task 1',
          acceptanceCriteria: 'Done',
          dependsOn: []
        },
        {
          id: 'S1-T2',
          slice: 'S1',
          area: 'Auth',
          description: 'Task 2',
          acceptanceCriteria: 'Done',
          dependsOn: ['S1-T1']
        }
      ];

      const events: LogEvent[] = [
        {
          task_id: 'S1-T1',
          status: 'FAILED',
          timestamp: '2026-02-16T14:00:00Z',
          agent: 'claude'
        }
      ];

      const snapshot = computeSnapshot(tasks, events);

      expect(snapshot.tasks[0].status).toBe('FAILED');
      expect(snapshot.tasks[1].status).toBe('BLOCKED');
    });
  });

  describe('READY tasks', () => {
    it('should mark task as READY when no dependencies and no events', () => {
      const tasks: Task[] = [
        {
          id: 'S1-T1',
          slice: 'S1',
          area: 'Auth',
          description: 'Task 1',
          acceptanceCriteria: 'Done',
          dependsOn: []
        }
      ];

      const events: LogEvent[] = [];

      const snapshot = computeSnapshot(tasks, events);

      expect(snapshot.tasks[0].status).toBe('READY');
      expect(snapshot.tasks[0].lastEvent).toBeUndefined();
    });

    it('should mark task as READY when dependencies are DONE', () => {
      const tasks: Task[] = [
        {
          id: 'S1-T1',
          slice: 'S1',
          area: 'Auth',
          description: 'Task 1',
          acceptanceCriteria: 'Done',
          dependsOn: []
        },
        {
          id: 'S1-T2',
          slice: 'S1',
          area: 'Auth',
          description: 'Task 2',
          acceptanceCriteria: 'Done',
          dependsOn: ['S1-T1']
        }
      ];

      const events: LogEvent[] = [
        {
          task_id: 'S1-T1',
          status: 'DONE',
          timestamp: '2026-02-16T14:00:00Z',
          agent: 'claude'
        }
      ];

      const snapshot = computeSnapshot(tasks, events);

      expect(snapshot.tasks[1].status).toBe('READY');
    });
  });

  describe('slice aggregation', () => {
    it('should compute slice statistics', () => {
      const tasks: Task[] = [
        {
          id: 'S1-T1',
          slice: 'S1',
          area: 'Auth',
          description: 'Task 1',
          acceptanceCriteria: 'Done',
          dependsOn: []
        },
        {
          id: 'S1-T2',
          slice: 'S1',
          area: 'Auth',
          description: 'Task 2',
          acceptanceCriteria: 'Done',
          dependsOn: ['S1-T1']
        },
        {
          id: 'S1-T3',
          slice: 'S1',
          area: 'Auth',
          description: 'Task 3',
          acceptanceCriteria: 'Done',
          dependsOn: []
        }
      ];

      const events: LogEvent[] = [
        {
          task_id: 'S1-T1',
          status: 'DONE',
          timestamp: '2026-02-16T14:00:00Z',
          agent: 'claude'
        },
        {
          task_id: 'S1-T3',
          status: 'FAILED',
          timestamp: '2026-02-16T14:01:00Z',
          agent: 'claude'
        }
      ];

      const snapshot = computeSnapshot(tasks, events);

      expect(snapshot.slices['S1']).toEqual({
        total: 3,
        done: 1,
        failed: 1,
        blocked: 0,
        ready: 1,
        progress: 33
      });
    });

    it('should compute progress percentage correctly', () => {
      const tasks: Task[] = [
        {
          id: 'S1-T1',
          slice: 'S1',
          area: 'Auth',
          description: 'Task 1',
          acceptanceCriteria: 'Done',
          dependsOn: []
        },
        {
          id: 'S1-T2',
          slice: 'S1',
          area: 'Auth',
          description: 'Task 2',
          acceptanceCriteria: 'Done',
          dependsOn: []
        }
      ];

      const events: LogEvent[] = [
        {
          task_id: 'S1-T1',
          status: 'DONE',
          timestamp: '2026-02-16T14:00:00Z',
          agent: 'claude'
        }
      ];

      const snapshot = computeSnapshot(tasks, events);

      expect(snapshot.slices['S1'].progress).toBe(50);
    });

    it('should handle multiple slices', () => {
      const tasks: Task[] = [
        {
          id: 'S1-T1',
          slice: 'S1',
          area: 'Auth',
          description: 'Task 1',
          acceptanceCriteria: 'Done',
          dependsOn: []
        },
        {
          id: 'S2-T1',
          slice: 'S2',
          area: 'API',
          description: 'Task 1',
          acceptanceCriteria: 'Done',
          dependsOn: []
        }
      ];

      const events: LogEvent[] = [
        {
          task_id: 'S1-T1',
          status: 'DONE',
          timestamp: '2026-02-16T14:00:00Z',
          agent: 'claude'
        }
      ];

      const snapshot = computeSnapshot(tasks, events);

      expect(snapshot.slices['S1'].done).toBe(1);
      expect(snapshot.slices['S2'].done).toBe(0);
      expect(snapshot.slices['S2'].ready).toBe(1);
    });
  });

  describe('summary calculations', () => {
    it('should compute global summary', () => {
      const tasks: Task[] = [
        {
          id: 'S1-T1',
          slice: 'S1',
          area: 'Auth',
          description: 'Task 1',
          acceptanceCriteria: 'Done',
          dependsOn: []
        },
        {
          id: 'S1-T2',
          slice: 'S1',
          area: 'Auth',
          description: 'Task 2',
          acceptanceCriteria: 'Done',
          dependsOn: ['S1-T1']
        },
        {
          id: 'S1-T3',
          slice: 'S1',
          area: 'Auth',
          description: 'Task 3',
          acceptanceCriteria: 'Done',
          dependsOn: []
        }
      ];

      const events: LogEvent[] = [
        {
          task_id: 'S1-T1',
          status: 'DONE',
          timestamp: '2026-02-16T14:00:00Z',
          agent: 'claude'
        },
        {
          task_id: 'S1-T3',
          status: 'FAILED',
          timestamp: '2026-02-16T14:01:00Z',
          agent: 'claude'
        }
      ];

      const snapshot = computeSnapshot(tasks, events);

      expect(snapshot.summary).toEqual({
        total: 3,
        done: 1,
        failed: 1,
        blocked: 0,
        ready: 1,
        successRate: 0.5
      });
    });

    it('should calculate success rate correctly (done / (done + failed))', () => {
      const tasks: Task[] = [
        {
          id: 'S1-T1',
          slice: 'S1',
          area: 'Auth',
          description: 'Task 1',
          acceptanceCriteria: 'Done',
          dependsOn: []
        },
        {
          id: 'S1-T2',
          slice: 'S1',
          area: 'Auth',
          description: 'Task 2',
          acceptanceCriteria: 'Done',
          dependsOn: []
        },
        {
          id: 'S1-T3',
          slice: 'S1',
          area: 'Auth',
          description: 'Task 3',
          acceptanceCriteria: 'Done',
          dependsOn: []
        }
      ];

      const events: LogEvent[] = [
        {
          task_id: 'S1-T1',
          status: 'DONE',
          timestamp: '2026-02-16T14:00:00Z',
          agent: 'claude'
        },
        {
          task_id: 'S1-T2',
          status: 'DONE',
          timestamp: '2026-02-16T14:01:00Z',
          agent: 'claude'
        },
        {
          task_id: 'S1-T3',
          status: 'FAILED',
          timestamp: '2026-02-16T14:02:00Z',
          agent: 'claude'
        }
      ];

      const snapshot = computeSnapshot(tasks, events);

      expect(snapshot.summary.successRate).toBeCloseTo(0.67, 2);
    });

    it('should return 0 success rate when no tasks completed', () => {
      const tasks: Task[] = [
        {
          id: 'S1-T1',
          slice: 'S1',
          area: 'Auth',
          description: 'Task 1',
          acceptanceCriteria: 'Done',
          dependsOn: []
        }
      ];

      const events: LogEvent[] = [];

      const snapshot = computeSnapshot(tasks, events);

      expect(snapshot.summary.successRate).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle no events', () => {
      const tasks: Task[] = [
        {
          id: 'S1-T1',
          slice: 'S1',
          area: 'Auth',
          description: 'Task 1',
          acceptanceCriteria: 'Done',
          dependsOn: []
        }
      ];

      const events: LogEvent[] = [];

      const snapshot = computeSnapshot(tasks, events);

      expect(snapshot.tasks[0].status).toBe('READY');
      expect(snapshot.summary.ready).toBe(1);
    });

    it('should handle all failed tasks', () => {
      const tasks: Task[] = [
        {
          id: 'S1-T1',
          slice: 'S1',
          area: 'Auth',
          description: 'Task 1',
          acceptanceCriteria: 'Done',
          dependsOn: []
        },
        {
          id: 'S1-T2',
          slice: 'S1',
          area: 'Auth',
          description: 'Task 2',
          acceptanceCriteria: 'Done',
          dependsOn: []
        }
      ];

      const events: LogEvent[] = [
        {
          task_id: 'S1-T1',
          status: 'FAILED',
          timestamp: '2026-02-16T14:00:00Z',
          agent: 'claude'
        },
        {
          task_id: 'S1-T2',
          status: 'FAILED',
          timestamp: '2026-02-16T14:01:00Z',
          agent: 'claude'
        }
      ];

      const snapshot = computeSnapshot(tasks, events);

      expect(snapshot.summary.failed).toBe(2);
      expect(snapshot.summary.successRate).toBe(0);
    });

    it('should handle empty task list', () => {
      const tasks: Task[] = [];
      const events: LogEvent[] = [];

      const snapshot = computeSnapshot(tasks, events);

      expect(snapshot.tasks).toEqual([]);
      expect(snapshot.slices).toEqual({});
      expect(snapshot.summary).toEqual({
        total: 0,
        done: 0,
        failed: 0,
        blocked: 0,
        ready: 0,
        successRate: 0
      });
    });

    it('should sort tasks by ID deterministically', () => {
      const tasks: Task[] = [
        {
          id: 'S2-T1',
          slice: 'S2',
          area: 'API',
          description: 'Task 1',
          acceptanceCriteria: 'Done',
          dependsOn: []
        },
        {
          id: 'S1-T1',
          slice: 'S1',
          area: 'Auth',
          description: 'Task 1',
          acceptanceCriteria: 'Done',
          dependsOn: []
        }
      ];

      const events: LogEvent[] = [];

      const snapshot = computeSnapshot(tasks, events);

      expect(snapshot.tasks[0].id).toBe('S1-T1');
      expect(snapshot.tasks[1].id).toBe('S2-T1');
    });
  });
});
