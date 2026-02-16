# Claudio Task Engine (CTE) — Specification

## Overview
A task management system for OpenClaw with dependency graphs, priority-based execution, parallel agent dispatch, and a kanban view. Designed to be driven by natural language during the day and executed autonomously overnight.

## Core Features

### 1. Task Storage (tasks.json)
Single JSON file at `~/.openclaw/workspace/projects/claudio-task-engine/data/tasks.json`:
```json
{
  "tasks": [
    {
      "id": "task-001",
      "title": "Research Huawei Watch export options",
      "description": "Find ways to export health data from Huawei Watch GT4...",
      "status": "pending",
      "priority": "P2",
      "dependencies": ["task-000"],
      "tags": ["research", "health"],
      "project": "personal",
      "created_at": "2026-02-16T...",
      "started_at": null,
      "completed_at": null,
      "assignee": null,
      "result": null,
      "failure_reason": null
    }
  ],
  "projects": [
    { "id": "personal", "name": "Personal", "color": "#4A90D9" },
    { "id": "negocio", "name": "Negocio IA", "color": "#D94A4A" },
    { "id": "universidad", "name": "Universidad", "color": "#4AD94A" },
    { "id": "openclaw-setup", "name": "OpenClaw Setup", "color": "#D9D94A" }
  ]
}
```

### 2. Task Properties
- **id**: unique string (auto-generated, e.g. "task-001")
- **title**: short description
- **description**: detailed instructions for the agent executing it
- **status**: pending | ready | in_progress | completed | failed | blocked
- **priority**: P1 (urgent+important), P2 (important), P3 (urgent), P4 (backlog) — Eisenhower matrix
- **dependencies**: array of task IDs that must complete before this task can start
- **tags**: array of strings for categorization (e.g. "research", "coding", "briefing", "writing")
- **project**: project ID this task belongs to (nullable)
- **created_at / started_at / completed_at**: ISO timestamps
- **assignee**: null or identifier of the subagent working on it
- **result**: summary of what was done (filled on completion)
- **failure_reason**: why it failed (filled on failure)

### 3. Projects & Tags
- Tasks can belong to a project (1:1)
- Tasks can have multiple tags
- Projects have name + color (for kanban)
- Tags are freeform strings — no predefined list
- Kanban can filter by project or tag

### 4. Dependency Graph Engine
- Build DAG from tasks.json
- Compute status:
  - "ready" = all deps completed + status is pending
  - "blocked" = at least one dep not completed
  - "blocked-by-failure" = a dep failed (requires manual intervention)
- Wave execution:
  1. Find all "ready" tasks
  2. Sort by priority (P1 first, then P2, etc.), then by created_at
  3. Execute wave in parallel (up to max_concurrent)
  4. Wait for wave to complete
  5. Recalculate, repeat until no more ready tasks
- Cycle detection on task creation

### 5. Priority System (Eisenhower)
- P1: Urgent + Important → execute first, always
- P2: Important, not urgent → bulk of work, execute in order
- P3: Urgent, not important → quick tasks, can delegate
- P4: Neither → backlog, execute only if nothing else

### 6. Execution Engine
- max_concurrent: configurable (default 3 subagents)
- For each task in wave:
  - Claim task (status → in_progress, assignee set)
  - Execute (spawn subagent with task description as prompt)
  - On success: status → completed, result filled
  - On failure: status → failed, failure_reason filled
  - Dependent tasks: recalculate on each completion
- Briefing generation at end: summary of completed/failed/remaining

### 7. Kanban HTML View
- Static HTML generated from tasks.json
- Columns: Backlog | Ready | In Progress | Done | Failed
- Cards show: title, priority badge, project color, tags, dependency count
- Filter by project, filter by tag
- Served via simple HTTP on a port accessible via Tailscale
- Auto-regenerated when tasks.json changes (via watcher or on-demand)

### 8. CLI Interface
Node.js CLI tool (`cte`):
- `cte add "title" --priority P2 --project personal --tags research,health --deps task-001`
- `cte list [--status pending] [--project X] [--tag Y]`
- `cte show task-001`
- `cte update task-001 --status completed --result "Done: found 3 export methods"`
- `cte delete task-001`
- `cte graph` — print dependency graph as ASCII
- `cte run [--max-concurrent 3] [--dry-run]` — execute ready tasks (dry-run shows what would run)
- `cte kanban` — regenerate kanban HTML
- `cte stats` — summary: X pending, Y ready, Z completed, etc.

## Technical Stack
- TypeScript / Node.js
- Single JSON file storage (no database)
- HTML/CSS kanban (no framework, vanilla)
- jq available for quick queries if needed
- Tests: vitest or node:test

## Integration Points (handled by OpenClaw, not by CTE itself)
- Natural language parsing ("add this to todo" → `cte add`)
- Cron job at 1am → `cte run`
- WhatsApp briefing after execution
- Heartbeat check for stalled tasks

## Out of Scope (v1)
- Real-time kanban (websockets)
- GitHub Issues sync
- Time estimation
- Recurring tasks
- Subtask nesting (flat dependency graph only)
