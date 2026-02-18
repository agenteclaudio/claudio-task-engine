# CTE v2 — Context for Claude Code

## What is CTE?
Claudio Task Engine (CTE) is a CLI task management system used by Claudio (an AI assistant running on OpenClaw) and Pablo (the human). It manages tasks with dependencies, priorities (P1-P4), and a kanban board. It's exclusively for Claudio+Pablo — NOT integrated with CC's native task system (those are separate things).

## Current Architecture
- TypeScript, ~930 lines across 8 source files
- CLI at `~/bin/cte` (symlink to dist/cli.js)
- Data: `data/tasks.json` (JSON file, Zod-validated)
- Server: `src/server.ts` — basic HTTP server serving kanban HTML (port 8099, currently binds 127.0.0.1)
- Tests: vitest, 8 test files covering all modules
- No framework — pure HTML/CSS/JS generated server-side in `kanban.ts`

## Current Task Schema
```typescript
{
  id: string,           // "task-001"
  title: string,
  description: string | null,
  status: "pending" | "ready" | "in_progress" | "completed" | "failed" | "blocked",
  priority: "P1" | "P2" | "P3" | "P4",
  dependencies: string[],
  tags: string[],
  project: string | null,
  created_at: string,
  started_at: string | null,
  completed_at: string | null,
  assignee: string | null,
  result: string | null,
  failure_reason: string | null,
}
```

## Known Issues & Gaps

### Bugs
1. **Case-sensitive priority**: `--priority p2` (lowercase) passes CLI parsing but fails Zod validation, corrupting the entire store. `cte list` stops working entirely. CLI should normalize to uppercase or Zod should be case-insensitive.
2. **No input validation on CLI**: Many edge cases not handled (empty titles, invalid status transitions, etc.)

### Missing Features for Night-Worker Integration
The night-worker (an overnight autonomous executor) reads CTE tasks and launches Claude Code sessions per task. Currently it lacks metadata to know:
- **execution_mode**: "autonomous" (Claudio can do alone) vs "review_needed" (needs Pablo's input)
- **task_type**: "code" | "research" | "design" | "ops" | "other" — determines how to execute
- **workdir**: Which project directory to work in
- **needs_research**: Whether the task needs web research before CC can work on it
- **estimated_effort**: Rough size ("small", "medium", "large") to help with scheduling

### UI Issues
- Current kanban is functional but minimal — basic dark theme, no mobile support
- Not accessible from other devices (binds to 127.0.0.1)
- No drag-and-drop, no task detail view, no inline editing
- No real-time updates
- Pablo wants it to look GREAT — "a otro level, que sea un placer verla"
- Must work well on Mac (via Tailscale at 100.70.244.126:8099) AND iPhone

### Integration with OpenClaw
CTE should integrate well with OpenClaw's:
- **Cron system**: heartbeats run checks every N hours
- **Night-worker**: autonomous task executor that runs at 1am
- **Sessions**: OpenClaw has main + isolated sessions, sub-agents
- OpenClaw docs are at `/usr/lib/node_modules/openclaw/docs/` — read the relevant ones for context on crons, heartbeats, sessions, multi-agent

## What To Do

### Phase 1: Analysis
1. Read all CTE source code thoroughly
2. Read OpenClaw docs (especially: `automation/cron-jobs.md`, `automation/cron-vs-heartbeat.md`, `concepts/sessions.md`, `concepts/multi-agent.md`, `concepts/agent-loop.md`)
3. Read the night-worker skill at `~/.openclaw/workspace/skills/night-worker/SKILL.md`
4. Read the task-engine skill at `~/.openclaw/workspace/skills/task-engine/SKILL.md`
5. Identify what works well, what's broken, what's missing

### Phase 2: Schema & CLI Improvements
1. Add new fields to TaskSchema: `execution_mode`, `task_type`, `workdir`, `needs_research`, `estimated_effort`
2. Fix priority case-sensitivity bug
3. Add proper input validation
4. Make CLI more robust (don't let bad input corrupt the store)
5. Update all tests

### Phase 3: UI Overhaul
1. Transform the kanban into a beautiful, modern web UI
2. Must be responsive — work great on desktop, tablet, AND phone
3. Dark theme, polished, animations, the works
4. Task detail view (click a card to see full info)
5. Filtering by project, tags, priority, execution_mode
6. Stats/overview section
7. Bind to 0.0.0.0 so it's accessible via Tailscale
8. Keep it server-side rendered (no React/Vue) unless there's a strong reason — we want zero build step for the frontend

### Phase 4: Night-Worker Integration Analysis
1. Document how the new fields should be used by the night-worker
2. Propose improvements to the night-worker workflow based on the new schema
3. Write this analysis to `docs/night-worker-integration.md`

## Constraints
- Keep it TypeScript, keep vitest
- No external frontend frameworks unless absolutely necessary
- All existing tests must pass after changes
- The store format change must be backward-compatible (new fields optional with defaults)
- Server must bind to 0.0.0.0 (env-configurable)
