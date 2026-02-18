import type { ClaudeSession, ContextHealth, ContextWarningLevel } from './types.js';

const DEFAULT_MAX_TOKENS = 200_000;

const WARN_THRESHOLD = 65;
const CRITICAL_THRESHOLD = 75;

/**
 * Derives warning level from a 0-100 percentage.
 */
function deriveWarningLevel(percentage: number): ContextWarningLevel {
  if (percentage >= CRITICAL_THRESHOLD) return 'critical';
  if (percentage >= WARN_THRESHOLD) return 'warn';
  return 'safe';
}

/**
 * Estimates context window usage percentage for a Claude session.
 *
 * Uses inputTokens as the primary proxy for context occupancy (see docs/context-estimation.md).
 * Returns null when token data is unavailable or empty.
 */
export function estimateContextPercentage(session: ClaudeSession): number | null {
  if (!session.tokenUsage) return null;

  const { inputTokens } = session.tokenUsage;
  if (inputTokens <= 0) return null;

  const percentage = Math.min(100, (inputTokens / DEFAULT_MAX_TOKENS) * 100);
  return Math.round(percentage * 10) / 10; // 1 decimal place
}

/**
 * Builds a full ContextHealth object for a session.
 * Returns null when estimation is impossible.
 */
export function buildContextHealth(session: ClaudeSession): ContextHealth | null {
  const percentage = estimateContextPercentage(session);
  if (percentage === null) return null;

  const tokensUsed = session.tokenUsage!.inputTokens;

  return {
    percentage,
    warningLevel: deriveWarningLevel(percentage),
    tokensUsed,
    maxTokens: DEFAULT_MAX_TOKENS,
    estimationMethod: 'token-based',
  };
}
