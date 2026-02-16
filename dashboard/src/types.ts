export type TaskStatus = "READY" | "BLOCKED" | "DONE" | "FAILED";

export interface Task {
  id: string;
  slice: string;
  area: string;
  description: string;
  acceptanceCriteria: string;
  dependsOn: string[];
}

export interface LogEvent {
  task_id: string;
  status: "DONE" | "FAILED";
  timestamp: string;
  agent: string;
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
    progress: number;
  }>;
  summary: {
    total: number;
    done: number;
    failed: number;
    blocked: number;
    ready: number;
    successRate: number;
  };
}

export interface SnapshotResponse {
  snapshot: Snapshot | null;
  queueErrors: string[];
  logErrors: string[];
  meta: {
    generatedAt: string;
    totalTasks: number;
  };
}
