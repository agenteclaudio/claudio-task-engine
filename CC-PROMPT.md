# Build the Claudio Task Engine (CTE)

You are building a task management system for an AI assistant (OpenClaw). Read SPEC.md and CLAUDE.md thoroughly first.

## Phase 1: Research (brief)
Before coding, quickly understand:
1. How Claude Code's own Tasks system works: JSON files in ~/.claude/tasks/, TaskCreate/TaskUpdate with blockedBy/blocks, automatic unblocking, wave execution
2. DAG topological sorting in TypeScript — look for clean patterns

Don't spend too long on research. 5-10 minutes max. The spec already defines what to build.

## Phase 2: Project Setup
```bash
npm init -y
npm install typescript vitest zod @types/node
npx tsc --init --strict --module nodenext --moduleResolution nodenext --outDir dist --rootDir src
```
Set up package.json with:
- "type": "module"
- bin entry for "cte" pointing to dist/cli.js
- scripts: "build", "test", "dev"

## Phase 3: Implement (TDD)

Build in this order. For each module, write tests FIRST, then implement.

### 3a. Types (src/types.ts)
Define: Task, Project, TaskStore, TaskStatus, Priority, ExecutionPlan, Wave
Use zod schemas for validation.

### 3b. Store (src/store.ts)  
- loadStore(path): read JSON, validate with zod
- saveStore(path, store): write JSON atomically (write to .tmp, rename)
- addTask(store, task): add with auto-generated ID, cycle detection
- updateTask(store, id, updates): partial update
- deleteTask(store, id): remove + clean up references from other tasks' dependencies

### 3c. DAG Resolver (src/dag.ts)
- buildGraph(tasks): adjacency list from dependencies
- detectCycle(tasks): return true/false (Kahn's algorithm or DFS)
- computeStatus(tasks): for each task, determine if ready/blocked/blocked-by-failure
- computeWaves(tasks): topological sort into execution waves, respecting dependencies
- getReadyTasks(tasks): return tasks whose deps are all completed, sorted by priority

### 3d. Priority (src/priority.ts)
- sortByPriority(tasks): P1 first, then P2, P3, P4. Within same priority, FIFO by created_at
- Eisenhower classification helpers

### 3e. Executor (src/executor.ts)
- planExecution(store, maxConcurrent): compute waves, respect maxConcurrent limit per wave
- Returns ExecutionPlan: { waves: Wave[], summary: string }
- Each Wave: { tasks: Task[], blockedTasks: Task[] }
- This is a PLANNER only — it does not actually run tasks. OpenClaw handles execution.

### 3f. Kanban (src/kanban.ts)
- generateKanban(store): returns HTML string
- Columns: Backlog (P4 pending) | Ready (deps met) | In Progress | Done | Failed
- Cards show: title, priority badge (P1 red, P2 yellow, P3 blue, P4 gray), project name with color dot, tags, dependency arrows/count
- Clean, modern CSS. Dark mode. Responsive.
- Filter buttons for projects and tags at the top

### 3g. CLI (src/cli.ts)
Commands: add, list, show, update, delete, graph, run, kanban, stats
Use process.argv parsing (no heavy CLI framework — keep it simple with a switch/case or minimal arg parser).
- `cte add "title" --priority P2 --project personal --tags research --deps task-001,task-002 --description "detailed desc"`
- `cte list [--status X] [--project X] [--tag X]`
- `cte show <id>`
- `cte update <id> [--status X] [--result "text"] [--priority X]`
- `cte delete <id>`
- `cte graph` — ASCII dependency graph
- `cte run [--max-concurrent 3] [--dry-run]`
- `cte kanban [--output path]`
- `cte stats`

## Phase 4: End-to-End Test
Write a comprehensive e2e test that:
1. Creates 6+ tasks with a diamond dependency pattern (parallel + convergence)
2. Verifies cycle detection rejects circular deps
3. Computes waves and verifies correct ordering
4. Simulates execution: complete wave 1 tasks → verify wave 2 unblocks
5. Generates kanban HTML and verifies it contains expected content
6. Tests priority sorting across waves
7. Tests the CLI commands work end-to-end

## Phase 5: Build & Verify
```bash
npm run build
npm run test
```
All tests must pass. Fix any failures.

## Constraints
- Keep it simple. No over-engineering.
- No external databases. Single JSON file.
- No heavy frameworks. Vanilla TypeScript.
- The executor is a PLANNER — it outputs what to run, not how to run it.
- Make the CLI work as `node dist/cli.js` (we'll create a bin symlink later).
