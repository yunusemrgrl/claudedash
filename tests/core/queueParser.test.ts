import { describe, it, expect } from 'vitest';
import { parseQueue } from '../../src/core/queueParser.js';

describe('queueParser', () => {
  describe('valid queue parsing', () => {
    it('should parse a simple valid queue', () => {
      const content = `# Slice S1

## S1-T1
Area: Auth
Depends: -
Description: Setup auth system
AC: User login works

## S1-T2
Area: Auth
Depends: S1-T1
Description: Add password reset
AC: Reset email sent`;

      const result = parseQueue(content);

      expect(result.errors).toEqual([]);
      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0]).toEqual({
        id: 'S1-T1',
        slice: 'S1',
        area: 'Auth',
        description: 'Setup auth system',
        acceptanceCriteria: 'User login works',
        dependsOn: []
      });
      expect(result.tasks[1]).toEqual({
        id: 'S1-T2',
        slice: 'S1',
        area: 'Auth',
        description: 'Add password reset',
        acceptanceCriteria: 'Reset email sent',
        dependsOn: ['S1-T1']
      });
    });

    it('should parse multiple slices', () => {
      const content = `# Slice S1

## S1-T1
Area: Auth
Depends: -
Description: Setup auth
AC: Works

# Slice S2

## S2-T1
Area: API
Depends: S1-T1
Description: Build API
AC: Returns data`;

      const result = parseQueue(content);

      expect(result.errors).toEqual([]);
      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0].slice).toBe('S1');
      expect(result.tasks[1].slice).toBe('S2');
      expect(result.tasks[1].dependsOn).toEqual(['S1-T1']);
    });

    it('should parse comma-separated dependencies', () => {
      const content = `# Slice S1

## S1-T1
Area: Auth
Depends: -
Description: Task 1
AC: Done

## S1-T2
Area: Auth
Depends: -
Description: Task 2
AC: Done

## S1-T3
Area: Auth
Depends: S1-T1, S1-T2
Description: Task 3
AC: Done`;

      const result = parseQueue(content);

      expect(result.errors).toEqual([]);
      expect(result.tasks[2].dependsOn).toEqual(['S1-T1', 'S1-T2']);
    });

    it('should handle extra whitespace', () => {
      const content = `# Slice S1

## S1-T1
Area:   Auth
Depends:  -
Description:   Setup auth
AC:  Works  `;

      const result = parseQueue(content);

      expect(result.errors).toEqual([]);
      expect(result.tasks[0].area).toBe('Auth');
      expect(result.tasks[0].description).toBe('Setup auth');
    });
  });

  describe('missing fields', () => {
    it('should report missing Area field', () => {
      const content = `# Slice S1

## S1-T1
Depends: -
Description: Setup auth
AC: Works`;

      const result = parseQueue(content);

      expect(result.errors).toContain('Task S1-T1 missing Area field');
      expect(result.tasks).toHaveLength(0);
    });

    it('should report missing Depends field', () => {
      const content = `# Slice S1

## S1-T1
Area: Auth
Description: Setup auth
AC: Works`;

      const result = parseQueue(content);

      expect(result.errors).toContain('Task S1-T1 missing Depends field');
    });

    it('should report missing Description field', () => {
      const content = `# Slice S1

## S1-T1
Area: Auth
Depends: -
AC: Works`;

      const result = parseQueue(content);

      expect(result.errors).toContain('Task S1-T1 missing Description field');
    });

    it('should report missing AC field', () => {
      const content = `# Slice S1

## S1-T1
Area: Auth
Depends: -
Description: Setup auth`;

      const result = parseQueue(content);

      expect(result.errors).toContain('Task S1-T1 missing AC field');
    });

    it('should report multiple missing fields', () => {
      const content = `# Slice S1

## S1-T1
Area: Auth`;

      const result = parseQueue(content);

      expect(result.errors).toContain('Task S1-T1 missing Depends field');
      expect(result.errors).toContain('Task S1-T1 missing Description field');
      expect(result.errors).toContain('Task S1-T1 missing AC field');
    });
  });

  describe('duplicate IDs', () => {
    it('should detect duplicate task IDs', () => {
      const content = `# Slice S1

## S1-T1
Area: Auth
Depends: -
Description: First
AC: Works

## S1-T1
Area: API
Depends: -
Description: Duplicate
AC: Works`;

      const result = parseQueue(content);

      expect(result.errors).toContain('Duplicate task ID: S1-T1');
      expect(result.tasks).toHaveLength(2);
    });
  });

  describe('unknown dependencies', () => {
    it('should detect unknown dependency', () => {
      const content = `# Slice S1

## S1-T1
Area: Auth
Depends: S1-T99
Description: Task 1
AC: Works`;

      const result = parseQueue(content);

      expect(result.errors).toContain('Task S1-T1 depends on unknown task: S1-T99');
    });

    it('should detect multiple unknown dependencies', () => {
      const content = `# Slice S1

## S1-T1
Area: Auth
Depends: S1-T99, S2-T88
Description: Task 1
AC: Works`;

      const result = parseQueue(content);

      expect(result.errors).toContain('Task S1-T1 depends on unknown task: S1-T99');
      expect(result.errors).toContain('Task S1-T1 depends on unknown task: S2-T88');
    });
  });

  describe('circular dependencies', () => {
    it('should detect simple circular dependency (A -> B -> A)', () => {
      const content = `# Slice S1

## S1-T1
Area: Auth
Depends: S1-T2
Description: Task 1
AC: Works

## S1-T2
Area: Auth
Depends: S1-T1
Description: Task 2
AC: Works`;

      const result = parseQueue(content);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('Circular dependency'))).toBe(true);
    });

    it('should detect indirect circular dependency (A -> B -> C -> A)', () => {
      const content = `# Slice S1

## S1-T1
Area: Auth
Depends: S1-T3
Description: Task 1
AC: Works

## S1-T2
Area: Auth
Depends: S1-T1
Description: Task 2
AC: Works

## S1-T3
Area: Auth
Depends: S1-T2
Description: Task 3
AC: Works`;

      const result = parseQueue(content);

      expect(result.errors.some(e => e.includes('Circular dependency'))).toBe(true);
    });

    it('should detect self-dependency', () => {
      const content = `# Slice S1

## S1-T1
Area: Auth
Depends: S1-T1
Description: Task 1
AC: Works`;

      const result = parseQueue(content);

      expect(result.errors.some(e => e.includes('Circular dependency'))).toBe(true);
    });

    it('should allow valid dependency chains without cycles', () => {
      const content = `# Slice S1

## S1-T1
Area: Auth
Depends: -
Description: Task 1
AC: Works

## S1-T2
Area: Auth
Depends: S1-T1
Description: Task 2
AC: Works

## S1-T3
Area: Auth
Depends: S1-T2
Description: Task 3
AC: Works`;

      const result = parseQueue(content);

      expect(result.errors.filter(e => e.includes('Circular dependency'))).toEqual([]);
    });

    it('should allow diamond dependencies (A -> B, A -> C, B -> D, C -> D)', () => {
      const content = `# Slice S1

## S1-T1
Area: Auth
Depends: -
Description: Task 1
AC: Works

## S1-T2
Area: Auth
Depends: S1-T1
Description: Task 2
AC: Works

## S1-T3
Area: Auth
Depends: S1-T1
Description: Task 3
AC: Works

## S1-T4
Area: Auth
Depends: S1-T2, S1-T3
Description: Task 4
AC: Works`;

      const result = parseQueue(content);

      expect(result.errors.filter(e => e.includes('Circular dependency'))).toEqual([]);
      expect(result.tasks).toHaveLength(4);
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', () => {
      const result = parseQueue('');

      expect(result.tasks).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it('should handle content with only slice headers', () => {
      const content = `# Slice S1
# Slice S2`;

      const result = parseQueue(content);

      expect(result.tasks).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it('should handle content with only whitespace', () => {
      const content = '   \n\n   \n';

      const result = parseQueue(content);

      expect(result.tasks).toEqual([]);
      expect(result.errors).toEqual([]);
    });
  });
});
