export type TaskStatus = "READY" | "BLOCKED" | "DONE" | "FAILED";

// Live mode types (Claude Code TodoWrite)
export type ClaudeTaskStatus = "pending" | "in_progress" | "completed";

export interface ClaudeTask {
  id: string;
  subject: string;
  description: string;
  activeForm: string;
  status: ClaudeTaskStatus;
  blocks: string[];
  blockedBy: string[];
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
}

export interface ClaudeSession {
  id: string;
  tasks: ClaudeTask[];
  createdAt: string;
  updatedAt: string;
  projectName?: string;
  cwd?: string;
  tokenUsage?: TokenUsage;
}

export interface Task {
  id: string;             // S1-T1
  slice: string;          // S1
  area: string;
  description: string;
  acceptanceCriteria: string;
  dependsOn: string[];
}

export interface LogEvent {
  task_id: string;
  status: "DONE" | "FAILED" | "BLOCKED";
  timestamp: string;      // ISO-8601
  agent: string;
  reason?: string;        // Required when status is BLOCKED
  meta?: Record<string, unknown>;
}

export interface ComputedTask extends Task {
  status: TaskStatus;
  lastEvent?: LogEvent;
}

export interface Snapshot {
  tasks: ComputedTask[];
  slices: Record<string, {
    total: number;
    done: number;
    failed: number;
    blocked: number;
    ready: number;
    progress: number;     // percentage
  }>;
  summary: {
    total: number;
    done: number;
    failed: number;
    blocked: number;
    ready: number;
    successRate: number;  // done / (done + failed)
  };
}
