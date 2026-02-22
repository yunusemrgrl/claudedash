# Medium Article

**Title:** I Built a Real-Time Dashboard to Watch My AI Coding Agent Work — Here's How It Works

**Subtitle:** Claude Code is powerful. But it's a black box. claudedash fixes that.

**Tags:** AI, Developer Tools, Claude, Open Source, Software Engineering

---

## The Problem Nobody Talks About

AI coding agents are getting good. Really good.

Give Claude Code a complex task — "migrate this Express app to Fastify, add rate limiting, write the tests" — and it will actually do it. Not perfectly, but better than you'd expect, and faster than you'd do it manually.

But here's the thing nobody warns you about: **the experience of *watching* an AI agent work is terrible.**

You type the prompt. It says "on it." Then your terminal becomes a river of scrolling text. Tool calls. File reads. Edit confirmations. More tool calls. It goes on for 20 minutes, sometimes an hour.

Is it making progress? Is it stuck in a loop? Did it already finish and start doing something you didn't ask for?

You have no idea. You're staring at a firehose of logs with no structure, no progress indicator, no way to tell signal from noise.

**That's the observability problem with AI coding agents.** And it's the problem I set out to solve.

---

## What I Built

**claudedash** is a local, real-time dashboard for Claude Code sessions. It runs on your machine, reads Claude's output files directly, and gives you a structured visual view of everything happening.

```bash
npx -y claudedash@latest start
```

Open `localhost:4317`. That's it. No config, no account, no cloud service.

Here's what you see:

- A **live Kanban board** — every task Claude is tracking (`pending` / `in_progress` / `completed`), updated within ~100ms via Server-Sent Events
- **Context health** — a color-coded token usage bar per session. Green below 65%, yellow to 75%, red above. No more surprise context resets.
- **Token cost tracker** — real-time estimate of your 5-hour billing window per model
- **Activity feed** — every tool call streamed live: file reads, bash commands, web fetches
- **Worktrees panel** — if you're running multiple agents in parallel across git branches, it maps each session to its branch and shows dirty/ahead/behind state

---

## The Architecture: Why Zero Infrastructure?

The first design decision was the most important one: **no database, no cloud, no account**.

Claude Code already writes everything to disk. Every session is a JSONL file in `~/.claude/todos/`. Every task is a JSON file. Every tool call streams through hooks.

claudedash doesn't intercept or proxy anything — it just reads those files directly and presents them. This means:

- **Zero setup friction.** No env vars, no API keys, no docker compose.
- **Always accurate.** The source of truth is Claude's own output, not a secondary store that can drift.
- **Works offline.** Everything is local. Your data never leaves your machine.
- **Survives restarts.** Kill the dashboard, restart it — it reads the files fresh.

The server is a [Fastify](https://fastify.dev/) process that watches `~/.claude/` with [chokidar](https://github.com/paulmillr/chokidar) and broadcasts changes over SSE. The dashboard is a Next.js app that connects to that SSE stream and updates state in real time.

```
claude → writes JSONL/JSON files → chokidar detects change
  → Fastify broadcasts via SSE → Next.js dashboard updates → you see it
```

The entire pipeline from Claude writing a file to you seeing it in the browser takes about 100ms.

---

## Plan Mode: Turning an Agent Into a Project Manager

Live mode is useful for visibility. But once I had that, I wanted something more: **control**.

The problem with AI agents isn't just that you can't see them — it's that their default execution model is too loose. "Refactor the auth system" is a valid prompt, but it doesn't give the agent structure. It doesn't tell it what order to do things, what "done" looks like for each piece, or what to do when it gets blocked.

**Plan Mode** is my answer to this.

You create a `queue.md` file with a structured task list:

```markdown
# Slice S1 — Auth System

## S1-T1
Area: Backend
Priority: critical
Depends: -
Description: Extract auth middleware into separate module
AC: auth.middleware.ts exists, all tests pass

## S1-T2
Area: Backend
Priority: high
Depends: S1-T1
Description: Add JWT refresh token support
AC: /auth/refresh endpoint works, refresh token stored in httpOnly cookie

## S1-T3
Area: Tests
Priority: medium
Depends: S1-T2
Description: Write integration tests for new auth flow
AC: 100% coverage on auth routes, CI passes
```

Each task has a description, acceptance criteria, and optional dependencies. The dashboard computes which tasks are `READY` (all dependencies done), `BLOCKED` (waiting on another task), `DONE`, or `FAILED`.

You tell your agent:

```
Read .claudedash/workflow.md. Work through the queue starting with READY tasks.
After each task, log the result to .claudedash/execution.log.
```

The agent reads the queue, picks a READY task, works on it, logs the result, and moves on. The dashboard tracks every step. You can see exactly which task it's on, whether it passed or failed, and what's next.

I've been using this workflow to build claudedash *with* claudedash. Every feature in this article was planned as a queue task, executed by Claude, and tracked on the dashboard. There's something recursive and deeply satisfying about that.

---

## The MCP Integration: Claude Queries Its Own Dashboard

The most interesting feature I built recently: **Claude can now query its own dashboard** via the Model Context Protocol.

```bash
claude mcp add claudedash -- npx -y claudedash@latest mcp
```

This registers claudedash as an MCP server. Claude gets access to tools:

| Tool | What it does |
|---|---|
| `get_queue` | Returns all tasks with computed READY/BLOCKED/DONE status |
| `get_sessions` | Lists active Claude sessions with context health |
| `get_cost` | Returns today's estimated spend by model |
| `get_history` | Last N prompts from your session history |
| `log_task` | Logs a task result to execution.log |
| `create_task` | Adds a new task to queue.md |
| `register_agent` | Registers the agent on the dashboard |
| `send_heartbeat` | Updates agent status |

Now Claude can ask itself: "What tasks are left in the queue?" or "How much context do I have remaining?" or "What did I do in my last session?"

This closes a loop that felt missing: the agent can be aware of its own progress and state, not just the code it's working on.

---

## The Hook System

One of the underrated features of Claude Code is hooks — shell commands that run before/after certain events. claudedash installs four of them:

```bash
claudedash hooks install
```

- **PostToolUse**: Streams every tool call (file read, bash, edit) to the dashboard in real time
- **Stop**: Notifies the dashboard when Claude finishes a session
- **PreCompact**: Saves current task state before context compression
- **PostCompact**: Restores state awareness after context reset

The PostToolUse hook is what makes the activity feed work. Every time Claude reads a file, runs a command, or edits code, the hook fires and the dashboard gets a new event within milliseconds.

---

## Context Health: A Subtle but Important Feature

Here's something that bit me more than once: Claude's context window fills up silently.

You're 90 minutes into a complex refactor. Claude is making great progress. Then suddenly its answers get shorter, it starts forgetting things it said 20 minutes ago, or it hallucinates code that doesn't match the rest of the file.

What happened? The context window is full (or nearly full), and the model's behavior degrades before it throws an error.

claudedash shows a per-session token usage bar. Green → yellow → red. The bar updates with every tool call. When you hit 65%, you get a warning. At 75%, it's critical.

The calculation is subtle: it uses the most recent API call's `input_tokens + cache_read_input_tokens` against the model's context window size. That gives you the current window occupancy — not a cumulative lifetime total, which would be meaningless.

(I actually shipped this calculation wrong the first time — I was summing all cache reads across the entire session lifetime, which made every long session show 100%. Fixed in v1.1.19.)

---

## What's Next

A few things I want to build:

- **`claudedash status`** in your shell prompt — a single-line summary for your terminal prompt or status bar
- **Quality gates** — lint/typecheck/test results tracked per task, with pass/fail history
- **Team view** — if multiple engineers are running agents, a shared dashboard showing everyone's sessions (with token-based auth and ngrok for tunneling)
- **Context Health recovery** — automatic `/compact` suggestion when approaching the warning threshold

---

## Try It

```bash
npx -y claudedash@latest start
```

It takes about 3 seconds to start and requires zero configuration. If you're running Claude Code, it will auto-detect your active sessions.

The full source is on GitHub (MIT):
👉 [github.com/yunusemrgrl/claudedash](https://github.com/yunusemrgrl/claudedash)

I'd love feedback — especially from people running Claude Code in production or using multi-agent workflows. What's missing? What's confusing? What would make this actually useful in your workflow?

---

*claudedash is an independent open-source project and is not affiliated with Anthropic.*

---
*~1,400 words | Reading time: ~6 min*
*Sections: Problem → What I Built → Architecture → Plan Mode → MCP → Hooks → Context Health → Roadmap → CTA*
