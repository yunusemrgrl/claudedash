"use client";

import { useState, useEffect } from "react";
import { BarChart2, Zap, MessageSquare, GitCommit, Clock, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { UsageStats, ActivitySession, ActivitySessionsResponse } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtModelName(id: string): string {
  if (id.includes("opus-4-6")) return "Opus 4.6";
  if (id.includes("sonnet-4-6")) return "Sonnet 4.6";
  if (id.includes("haiku-4-5")) return "Haiku 4.5";
  if (id.includes("opus-4-5")) return "Opus 4.5";
  if (id.includes("sonnet-4-5")) return "Sonnet 4.5";
  // fallback: shorten
  const parts = id.split("-");
  return parts.slice(0, 3).join(" ");
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ── Summary Card ─────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, colorClass }: { label: string; value: string; sub?: string; colorClass?: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className={`text-2xl font-bold ${colorClass ?? "text-foreground"}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
      {sub && <div className="text-[11px] text-muted-foreground/60 mt-0.5">{sub}</div>}
    </div>
  );
}

// ── 7-day bar chart ───────────────────────────────────────────────────────────
function DailyBarChart({ data }: { data: { date: string; messageCount: number; sessionCount: number }[] }) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map(d => d.messageCount), 1);
  return (
    <div>
      <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Last 7 Days — Messages</h4>
      <div className="flex items-end gap-1.5 h-24">
        {data.map((d) => {
          const pct = (d.messageCount / max) * 100;
          const shortDate = new Date(d.date).toLocaleDateString("en", { weekday: "short" });
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
              {/* Tooltip */}
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-popover border border-border text-[10px] text-foreground px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                {d.date}: {fmtNum(d.messageCount)} msgs · {d.sessionCount} sessions
              </div>
              <div
                className="w-full rounded-sm bg-chart-1/70 hover:bg-chart-1 transition-colors min-h-[2px]"
                style={{ height: `${Math.max(pct, 2)}%` }}
              />
              <span className="text-[9px] text-muted-foreground/60">{shortDate}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Hour heatmap ──────────────────────────────────────────────────────────────
function HourHeatmap({ hourCounts }: { hourCounts: Record<string, number> }) {
  const max = Math.max(...Object.values(hourCounts), 1);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  return (
    <div>
      <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Peak Hours</h4>
      <div className="flex gap-0.5">
        {hours.map((h) => {
          const count = hourCounts[String(h)] ?? 0;
          const intensity = count / max;
          const opacity = intensity < 0.1 ? 0.06 : intensity < 0.3 ? 0.2 : intensity < 0.6 ? 0.5 : 0.85;
          return (
            <div key={h} className="relative group flex-1">
              <div
                className="h-6 rounded-sm bg-chart-2"
                style={{ opacity }}
                title={`${h}:00 — ${count} sessions`}
              />
              {/* Tooltip */}
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-popover border border-border text-[10px] text-foreground px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                {h}:00 · {count}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground/40 mt-1">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>23:00</span>
      </div>
    </div>
  );
}

// ── Model usage table ─────────────────────────────────────────────────────────
function ModelTable({ modelUsage }: { modelUsage: Record<string, { inputTokens: number; outputTokens: number; cacheReadInputTokens: number }> }) {
  const entries = Object.entries(modelUsage);
  if (entries.length === 0) return null;
  return (
    <div>
      <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Model Usage</h4>
      <div className="space-y-2">
        {entries.map(([id, usage]) => {
          const total = usage.inputTokens + usage.outputTokens + usage.cacheReadInputTokens;
          return (
            <div key={id} className="bg-card border border-border rounded-lg px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">{fmtModelName(id)}</span>
                <span className="text-xs text-muted-foreground">{fmtNum(total)} total tokens</span>
              </div>
              <div className="flex gap-4 text-[11px]">
                <span className="text-chart-1"><span className="text-muted-foreground">In </span>{fmtNum(usage.inputTokens)}</span>
                <span className="text-chart-2"><span className="text-muted-foreground">Out </span>{fmtNum(usage.outputTokens)}</span>
                <span className="text-chart-4"><span className="text-muted-foreground">Cache </span>{fmtNum(usage.cacheReadInputTokens)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Recent sessions list ──────────────────────────────────────────────────────
function SessionRow({ s }: { s: ActivitySession }) {
  const [expanded, setExpanded] = useState(false);
  const topLangs = Object.entries(s.languages).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([l]) => l);
  const topTools = Object.entries(s.toolCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-left px-4 py-3 hover:bg-accent/40 transition-colors flex items-start gap-3"
      >
        {expanded ? <ChevronDown className="size-3.5 text-muted-foreground mt-0.5 shrink-0" /> : <ChevronRight className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-foreground truncate">
              {s.projectName ?? s.sessionId.slice(0, 8)}
            </span>
            {topLangs.length > 0 && (
              <div className="flex gap-1">
                {topLangs.map(l => (
                  <span key={l} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{l}</span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            {s.startTime && <span>{timeAgo(s.startTime)}</span>}
            {s.durationMinutes && <span><Clock className="size-3 inline mr-0.5" />{s.durationMinutes}m</span>}
            <span><MessageSquare className="size-3 inline mr-0.5" />{s.userMessageCount} msgs</span>
            {s.gitCommits > 0 && <span className="text-chart-2"><GitCommit className="size-3 inline mr-0.5" />{s.gitCommits} commits</span>}
            {s.linesAdded > 0 && <span className="text-chart-1">+{fmtNum(s.linesAdded)} lines</span>}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-3 bg-sidebar/30 space-y-3">
          {s.firstPrompt && (
            <p className="text-[11px] text-muted-foreground/80 italic line-clamp-2">
              &ldquo;{s.firstPrompt.slice(0, 200)}{s.firstPrompt.length > 200 ? "…" : ""}&rdquo;
            </p>
          )}
          <div className="flex flex-wrap gap-4 text-[11px]">
            <span><span className="text-muted-foreground">Tokens in/out: </span>
              {fmtNum(s.inputTokens)} / {fmtNum(s.outputTokens)}</span>
            {s.toolErrors > 0 && <span className="text-chart-5">{s.toolErrors} tool errors</span>}
            {s.usesMcp && <span className="text-chart-4">MCP</span>}
            {s.usesWebSearch && <span className="text-chart-4">Web Search</span>}
          </div>
          {topTools.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {topTools.map(([tool, count]) => (
                <span key={tool} className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded">
                  {tool}: {String(count)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main ActivityView ─────────────────────────────────────────────────────────
export function ActivityView() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [sessions, setSessions] = useState<ActivitySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const [usageRes, sessionsRes] = await Promise.all([
        fetch("/usage"),
        fetch("/activity/sessions"),
      ]);
      if (usageRes.ok) {
        const data = await usageRes.json() as UsageStats;
        setStats(data);
      }
      if (sessionsRes.ok) {
        const data = await sessionsRes.json() as ActivitySessionsResponse;
        setSessions(data.sessions);
      }
      if (!usageRes.ok && !sessionsRes.ok) setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <BarChart2 className="size-10 mx-auto mb-3 text-muted-foreground animate-pulse" />
          <p className="text-xs text-muted-foreground">Loading activity data…</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <BarChart2 className="size-12 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground mb-2">No activity data found</p>
          <p className="text-xs text-muted-foreground/60">
            Start a Claude Code session to generate{" "}
            <code className="bg-muted px-1 rounded">~/.claude/stats-cache.json</code>
          </p>
        </div>
      </div>
    );
  }

  // Compute total lines added + git commits from sessions
  const totalLinesAdded = sessions.reduce((s, x) => s + (x.linesAdded ?? 0), 0);
  const totalGitCommits = sessions.reduce((s, x) => s + (x.gitCommits ?? 0), 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2 border-b border-border bg-sidebar/30 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <BarChart2 className="size-4 text-chart-1" />
          <span className="text-sm font-medium">Activity</span>
          {stats.lastComputedDate && (
            <span className="text-xs text-muted-foreground">
              Last updated: {stats.lastComputedDate}
            </span>
          )}
        </div>
        <button
          onClick={load}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          title="Refresh"
        >
          <RefreshCw className="size-3" />
          Refresh
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-8 max-w-4xl mx-auto">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Total Sessions"
              value={fmtNum(stats.totalSessions)}
              sub={stats.firstSessionDate ? `Since ${new Date(stats.firstSessionDate).toLocaleDateString("en", { month: "short", day: "numeric" })}` : undefined}
              colorClass="text-chart-1"
            />
            <StatCard
              label="Total Messages"
              value={fmtNum(stats.totalMessages)}
              colorClass="text-chart-2"
            />
            <StatCard
              label="Lines Added"
              value={totalLinesAdded > 0 ? `+${fmtNum(totalLinesAdded)}` : "—"}
              colorClass="text-chart-4"
            />
            <StatCard
              label="Git Commits"
              value={totalGitCommits > 0 ? fmtNum(totalGitCommits) : "—"}
              colorClass="text-chart-3"
            />
          </div>

          {/* Daily bar chart */}
          {stats.dailyActivity.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-5">
              <DailyBarChart data={stats.dailyActivity} />
            </div>
          )}

          {/* Hour heatmap + Model usage side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Object.keys(stats.hourCounts).length > 0 && (
              <div className="bg-card border border-border rounded-lg p-5">
                <HourHeatmap hourCounts={stats.hourCounts} />
              </div>
            )}
            {Object.keys(stats.modelUsage).length > 0 && (
              <div className="bg-card border border-border rounded-lg p-5">
                <ModelTable modelUsage={stats.modelUsage} />
              </div>
            )}
          </div>

          {/* Longest session callout */}
          {stats.longestSession && (
            <div className="bg-chart-4/5 border border-chart-4/20 rounded-lg px-5 py-4 flex items-center gap-4">
              <Zap className="size-5 text-chart-4 shrink-0" />
              <div>
                <span className="text-xs font-semibold text-foreground">Longest session: </span>
                <span className="text-xs text-muted-foreground">
                  {stats.longestSession.messageCount} messages ·{" "}
                  {Math.round(stats.longestSession.duration / 60000)}m ·{" "}
                  {new Date(stats.longestSession.timestamp).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}

          {/* Recent sessions */}
          {sessions.length > 0 && (
            <div>
              <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Recent Sessions ({sessions.length})
              </h4>
              <div className="space-y-2">
                {sessions.map((s) => (
                  <SessionRow key={s.sessionId} s={s} />
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
