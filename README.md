# agent-scope

> **Deterministic, local, passive execution observer for AI agent workflows**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![npm](https://img.shields.io/npm/v/agent-scope)](https://www.npmjs.com/package/agent-scope)

agent-scope is a lightweight, file-based execution observer for AI agent workflows. It provides real-time visibility into task progress, dependencies, and completion status without requiring databases, authentication, or cloud infrastructure.

## Features

- **Live Mode** - Zero-config observation of Claude Code's TodoWrite tasks in real-time
- **Plan Mode** - Structured task planning with markdown DSL, dependencies, and acceptance criteria
- **Kanban Dashboard** - Visual board with Pending / In Progress / Completed columns
- **Real-time Updates** - SSE-powered file watching, no manual refresh needed
- **Deterministic** - Pure function state computation from files
- **Local-first** - All data stays on your machine
- **Type-safe** - Built with TypeScript in strict mode

## How It Works

agent-scope supports two complementary modes:

| Mode | Data Source | Setup | Use Case |
|------|-----------|-------|----------|
| **Live** | `~/.claude/tasks/` (TodoWrite) | Zero config | Watch Claude Code work in real-time |
| **Plan** | `.agent-scope/queue.md` + `execution.log` | `agent-scope init` | Structured project planning with dependencies |

## Quick Start

### Live Mode (Zero Config)

Just start the dashboard — it reads Claude Code's existing task files:

```bash
npx agent-scope start
```

Opens `http://localhost:4317` with a Kanban board showing all your Claude Code sessions and their tasks in real-time.

### Plan Mode

For structured project planning with dependencies and acceptance criteria:

```bash
# 1. Initialize
npx agent-scope init

# 2. Edit .agent-scope/queue.md with your task plan

# 3. Start dashboard
npx agent-scope start
```

## Dashboard

### Live Mode
- **Session sidebar** with progress bars and active session indicators
- **Kanban board** with three columns: Pending, In Progress, Completed
- **Task detail panel** with description, dependencies (blockedBy/blocks)
- **Real-time updates** via Server-Sent Events (no polling)

### Plan Mode
- **Slice-based task tree** with collapsible groups
- **Dependency graph** navigation (click through dependencies)
- **Status overview** with summary cards, slice progress bars
- **Agent activity** tracking with execution traces
- **BLOCKED status** support (both computed from dependencies and explicit agent declarations)

## CLI

```bash
# Start dashboard (auto-detects available modes)
npx agent-scope start

# Start with custom Claude directory
npx agent-scope start --claude-dir /path/to/.claude

# Start on custom port
npx agent-scope start -p 3000

# Initialize Plan mode in current directory
npx agent-scope init
```

## Task Queue Format (Plan Mode)

### Markdown DSL

```markdown
# Slice S1

## S1-T1
Area: Backend
Depends: -
Description: Setup database schema
AC: Tables created and migrations run

## S1-T2
Area: Backend
Depends: S1-T1
Description: Implement user authentication
AC: Login and registration endpoints working
```

### Custom Templates

Configure heading patterns in `.agent-scope/config.json`:

```json
{
  "taskModel": {
    "id": "{slice}-T{n}",
    "headings": {
      "slice": "# Slice {name}",
      "task": "## {id}"
    }
  }
}
```

### Validation

- All required fields present (Area, Depends, Description, AC)
- No duplicate task IDs
- No unknown dependencies
- No circular dependencies (DFS detection)

## Execution Log Format (Plan Mode)

```json
{"task_id":"S1-T1","status":"DONE","timestamp":"2026-02-16T14:31:22Z","agent":"claude"}
{"task_id":"S1-T2","status":"FAILED","timestamp":"2026-02-16T14:33:10Z","agent":"claude","meta":{"reason":"timeout"}}
{"task_id":"S1-T3","status":"BLOCKED","reason":"API key missing","timestamp":"2026-02-16T14:35:00Z","agent":"claude"}
```

Status values: `DONE`, `FAILED`, `BLOCKED` (requires `reason` field)

## Architecture

### Status Computation (Plan Mode)

```
Priority: FAILED > BLOCKED(explicit) > DONE > BLOCKED(computed) > READY

For each task:
  if lastEvent.status === FAILED → FAILED
  else if lastEvent.status === BLOCKED → BLOCKED (with reason)
  else if lastEvent.status === DONE → DONE
  else if any dependency.status !== DONE → BLOCKED (computed)
  else → READY
```

### Tech Stack

- **Language**: TypeScript (strict mode)
- **CLI**: Commander
- **Server**: Fastify + chokidar (file watching)
- **Real-time**: Server-Sent Events (SSE)
- **UI**: Next.js + Tailwind CSS
- **Testing**: Vitest (85 tests)

## API Reference

### `GET /health`

```json
{"status": "ok", "modes": {"live": true, "plan": true}}
```

### `GET /sessions`

Lists all Claude Code sessions with their tasks.

### `GET /sessions/:id`

Get tasks for a specific session.

### `GET /events`

SSE stream for real-time file change notifications.

### `GET /snapshot`

Returns Plan mode state (queue.md + execution.log).

## Development

```bash
git clone https://github.com/yunusemrgrl/agent-scope.git
cd agent-scope
npm install
cd dashboard && npm install && cd ..

npm run build        # Build core + dashboard
npm test             # Run all tests
npm run dev          # Dev server with watch
```

### Project Structure

```
agent-scope/
├─ src/
│   ├─ core/
│   │   ├─ types.ts           # Domain model (Plan + Live types)
│   │   ├─ queueParser.ts     # Markdown parser with template support
│   │   ├─ logParser.ts       # JSONL parser with BLOCKED validation
│   │   ├─ stateEngine.ts     # Snapshot computation
│   │   └─ todoReader.ts      # Claude Code TodoWrite reader
│   ├─ server/
│   │   ├─ server.ts          # Fastify API + SSE
│   │   └─ watcher.ts         # chokidar file watching
│   └─ cli.ts                 # Commander CLI
├─ tests/core/                # Unit tests (85 tests)
├─ dashboard/                 # Next.js UI
│   └─ src/app/page.tsx       # Dual-mode dashboard (Live + Plan)
├─ dist/                      # Build output
└─ .agent-scope/              # Created by init (gitignored)
```

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure `npm test` passes
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details
