import { describe, it, expect } from 'vitest';
import { estimateContextPercentage, buildContextHealth } from '../../src/core/contextHealth.js';
import type { ClaudeSession } from '../../src/core/types.js';

function makeSession(inputTokens?: number): ClaudeSession {
  return {
    id: 'test-session',
    tasks: [],
    createdAt: '2026-02-18T00:00:00Z',
    updatedAt: '2026-02-18T00:00:00Z',
    ...(inputTokens !== undefined && {
      tokenUsage: {
        inputTokens,
        outputTokens: 500,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
      },
    }),
  };
}

describe('estimateContextPercentage', () => {
  it('should return null when no tokenUsage', () => {
    expect(estimateContextPercentage(makeSession())).toBeNull();
  });

  it('should return null when inputTokens is 0', () => {
    expect(estimateContextPercentage(makeSession(0))).toBeNull();
  });

  it('should return correct percentage for 100k tokens (50%)', () => {
    const result = estimateContextPercentage(makeSession(100_000));
    expect(result).toBe(50);
  });

  it('should return correct percentage for 130k tokens (65%)', () => {
    const result = estimateContextPercentage(makeSession(130_000));
    expect(result).toBe(65);
  });

  it('should return correct percentage for 150k tokens (75%)', () => {
    const result = estimateContextPercentage(makeSession(150_000));
    expect(result).toBe(75);
  });

  it('should cap at 100% when tokens exceed max', () => {
    const result = estimateContextPercentage(makeSession(250_000));
    expect(result).toBe(100);
  });

  it('should return 1 decimal place', () => {
    // 10001 / 200000 = 5.0005 -> 5.0
    const result = estimateContextPercentage(makeSession(10_001));
    expect(typeof result).toBe('number');
    const str = result!.toString();
    const decimals = str.includes('.') ? str.split('.')[1].length : 0;
    expect(decimals).toBeLessThanOrEqual(1);
  });
});

describe('buildContextHealth', () => {
  it('should return null when estimation impossible', () => {
    expect(buildContextHealth(makeSession())).toBeNull();
  });

  it('should return safe level for < 65%', () => {
    const health = buildContextHealth(makeSession(100_000))!;
    expect(health.warningLevel).toBe('safe');
    expect(health.percentage).toBe(50);
  });

  it('should return warn level at 65%', () => {
    const health = buildContextHealth(makeSession(130_000))!;
    expect(health.warningLevel).toBe('warn');
  });

  it('should return critical level at 75%+', () => {
    const health = buildContextHealth(makeSession(150_000))!;
    expect(health.warningLevel).toBe('critical');
  });

  it('should include tokensUsed and maxTokens', () => {
    const health = buildContextHealth(makeSession(50_000))!;
    expect(health.tokensUsed).toBe(50_000);
    expect(health.maxTokens).toBe(200_000);
  });

  it('should set estimationMethod to token-based', () => {
    const health = buildContextHealth(makeSession(10_000))!;
    expect(health.estimationMethod).toBe('token-based');
  });
});
