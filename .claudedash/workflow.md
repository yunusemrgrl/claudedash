# Agent Workflow

Autonomous execution protocol for claudedash Plan mode.
Each task from `queue.md` is processed through these phases.

---

## Phase 1 — INTAKE

Read the next READY task from `.claudedash/queue.md`.

1. Parse the task: ID, Area, Description, AC, Dependencies.
2. Verify all dependencies have status DONE in `execution.log`.
3. If dependencies are not met, log BLOCKED and move to next task.

---

## Phase 2 — EXECUTE

Implement the task.

1. Read the task description and acceptance criteria.
2. Identify affected files using the codebase.
3. Implement the change. Follow existing conventions.
4. Run relevant tests/linters to verify.

---

## Phase 3 — LOG

Append result to `.claudedash/execution.log` (one JSON line):

Success:
```json
{"task_id":"S1-T1","status":"DONE","timestamp":"2026-01-15T10:30:00Z","agent":"claude"}
```

Failure:
```json
{"task_id":"S1-T1","status":"FAILED","timestamp":"2026-01-15T10:30:00Z","agent":"claude","meta":{"reason":"tests failing"}}
```

Blocked:
```json
{"task_id":"S1-T1","status":"BLOCKED","reason":"missing API key","timestamp":"2026-01-15T10:30:00Z","agent":"claude"}
```

---

## Phase 4 — NEXT

Pick the next READY task and return to Phase 1.
If no READY tasks remain, stop and report summary.

---

## Rules

1. One task at a time. Finish before starting next.
2. Always log to execution.log — never skip Phase 3.
3. If stuck after 2 attempts, log FAILED and move on.
4. Do not modify queue.md — it is read-only for the agent.
5. Use `new Date().toISOString()` for timestamps.
