# LinkedIn Post

---

I gave Claude Code a 3-hour task last week.

"Refactor the auth system, add tests, update the docs."

It said *"on it"* — and then the terminal just... scrolled. For 40 minutes.

Is it on step 5 of 20? Stuck in a loop? Already done and waiting for me?

**I had absolutely no idea.**

That frustration turned into a weekend project. I built **claudedash** — a real-time dashboard for Claude Code (and other AI coding agents).

One command. Zero config. No cloud.

```
npx -y claudedash@latest start
```

Open localhost:4317. You can now *see* your agent working.

---

**What it shows:**

→ Live Kanban board — every task Claude is tracking, in real time
→ Context health — color-coded token usage with warnings before the window fills
→ Token cost tracker — 5-hour rolling billing estimate per model
→ Worktrees panel — if you're running parallel agents across branches, it maps each session to its branch
→ Activity feed — every tool call, every file read, every bash command, streamed live

It reads directly from `~/.claude/` — no database, no external service, no account needed.

---

**The feature I'm most proud of: Plan Mode.**

Instead of just watching what Claude does, you can *direct* it with a structured task queue.

You write a `queue.md` with tasks, dependencies, and acceptance criteria. Claude reads it, works through each task in order, logs `DONE`/`FAILED`/`BLOCKED` after each one, and the dashboard tracks progress in real time.

It's the difference between giving an agent a vague instruction and giving it a proper project plan.

I've been using this workflow to build claudedash *with* claudedash. The dashboard monitors itself being built. There's something deeply satisfying about that.

---

**One more thing:** Claude can now query its own dashboard via MCP.

```
claude mcp add claudedash -- npx -y claudedash@latest mcp
```

Tools: `get_queue`, `get_sessions`, `get_cost`, `log_task`. The agent can ask itself: "what's left in the queue?" or "how much have I spent today?"

---

It's open-source, MIT licensed, published on npm.

If you're using Claude Code, Cursor, or any AI agent for serious development work — give it a try and let me know what you think.

🔗 github.com/yunusemrgrl/claudedash
📦 npm: claudedash

#ClaudeCode #AIEngineering #DeveloperTools #OpenSource #BuildingInPublic

---
*Word count: ~340 | Format: hook → problem → tool → features → plan mode → MCP → CTA*
