"use client";

import { AlertTriangle, AlertCircle, CheckCircle } from "lucide-react";
import type { ContextHealth } from "@/types";

function barColor(level: string): string {
  switch (level) {
    case "critical":
      return "bg-chart-5";
    case "warn":
      return "bg-chart-3";
    default:
      return "bg-chart-2";
  }
}

function iconColor(level: string): string {
  switch (level) {
    case "critical":
      return "text-chart-5";
    case "warn":
      return "text-chart-3";
    default:
      return "text-chart-2";
  }
}

function WarningIcon({ level }: { level: string }) {
  const cls = `size-3.5 ${iconColor(level)}`;
  if (level === "critical") return <AlertCircle className={cls} />;
  if (level === "warn") return <AlertTriangle className={cls} />;
  return <CheckCircle className={cls} />;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

/** Compact inline widget for use in session list cards */
export function ContextHealthMini({
  health,
}: {
  health: ContextHealth | null | undefined;
}) {
  if (!health) {
    return (
      <span className="text-[10px] text-muted-foreground/40">ctx –</span>
    );
  }

  const { percentage, warningLevel } = health;

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-mono ${iconColor(warningLevel)}`}
      title={`Context: ${percentage}% used (${warningLevel})\nTokens: ${formatTokens(health.tokensUsed)}${health.maxTokens ? ` / ${formatTokens(health.maxTokens)}` : ""}`}
    >
      <WarningIcon level={warningLevel} />
      {percentage}%
    </span>
  );
}

/** Full-width widget with progress bar, percentage label, and warning badge */
export function ContextHealthWidget({
  health,
}: {
  health: ContextHealth | null | undefined;
}) {
  if (!health) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground/40">
        <div className="flex-1 bg-muted rounded-full h-1.5" />
        <span className="font-mono shrink-0">–</span>
      </div>
    );
  }

  const { percentage, warningLevel, tokensUsed, maxTokens } = health;
  const color = barColor(warningLevel);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div
          className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden"
          title={`${percentage}% context used`}
        >
          <div
            className={`${color} h-1.5 rounded-full transition-all`}
            style={{ width: `${Math.min(100, percentage)}%` }}
          />
        </div>
        <div
          className={`flex items-center gap-1 text-[10px] font-mono shrink-0 ${iconColor(warningLevel)}`}
        >
          <WarningIcon level={warningLevel} />
          <span>{percentage}%</span>
        </div>
      </div>

      {warningLevel !== "safe" && (
        <div
          className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${
            warningLevel === "critical"
              ? "bg-chart-5/10 text-chart-5"
              : "bg-chart-3/10 text-chart-3"
          }`}
        >
          <WarningIcon level={warningLevel} />
          <span>
            {warningLevel === "critical" ? "Context critical" : "Context warn"}
            {maxTokens
              ? ` · ${formatTokens(tokensUsed)} / ${formatTokens(maxTokens)}`
              : ""}
          </span>
        </div>
      )}
    </div>
  );
}
