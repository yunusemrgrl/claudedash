"use client";

import { useState, useEffect, useRef } from "react";
import {
  GitBranch,
  ChevronRight,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TypingPrompt } from "@/components/TypingPrompt";
import type { WorktreeState } from "@/types";

interface WorktreesResponse {
  worktrees: WorktreeState[];
}

function basename(path: string): string {
  return path.split("/").filter(Boolean).pop() ?? path;
}

function WorktreeRow({ wt }: { wt: WorktreeState }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-accent/40 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
        )}

        {/* Path */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">
              {basename(wt.path)}
            </span>
            {wt.dirty && (
              <span title="Dirty — has uncommitted changes">
                <AlertCircle className="size-3 text-chart-3 shrink-0" />
              </span>
            )}
            {!wt.dirty && (
              <span title="Clean">
                <CheckCircle className="size-3 text-chart-2 shrink-0" />
              </span>
            )}
          </div>
          <div className="text-[10px] text-muted-foreground/60 font-mono truncate mt-0.5">
            {wt.path}
          </div>
        </div>

        {/* Branch */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
          <GitBranch className="size-3" />
          <span className="font-mono max-w-[120px] truncate">{wt.branch}</span>
        </div>

        {/* Ahead / Behind */}
        <div className="flex items-center gap-2 text-[10px] shrink-0">
          {wt.aheadCount > 0 && (
            <span className="flex items-center gap-0.5 text-chart-2">
              <ArrowUp className="size-2.5" />
              {wt.aheadCount}
            </span>
          )}
          {wt.behindCount > 0 && (
            <span className="flex items-center gap-0.5 text-chart-5">
              <ArrowDown className="size-2.5" />
              {wt.behindCount}
            </span>
          )}
          {wt.aheadCount === 0 && wt.behindCount === 0 && (
            <span className="text-muted-foreground/40">synced</span>
          )}
        </div>

        {/* Task count badge */}
        {(wt.associatedTasks?.length ?? 0) > 0 && (
          <span className="text-[10px] bg-chart-4/20 text-chart-4 px-1.5 py-0.5 rounded shrink-0">
            {wt.associatedTasks!.length} task
            {wt.associatedTasks!.length !== 1 ? "s" : ""}
          </span>
        )}
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-2 bg-sidebar/30">
          {/* HEAD commit */}
          {wt.head && (
            <div className="text-[10px] text-muted-foreground/60 font-mono">
              HEAD: {wt.head.slice(0, 12)}
            </div>
          )}

          {/* Associated tasks */}
          {(wt.associatedTasks?.length ?? 0) > 0 ? (
            <div className="space-y-1">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">
                Associated Tasks
              </div>
              {wt.associatedTasks!.map((t, i) => (
                <div
                  key={`${t.sessionId}-${t.taskId}-${i}`}
                  className="flex items-center gap-2 text-xs p-2 rounded bg-card border border-border"
                >
                  <span className="font-mono text-muted-foreground shrink-0">
                    #{t.taskId}
                  </span>
                  <span className="text-foreground truncate">{t.taskSubject}</span>
                  <span className="text-[10px] text-muted-foreground/40 font-mono shrink-0 ml-auto">
                    {t.sessionId.slice(0, 8)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground/40 py-2">
              No tasks associated with this worktree
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function WorktreePanel() {
  const [worktrees, setWorktrees] = useState<WorktreeState[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchWorktrees = async () => {
    try {
      const res = await fetch("/worktrees");
      if (!res.ok) return;
      const data: WorktreesResponse = await res.json();
      setWorktrees(data.worktrees ?? []);
      setLastRefresh(new Date());
    } catch {
      /* degrade gracefully */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorktrees();
    // Auto-refresh every 30 seconds
    timerRef.current = setInterval(fetchWorktrees, 30_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-sidebar border-b border-sidebar-border px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <GitBranch className="size-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Worktrees
          </span>
          {worktrees.length > 0 && (
            <span className="text-xs text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded">
              {worktrees.length}
            </span>
          )}
        </div>
        <button
          onClick={fetchWorktrees}
          className="p-1 rounded hover:bg-sidebar-accent transition-colors"
          title="Refresh worktrees"
        >
          <RefreshCw className="size-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground/40 text-xs">
          Loading...
        </div>
      ) : worktrees.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <TypingPrompt
            lines={[
              "No git worktrees detected",
              "git worktree add ../my-project-feat feature/xyz",
              "Run agents in parallel across branches",
              "Each worktree gets its own task list here",
            ]}
          />
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {worktrees.map((wt) => (
              <WorktreeRow key={wt.path} wt={wt} />
            ))}
          </div>
          {lastRefresh && (
            <div className="px-4 pb-3 text-[10px] text-muted-foreground/40 text-center">
              Last refresh: {lastRefresh.toLocaleTimeString()}
            </div>
          )}
        </ScrollArea>
      )}
    </div>
  );
}
