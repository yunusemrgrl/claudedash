"use client";

import { CheckCircle, XCircle, Clock, FileText } from "lucide-react";
import { TypingPrompt } from "@/components/TypingPrompt";
import type { QualityEvent } from "@/types";

function QualityBadge({
  label,
  passed,
}: {
  label: string;
  passed: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
        passed
          ? "bg-chart-2/15 text-chart-2"
          : "bg-chart-5/15 text-chart-5"
      }`}
    >
      {passed ? (
        <CheckCircle className="size-2.5" />
      ) : (
        <XCircle className="size-2.5" />
      )}
      {label}
    </span>
  );
}

function formatTime(timestamp: string): string {
  try {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return timestamp;
  }
}

function formatDate(timestamp: string): string {
  try {
    return new Date(timestamp).toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export function QualityTimeline({ events }: { events: QualityEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="py-8">
        <TypingPrompt
          lines={[
            "No quality checks logged yet",
            `Add "quality": {"lint": true} to meta`,
            "Track lint, typecheck, and test results",
            "Results appear here per task",
          ]}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((event) => {
        const checks = event.checks;
        const allPassed = Object.values(checks).every(Boolean);
        const hasFailure = Object.values(checks).some((v) => v === false);

        return (
          <div
            key={`${event.timestamp}-${event.file}`}
            className={`p-3 rounded-lg border transition-colors ${
              hasFailure
                ? "bg-chart-5/5 border-chart-5/20"
                : allPassed
                  ? "bg-chart-2/5 border-chart-2/20"
                  : "bg-card border-border"
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Timeline dot */}
              <div className="mt-0.5 shrink-0">
                {hasFailure ? (
                  <XCircle className="size-3.5 text-chart-5" />
                ) : (
                  <CheckCircle className="size-3.5 text-chart-2" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                {/* File & task */}
                <div className="flex items-center gap-2 mb-1.5">
                  <FileText className="size-3 text-muted-foreground shrink-0" />
                  <span className="text-xs font-mono text-foreground truncate">
                    {event.file}
                  </span>
                  {event.taskId && (
                    <span className="text-[10px] text-muted-foreground/60 shrink-0">
                      ({event.taskId})
                    </span>
                  )}
                </div>

                {/* Quality badges */}
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {checks.lint !== undefined && (
                    <QualityBadge label="lint" passed={checks.lint} />
                  )}
                  {checks.typecheck !== undefined && (
                    <QualityBadge label="typecheck" passed={checks.typecheck} />
                  )}
                  {checks.test !== undefined && (
                    <QualityBadge label="test" passed={checks.test} />
                  )}
                </div>

                {/* Timestamp */}
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                  <Clock className="size-2.5" />
                  <span>
                    {formatDate(event.timestamp)} {formatTime(event.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
