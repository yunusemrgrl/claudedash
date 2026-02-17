import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { readSessions } from '../../src/core/todoReader.js';

const TEST_DIR = join(process.cwd(), 'tests', '.test-claude');
const TASKS_DIR = join(TEST_DIR, 'tasks');

function createTaskFile(sessionId: string, taskId: string, task: Record<string, unknown>) {
  const sessionDir = join(TASKS_DIR, sessionId);
  if (!existsSync(sessionDir)) {
    mkdirSync(sessionDir, { recursive: true });
  }
  writeFileSync(join(sessionDir, `${taskId}.json`), JSON.stringify(task));
}

describe('todoReader', () => {
  beforeEach(() => {
    mkdirSync(TASKS_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('readSessions', () => {
    it('should return empty array when tasks dir does not exist', () => {
      rmSync(TEST_DIR, { recursive: true, force: true });
      const sessions = readSessions(TEST_DIR);
      expect(sessions).toEqual([]);
    });

    it('should return empty array when tasks dir is empty', () => {
      const sessions = readSessions(TEST_DIR);
      expect(sessions).toEqual([]);
    });

    it('should read a session with tasks', () => {
      createTaskFile('session-1', '1', {
        id: '1',
        subject: 'Setup project',
        description: 'Initialize the project structure',
        activeForm: 'Setting up project',
        status: 'completed',
        blocks: [],
        blockedBy: []
      });

      createTaskFile('session-1', '2', {
        id: '2',
        subject: 'Add tests',
        description: 'Write unit tests',
        activeForm: 'Adding tests',
        status: 'pending',
        blocks: [],
        blockedBy: ['1']
      });

      const sessions = readSessions(TEST_DIR);

      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe('session-1');
      expect(sessions[0].tasks).toHaveLength(2);
      expect(sessions[0].tasks[0].id).toBe('1');
      expect(sessions[0].tasks[0].subject).toBe('Setup project');
      expect(sessions[0].tasks[0].status).toBe('completed');
      expect(sessions[0].tasks[1].id).toBe('2');
      expect(sessions[0].tasks[1].blockedBy).toEqual(['1']);
    });

    it('should read multiple sessions', () => {
      createTaskFile('session-a', '1', {
        id: '1',
        subject: 'Task A1',
        description: '',
        activeForm: '',
        status: 'completed',
        blocks: [],
        blockedBy: []
      });

      createTaskFile('session-b', '1', {
        id: '1',
        subject: 'Task B1',
        description: '',
        activeForm: '',
        status: 'in_progress',
        blocks: [],
        blockedBy: []
      });

      const sessions = readSessions(TEST_DIR);

      expect(sessions).toHaveLength(2);
      // Both sessions should have tasks
      const ids = sessions.map(s => s.id).sort();
      expect(ids).toEqual(['session-a', 'session-b']);
    });

    it('should sort tasks by numeric ID', () => {
      createTaskFile('session-1', '3', {
        id: '3', subject: 'Third', description: '', activeForm: '',
        status: 'pending', blocks: [], blockedBy: []
      });
      createTaskFile('session-1', '1', {
        id: '1', subject: 'First', description: '', activeForm: '',
        status: 'completed', blocks: [], blockedBy: []
      });
      createTaskFile('session-1', '2', {
        id: '2', subject: 'Second', description: '', activeForm: '',
        status: 'in_progress', blocks: [], blockedBy: []
      });

      const sessions = readSessions(TEST_DIR);
      const taskIds = sessions[0].tasks.map(t => t.id);
      expect(taskIds).toEqual(['1', '2', '3']);
    });

    it('should skip .lock and non-JSON files', () => {
      createTaskFile('session-1', '1', {
        id: '1', subject: 'Task', description: '', activeForm: '',
        status: 'pending', blocks: [], blockedBy: []
      });
      // Create a .lock file
      const sessionDir = join(TASKS_DIR, 'session-1');
      writeFileSync(join(sessionDir, '.lock'), '');
      writeFileSync(join(sessionDir, '.highwatermark'), '5');
      writeFileSync(join(sessionDir, 'notes.txt'), 'not a task');

      const sessions = readSessions(TEST_DIR);

      expect(sessions).toHaveLength(1);
      expect(sessions[0].tasks).toHaveLength(1);
    });

    it('should skip invalid JSON files', () => {
      const sessionDir = join(TASKS_DIR, 'session-1');
      mkdirSync(sessionDir, { recursive: true });
      writeFileSync(join(sessionDir, '1.json'), 'not valid json');
      createTaskFile('session-1', '2', {
        id: '2', subject: 'Valid', description: '', activeForm: '',
        status: 'pending', blocks: [], blockedBy: []
      });

      const sessions = readSessions(TEST_DIR);

      expect(sessions).toHaveLength(1);
      expect(sessions[0].tasks).toHaveLength(1);
      expect(sessions[0].tasks[0].id).toBe('2');
    });

    it('should skip tasks with invalid status', () => {
      createTaskFile('session-1', '1', {
        id: '1', subject: 'Bad status', description: '', activeForm: '',
        status: 'running', blocks: [], blockedBy: []
      });
      createTaskFile('session-1', '2', {
        id: '2', subject: 'Good', description: '', activeForm: '',
        status: 'pending', blocks: [], blockedBy: []
      });

      const sessions = readSessions(TEST_DIR);

      expect(sessions[0].tasks).toHaveLength(1);
      expect(sessions[0].tasks[0].id).toBe('2');
    });

    it('should skip tasks without id', () => {
      createTaskFile('session-1', '1', {
        subject: 'No ID', description: '', activeForm: '',
        status: 'pending', blocks: [], blockedBy: []
      });

      const sessions = readSessions(TEST_DIR);

      expect(sessions).toEqual([]);
    });

    it('should handle missing optional fields gracefully', () => {
      createTaskFile('session-1', '1', {
        id: '1',
        status: 'pending'
      });

      const sessions = readSessions(TEST_DIR);

      expect(sessions).toHaveLength(1);
      expect(sessions[0].tasks[0]).toEqual({
        id: '1',
        subject: '',
        description: '',
        activeForm: '',
        status: 'pending',
        blocks: [],
        blockedBy: []
      });
    });

    it('should skip sessions with no valid tasks', () => {
      const sessionDir = join(TASKS_DIR, 'empty-session');
      mkdirSync(sessionDir, { recursive: true });
      writeFileSync(join(sessionDir, '.lock'), '');

      const sessions = readSessions(TEST_DIR);

      expect(sessions).toEqual([]);
    });

    it('should set createdAt and updatedAt from file stats', () => {
      createTaskFile('session-1', '1', {
        id: '1', subject: 'Task', description: '', activeForm: '',
        status: 'completed', blocks: [], blockedBy: []
      });

      const sessions = readSessions(TEST_DIR);

      expect(sessions[0].createdAt).toBeTruthy();
      expect(sessions[0].updatedAt).toBeTruthy();
      // Should be valid ISO dates
      expect(new Date(sessions[0].createdAt).getTime()).not.toBeNaN();
      expect(new Date(sessions[0].updatedAt).getTime()).not.toBeNaN();
    });

    it('should handle all three statuses', () => {
      createTaskFile('session-1', '1', {
        id: '1', subject: 'Done', description: '', activeForm: '',
        status: 'completed', blocks: [], blockedBy: []
      });
      createTaskFile('session-1', '2', {
        id: '2', subject: 'Working', description: '', activeForm: 'Working on it',
        status: 'in_progress', blocks: [], blockedBy: []
      });
      createTaskFile('session-1', '3', {
        id: '3', subject: 'Waiting', description: '', activeForm: '',
        status: 'pending', blocks: [], blockedBy: []
      });

      const sessions = readSessions(TEST_DIR);

      expect(sessions[0].tasks[0].status).toBe('completed');
      expect(sessions[0].tasks[1].status).toBe('in_progress');
      expect(sessions[0].tasks[2].status).toBe('pending');
    });

    it('should filter non-string values from blocks/blockedBy arrays', () => {
      createTaskFile('session-1', '1', {
        id: '1', subject: 'Task', description: '', activeForm: '',
        status: 'pending', blocks: ['2', 3, null], blockedBy: [true, '4']
      });

      const sessions = readSessions(TEST_DIR);

      expect(sessions[0].tasks[0].blocks).toEqual(['2']);
      expect(sessions[0].tasks[0].blockedBy).toEqual(['4']);
    });
  });
});
