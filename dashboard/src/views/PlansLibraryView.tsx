"use client";

import { useState, useEffect } from "react";
import { FileText, RefreshCw, ChevronRight, Calendar } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Plan, PlansResponse } from "@/types";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// Very simple markdown renderer — headings, bold, code blocks, bullets
function SimpleMarkdown({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCode = false;
  let codeLines: string[] = [];
  let key = 0;

  const flush = () => {
    if (codeLines.length > 0) {
      elements.push(
        <pre key={key++} className="bg-muted rounded-md p-3 text-[11px] font-mono overflow-x-auto mb-3 text-foreground/80">
          {codeLines.join("\n")}
        </pre>
      );
      codeLines = [];
    }
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) { flush(); inCode = false; }
      else { inCode = true; }
      continue;
    }
    if (inCode) { codeLines.push(line); continue; }

    if (line.startsWith("# ")) {
      elements.push(<h2 key={key++} className="text-base font-bold text-foreground mt-4 mb-2">{line.slice(2)}</h2>);
    } else if (line.startsWith("## ")) {
      elements.push(<h3 key={key++} className="text-sm font-semibold text-foreground mt-3 mb-1.5">{line.slice(3)}</h3>);
    } else if (line.startsWith("### ")) {
      elements.push(<h4 key={key++} className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-2 mb-1">{line.slice(4)}</h4>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <li key={key++} className="text-xs text-muted-foreground ml-4 mb-0.5 list-disc">
          {line.slice(2)}
        </li>
      );
    } else if (line.match(/^\d+\. /)) {
      const text = line.replace(/^\d+\. /, "");
      elements.push(
        <li key={key++} className="text-xs text-muted-foreground ml-4 mb-0.5 list-decimal">
          {text}
        </li>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={key++} className="h-2" />);
    } else {
      // Inline code
      const parts = line.split(/(`[^`]+`)/g);
      elements.push(
        <p key={key++} className="text-xs text-muted-foreground mb-0.5">
          {parts.map((p, i) =>
            p.startsWith("`") && p.endsWith("`")
              ? <code key={i} className="bg-muted px-1 rounded text-[11px] font-mono text-foreground">{p.slice(1, -1)}</code>
              : p
          )}
        </p>
      );
    }
  }
  flush();
  return <div>{elements}</div>;
}

export function PlansLibraryView() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/plans");
      if (res.ok) {
        const data = await res.json() as PlansResponse;
        setPlans(data.plans);
        if (data.plans.length > 0 && !selected) setSelected(data.plans[0]);
      }
    } catch { /* no data */ }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <FileText className="size-8 text-muted-foreground/30 animate-pulse" />
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <FileText className="size-12 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground mb-2">No plans yet</p>
          <p className="text-xs text-muted-foreground/60">
            Use <code className="bg-muted px-1 rounded">/plan</code> in Claude Code to generate plan documents.
            They are saved to <code className="bg-muted px-1 rounded">~/.claude/plans/</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r border-border flex flex-col shrink-0">
        <div className="px-4 py-2 border-b border-border bg-sidebar/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="size-3.5 text-chart-3" />
            <span className="text-xs font-medium">Plans ({plans.length})</span>
          </div>
          <button onClick={load} className="p-1 rounded hover:bg-accent/50 transition-colors">
            <RefreshCw className="size-3 text-muted-foreground" />
          </button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelected(plan)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-start gap-2 ${
                  selected?.id === plan.id
                    ? "bg-accent text-foreground"
                    : "hover:bg-accent/50 text-muted-foreground"
                }`}
              >
                <ChevronRight className="size-3 shrink-0 mt-0.5 opacity-50" />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate leading-tight">{plan.title}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5 flex items-center gap-1">
                    <Calendar className="size-2.5" />
                    {timeAgo(plan.createdAt)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Detail */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selected ? (
          <>
            <div className="px-6 py-3 border-b border-border bg-sidebar/20 shrink-0">
              <h2 className="text-sm font-semibold text-foreground">{selected.title}</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                <Calendar className="size-2.5 inline mr-1" />
                {new Date(selected.createdAt).toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric" })}
                <span className="ml-2 font-mono opacity-50">{selected.filename}</span>
              </p>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-6 max-w-3xl">
                <SimpleMarkdown content={selected.content} />
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Select a plan
          </div>
        )}
      </div>
    </div>
  );
}
