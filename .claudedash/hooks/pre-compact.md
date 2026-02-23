# Pre-Compact Hook

Run this before Claude Code compacts the conversation.
Add to your project's CLAUDE.md or register as a PreCompact hook.

## Purpose

Save the current plan state so it can be restored after compaction.

## Instructions for the agent

Before context compaction, run:

```bash
npx claudedash snapshot --focus "brief description of current task"
```

This saves `.claudedash/context-snapshot.json` with:
- Git branch and changed files
- Current task state (READY/DONE/BLOCKED counts)
- Last 10 execution log entries
- The task currently being worked on

If claudedash is installed locally, use `claudedash snapshot` instead.
