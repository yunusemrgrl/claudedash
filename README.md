# agent-scope

> **Deterministic, local, passive execution observer for AI agent workflows**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Test Coverage](https://img.shields.io/badge/coverage-98.33%25-brightgreen)](https://vitest.dev/)

agent-scope is a lightweight, file-based execution observer for AI agent workflows. It provides real-time visibility into task progress, dependencies, and completion status without requiring databases, authentication, or cloud infrastructure.

## Features

- 🎯 **Deterministic** - Pure function state computation from files
- 📁 **File-based** - No database, just markdown + JSONL
- 👀 **Observer-only** - Passive monitoring, not an agent wrapper
- 🤖 **Model-agnostic** - Works with any AI agent or framework
- 📊 **Real-time dashboard** - Track progress, blockers, and failures
- 🔒 **Local-first** - All data stays on your machine
- ✅ **Type-safe** - Built with TypeScript in strict mode

## Installation

```bash
npm install -g agent-scope
```

Or use directly with npx:

```bash
npx agent-scope init
```

## Quick Start

### 1. Initialize in your project

```bash
npx agent-scope init
```

This creates a `.agent-scope/` directory with:
- `queue.md` - Task definitions in markdown
- `execution.log` - JSONL event log
- `config.json` - Configuration

### 2. Define your task queue

Edit `.agent-scope/queue.md`:

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

### 3. Log task completion

Your agent writes to `.agent-scope/execution.log`:

```json
{"task_id":"S1-T1","status":"DONE","timestamp":"2026-02-16T14:31:22Z","agent":"claude"}
{"task_id":"S1-T2","status":"FAILED","timestamp":"2026-02-16T14:33:10Z","agent":"claude","meta":{"reason":"timeout"}}
```

### 4. Start the dashboard

```bash
npx agent-scope start
```

Opens `http://localhost:4317` with live progress visualization.

## Dashboard Features

### Executive Summary
- Total tasks, done, failed, blocked, ready counts
- Overall success rate calculation
- Last updated timestamp

### Slice Progress
- Visual progress bars per slice
- Percentage completion tracking
- Task distribution breakdown

### Task Table
- Filter by status (READY, BLOCKED, DONE, FAILED)
- View dependencies and blockers
- Click any task for full details

### Task Details
- Acceptance criteria
- Dependency graph
- Reverse dependencies (who depends on this)
- Last event information

## Task Queue Format

### Markdown DSL

```markdown
# Slice S1

## S1-T1
Area: <category>
Depends: -                    # No dependencies, or comma-separated IDs
Description: <what to do>
AC: <acceptance criteria>
```

### Validation

agent-scope validates:
- ✅ All required fields present
- ✅ No duplicate task IDs
- ✅ No unknown dependencies
- ✅ No circular dependencies (DFS detection)

## Execution Log Format

### JSONL Schema

```typescript
{
  "task_id": "S1-T1",           // Required: matches task in queue
  "status": "DONE" | "FAILED",  // Required: outcome
  "timestamp": "ISO-8601",      // Required: when it happened
  "agent": "string",            // Required: agent name
  "meta": {...}                 // Optional: additional context
}
```

### Behavior

- Latest event per task wins (by timestamp)
- Invalid lines collected as warnings
- Malformed JSON doesn't crash the system

## Architecture

### Core Principles

1. **Deterministic** - Same inputs always produce same output
2. **Stateless** - Server recomputes on every request (no cache in v0.1)
3. **Error-tolerant** - Collects errors instead of crashing
4. **Type-safe** - Strict TypeScript throughout

### Status Computation

```
For each task:
  if lastEvent.status === FAILED → FAILED
  else if lastEvent.status === DONE → DONE
  else if any dependency.status !== DONE → BLOCKED
  else → READY
```

Priority: `FAILED > DONE > BLOCKED > READY`

### Tech Stack

- **Language**: TypeScript (strict mode)
- **CLI**: Commander
- **Server**: Fastify
- **UI**: Next.js App Router + Tailwind CSS
- **Testing**: Vitest (98.33% coverage)

## Development

### Setup

```bash
git clone https://github.com/yourusername/agent-scope.git
cd agent-scope
npm install
cd dashboard && npm install && cd ..
```

### Build

```bash
npm run build        # Builds core + dashboard
npm run build:core   # Only TypeScript
npm run build:dashboard  # Only Next.js UI
```

### Test

```bash
npm test                 # Run tests in watch mode
npm run test:coverage    # Generate coverage report
```

### Project Structure

```
agent-scope/
├─ src/
│   ├─ core/
│   │   ├─ types.ts           # Domain model
│   │   ├─ queueParser.ts     # Markdown parser
│   │   ├─ logParser.ts       # JSONL parser
│   │   └─ stateEngine.ts     # Snapshot computation
│   ├─ server/
│   │   └─ server.ts          # Fastify API
│   └─ cli.ts                 # Commander CLI
├─ tests/core/                # Unit tests (62 tests)
├─ dashboard/                 # Next.js UI
│   └─ src/
│       ├─ app/               # App Router pages
│       └─ components/        # React components
├─ dist/                      # Build output
└─ .agent-scope/              # Created by init (gitignored)
```

## API Reference

### `GET /snapshot`

Returns current system state:

```typescript
{
  snapshot: Snapshot | null,
  queueErrors: string[],      // Fatal queue parse errors
  logErrors: string[],        // Non-fatal log warnings
  meta: {
    generatedAt: string,      // ISO-8601
    totalTasks: number
  }
}
```

### `GET /health`

Health check endpoint:

```json
{"status": "ok"}
```

## Use Cases

- **AI Agent Development** - Monitor multi-step agent workflows
- **Task Automation** - Track long-running automation pipelines
- **Project Management** - Visualize task dependencies and progress
- **Testing** - Observe test execution flows
- **CI/CD Monitoring** - Track deployment task completion

## Non-Goals (v0.1)

- ❌ Real-time streaming (manual refresh only)
- ❌ Agent execution wrapper
- ❌ Git integration
- ❌ SaaS/cloud mode
- ❌ Authentication
- ❌ Task editing UI
- ❌ WebSocket updates

agent-scope is an **observer**, not an orchestrator. It watches your workflow, it doesn't run it.

## Roadmap

### v0.2 (Planned)
- Incremental state updates
- File watching for auto-refresh
- Export reports (JSON, CSV)
- Performance optimizations

### v0.3 (Planned)
- Historical snapshots
- Time-series progress tracking
- Multiple project support
- Search and filters

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Write tests for new functionality
4. Ensure `npm test` passes with 95%+ coverage
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details

## Credits

Built with ❤️ by the agent-scope team

Powered by:
- [TypeScript](https://www.typescriptlang.org/)
- [Fastify](https://www.fastify.io/)
- [Next.js](https://nextjs.org/)
- [Commander](https://github.com/tj/commander.js)
- [Vitest](https://vitest.dev/)

---

**Note**: This is v0.1 - a minimal viable product focused on core functionality. Features are intentionally limited to ensure stability and simplicity.
