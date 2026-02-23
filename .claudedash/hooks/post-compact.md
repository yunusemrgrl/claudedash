# Post-Compact Hook

Run this after Claude Code compacts the conversation.
Add to your project's CLAUDE.md or register as a PostCompact hook.

## Purpose

Re-inject plan context after compaction so the agent resumes correctly.

## Instructions for the agent

After context compaction, immediately run:

```bash
npx claudedash recover
```

This reads `.claudedash/context-snapshot.json` (if saved before compaction) and shows:
- Git state (branch, dirty files, recent commits)
- Next task to work on (first READY task)
- Task progress summary (done/ready/blocked/failed)
- Recent execution log entries
- Last Claude session summary

Then continue from where the snapshot indicates.
