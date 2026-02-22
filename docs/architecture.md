# Architecture

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  Claude Code session (agent process)                                │
│                                                                     │
│  TodoWrite tool ──────────────► ~/.claude/tasks/<session-id>.json  │
│  execution.log  ──────────────► .claudedash/execution.log         │
│  queue.md       ──────────────► .claudedash/queue.md              │
└──────────────────────┬──────────────────────────────────────────────┘
                       │ filesystem changes
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│  claudedash server (Fastify)                                       │
│                                                                     │
│  watcher.ts (chokidar)                                              │
│    watches ~/.claude/ and .claudedash/                             │
│    emits WatchEvent { type: 'sessions' | 'plan' }                  │
│         │                                                           │
│         ▼                                                           │
│  routes/live.ts                    routes/plan.ts                  │
│    /health   → mode detection        /snapshot  → queue + log      │
│    /events   → SSE broadcast         /insights  → analytics        │
│    /sessions → todoReader            /quality-timeline             │
│    /sessions/:id                     /claude-insights              │
│                                                                     │
│  routes/observability.ts                                            │
│    /worktrees → git worktree detection + session mapping            │
└──────────────────────┬──────────────────────────────────────────────┘
                       │ HTTP / SSE
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Dashboard (Next.js, served as static export)                       │
│                                                                     │
│  page.tsx (layout shell, ~150 lines)                                │
│    top bar: mode toggle, search, sidebar collapse                   │
│    routes to: LiveView | PlanView | InsightsView | WorktreePanel   │
│                                                                     │
│  hooks/useSessions.ts          hooks/usePlanSnapshot.ts            │
│    EventSource('/events/')        EventSource('/events/')           │
│    on 'sessions' → fetchSessions  on 'plan' → fetchSnapshot        │
│    returns { sessions,            returns { data, refresh }        │
│              selectedSession }                                      │
│         │                                  │                        │
│         ▼                                  ▼                        │
│  views/LiveView.tsx            views/PlanView.tsx                  │
│    session sidebar                task tree sidebar                 │
│    kanban: pending/active/done    task detail + quality timeline    │
│    token usage bar                execution log + agent stats       │
│    context health widget                                            │
│                                                                     │
│  views/InsightsView.tsx                                             │
│    iframe → /claude-insights (HTML report)                          │
│    TypingPrompt if no report yet                                    │
└─────────────────────────────────────────────────────────────────────┘
```

## Module Responsibilities

### Core (`src/core/`)

| Module | Input | Output |
|--------|-------|--------|
| `todoReader.ts` | `~/.claude/` directory | `ClaudeSession[]` with tasks + token usage |
| `contextHealth.ts` | `ClaudeSession` | `ContextHealth { percentage, warningLevel }` |
| `queueParser.ts` | `queue.md` content | `{ tasks: QueueTask[], errors: string[] }` |
| `logParser.ts` | `execution.log` content | `{ events: LogEvent[], errors: string[] }` |
| `stateEngine.ts` | queue tasks + log events | `Snapshot` with computed statuses |
| `qualityTimeline.ts` | `execution.log` content | `QualityEvent[]` (quality check results) |
| `insightsEngine.ts` | sessions + snapshot | `LiveInsights` / `PlanInsights` |
| `worktreeDetector.ts` | `cwd` | `WorktreeInfo[]` from `git worktree list` |
| `worktreeMapper.ts` | sessions + worktrees | worktrees with associated session/task data |

### Server (`src/server/`)

| Module | Responsibility |
|--------|----------------|
| `server.ts` | Fastify init, CORS, plugin registration, static serving |
| `watcher.ts` | chokidar file watch → `WatchEvent` EventEmitter |
| `routes/live.ts` | Live mode HTTP routes + SSE management |
| `routes/plan.ts` | Plan mode HTTP routes (queue/log reads per request) |
| `routes/observability.ts` | Worktree detection and mapping |

## How SSE Works End-to-End

1. **File change**: Claude Code (or the agent) writes to `tasks.json`, `queue.md`, or `execution.log`.

2. **Watcher fires**: `watcher.ts` (chokidar) detects the change and emits a `WatchEvent`:
   ```ts
   { type: 'sessions' }   // for .claude/tasks/* changes
   { type: 'plan' }       // for .claudedash/* changes
   ```

3. **SSE broadcast**: `routes/live.ts` has registered a `change` listener on the emitter. When it fires, it writes the event to all open SSE connections:
   ```
   data: {"type":"sessions"}\n\n
   ```

4. **Dashboard receives**: A module-level singleton `EventSource` (managed by `useSSEEvents.ts`) holds the single `/events/` connection. All hooks subscribe via `useSSEEvents(handler)` — the handler checks the event type and triggers the appropriate fetch.

5. **UI updates**: React re-renders with fresh data — typically within ~100ms of the file change.

### One shared EventSource connection

`useSessions`, `usePlanSnapshot`, and `useNotifications` all share a single `/events/` connection via a pub/sub singleton in `useSSEEvents.ts`. Each hook subscribes a handler; the singleton dispatches incoming events to all subscribers. This eliminates redundant keep-alive traffic and reduces browser connection overhead.
