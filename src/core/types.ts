export type TaskStatus = "READY" | "BLOCKED" | "DONE" | "FAILED";

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
  status: "DONE" | "FAILED";
  timestamp: string;      // ISO-8601
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
