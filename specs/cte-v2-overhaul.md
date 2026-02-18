# Plan: CTE v2 — Schema, Bug Fixes, Kanban UI Overhaul & Night-Worker Integration

## Task Description
Comprehensive overhaul of the Claudio Task Engine: fix known bugs, extend the task schema with night-worker metadata fields, completely redesign the kanban UI to be beautiful and mobile-responsive, bind the server to 0.0.0.0, and document night-worker integration improvements.

## Objective
Deliver CTE v2 with:
1. Fixed priority case-sensitivity bug and improved CLI input validation
2. Five new task schema fields for night-worker integration (`execution_mode`, `task_type`, `workdir`, `needs_research`, `estimated_effort`)
3. A beautiful, responsive kanban web UI with task detail view, filtering, stats, and dark theme — accessible from Mac and iPhone via Tailscale
4. Night-worker integration documentation

## Problem Statement
CTE v1 works but has critical gaps:
- **Bug**: `--priority p2` (lowercase) passes CLI parsing but fails Zod validation, corrupting the store and breaking `cte list`
- **Missing metadata**: The night-worker has no way to know execution mode, task type, working directory, research needs, or effort estimates
- **Basic UI**: Current kanban is functional but minimal — no mobile support, no task detail view, bound to 127.0.0.1 only
- **No validation**: CLI accepts invalid inputs without proper normalization

## Solution Approach
- **Phase 1 (Schema + Bugs)**: Extend `TaskSchema` with 5 optional fields (backward-compatible defaults), fix priority normalization in CLI, add input validation
- **Phase 2 (Kanban UI)**: Complete rewrite of `kanban.ts` — modern CSS Grid/Flexbox layout, responsive breakpoints, task detail modal, filtering by all fields, stats section, CSS animations
- **Phase 3 (Server)**: Change default bind from 127.0.0.1 to 0.0.0.0
- **Phase 4 (Docs)**: Write `docs/night-worker-integration.md` analyzing how new fields integrate with the night-worker skill

## Relevant Files

### Existing Files to Modify
- `src/types.ts` — Add 5 new fields to TaskSchema (execution_mode, task_type, workdir, needs_research, estimated_effort)
- `src/store.ts` — Update AddTaskInput and UpdateTaskInput types with new fields
- `src/cli.ts` — Fix priority case bug, add new CLI flags, input validation
- `src/kanban.ts` — Complete rewrite for beautiful responsive UI
- `src/server.ts` — Change default bind to 0.0.0.0
- `src/__tests__/types.test.ts` — Tests for new schema fields
- `src/__tests__/store.test.ts` — Tests for new fields in store operations
- `src/__tests__/cli.test.ts` — Tests for priority normalization, new flags, validation
- `src/__tests__/kanban.test.ts` — Tests for new kanban features (detail view, filters, responsive)
- `src/__tests__/e2e.test.ts` — E2E tests covering new fields end-to-end

### New Files
- `docs/night-worker-integration.md` — Night-worker integration analysis and recommendations

## Implementation Phases

### Phase 1: Schema & Bug Fixes
- Add new optional fields to TaskSchema with defaults (backward-compatible)
- Fix priority normalization in CLI (uppercase `p2` → `P2`)
- Add input validation (empty titles, invalid status transitions)
- Update store operations to handle new fields

### Phase 2: Kanban UI Overhaul
- Rewrite `generateKanban()` with modern, beautiful dark-theme UI
- Responsive layout: desktop columns → mobile stacked cards
- Task detail modal (click card → full info overlay)
- Enhanced filtering: by project, tags, priority, execution_mode, task_type
- Stats/overview section at the top
- CSS animations and transitions
- Auto-refresh via meta tag or JS polling

### Phase 3: Server & Integration
- Bind to 0.0.0.0 by default (keep CTE_BIND env override)
- Ensure kanban serves correctly over Tailscale

### Phase 4: Documentation
- Write `docs/night-worker-integration.md`

## Team Orchestration
- Team lead orchestrates, NEVER codes directly
- Uses Task* tools for all coordination

### Team Members
- Builder
  - Name: builder-schema
  - Role: Schema extension, bug fixes, CLI improvements, and all related tests (TDD)
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-kanban
  - Role: Kanban UI overhaul + server bind fix + kanban tests
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-docs
  - Role: Night-worker integration documentation
  - Agent Type: builder
  - Resume: false

- Validator
  - Name: validator-final
  - Role: Run full test suite, typecheck, verify all acceptance criteria
  - Agent Type: validator
  - Resume: false

## Step by Step Tasks

### 1. Schema & Bug Fixes — Tests
- **Task ID**: schema-tests
- **Depends On**: none
- **Assigned To**: builder-schema
- **Agent Type**: builder
- **Parallel**: true (can run alongside kanban-tests)
- Write failing tests in `src/__tests__/types.test.ts`:
  - New fields (`execution_mode`, `task_type`, `workdir`, `needs_research`, `estimated_effort`) parse correctly with valid values
  - New fields have correct defaults (null/false) when omitted
  - Invalid enum values for `execution_mode`, `task_type`, `estimated_effort` are rejected
  - Existing tasks without new fields still parse (backward compatibility)
- Write failing tests in `src/__tests__/cli.test.ts`:
  - `--priority p2` (lowercase) normalizes to `P2` and succeeds
  - `--priority p1` normalizes to `P1`
  - `--execution-mode autonomous` sets the field
  - `--task-type code` sets the field
  - `--workdir /path/to/dir` sets the field
  - `--needs-research` flag sets the boolean
  - `--estimated-effort medium` sets the field
  - Empty title returns error
  - `cte show` displays new fields
  - `cte update` can set new fields
- Write failing tests in `src/__tests__/store.test.ts`:
  - `addTask` with new fields stores them correctly
  - `updateTask` can update new fields
  - Backward compatibility: loading a store without new fields works (defaults applied)
- Tests MUST be runnable (they should fail, not error)

### 2. Schema & Bug Fixes — Implementation
- **Task ID**: schema-impl
- **Depends On**: schema-tests
- **Assigned To**: builder-schema (resume)
- **Agent Type**: builder
- **Parallel**: false
- **Implementation details:**
  1. In `src/types.ts`:
     - Add `ExecutionMode = z.enum(["autonomous", "review_needed"]).nullable().default(null)`
     - Add `TaskType = z.enum(["code", "research", "design", "ops", "other"]).nullable().default(null)`
     - Add `EstimatedEffort = z.enum(["small", "medium", "large"]).nullable().default(null)`
     - Add fields to TaskSchema:
       ```
       execution_mode: ExecutionMode
       task_type: TaskType
       workdir: z.string().nullable().default(null)
       needs_research: z.boolean().default(false)
       estimated_effort: EstimatedEffort
       ```
  2. In `src/store.ts`:
     - Extend `AddTaskInput` type with optional new fields
     - Extend `UpdateTaskInput` type with optional new fields
     - Wire new fields into `addTask()` and `updateTask()`
  3. In `src/cli.ts`:
     - **Fix priority bug**: Normalize priority to uppercase before passing to store:
       ```typescript
       if (priority) input.priority = priority.toUpperCase() as AddTaskInput["priority"];
       ```
       Same in `cmdUpdate`
     - Add new CLI flags to `cmdAdd`: `--execution-mode`, `--task-type`, `--workdir`, `--needs-research`, `--estimated-effort`
     - Add new CLI flags to `cmdUpdate`: same set
     - Add new fields to `cmdShow` output
     - Add validation: reject empty titles with clear error message
  4. Run tests + typecheck after implementation: `npx vitest run && npx tsc --noEmit`

### 3. Schema & Bug Fixes — Validation
- **Task ID**: schema-validate
- **Depends On**: schema-impl
- **Assigned To**: validator-final
- **Agent Type**: validator
- **Parallel**: false
- Run `npx vitest run` — all tests must pass
- Run `npx tsc --noEmit` — no type errors
- Verify backward compatibility: load existing `data/tasks.json` (which has no new fields) and confirm it parses successfully
- Verify `cte list` works after loading the existing store
- Verify `cte add "test" --priority p2` works (lowercase normalized)

### 4. Kanban UI — Tests
- **Task ID**: kanban-tests
- **Depends On**: schema-impl (needs new fields in schema for kanban to render them)
- **Assigned To**: builder-kanban
- **Agent Type**: builder
- **Parallel**: false
- Write/update tests in `src/__tests__/kanban.test.ts`:
  - Generated HTML has responsive meta viewport tag
  - Generated HTML has CSS media queries for mobile breakpoints
  - Task detail modal markup exists (hidden by default)
  - New fields (execution_mode, task_type, estimated_effort) shown on cards when present
  - Filter buttons for execution_mode and priority exist
  - Stats section renders task counts
  - HTML escaping still works for all new fields
  - Auto-refresh mechanism present (meta tag or JS)
- Tests MUST be runnable (they should fail, not error)

### 5. Kanban UI — Implementation
- **Task ID**: kanban-impl
- **Depends On**: kanban-tests
- **Assigned To**: builder-kanban (resume)
- **Agent Type**: builder
- **Parallel**: false
- **Implementation details:**
  1. Complete rewrite of `src/kanban.ts` `generateKanban()`:
     - **Layout**: CSS Grid for columns, Flexbox for cards
     - **Responsive**:
       - Desktop: 5 columns side by side
       - Tablet (<1024px): 3 columns with horizontal scroll
       - Mobile (<640px): single column, swipeable tabs for each status
     - **Stats header**: Total tasks, per-status counts, per-priority counts, progress bar
     - **Cards**: Show priority badge, task type icon, execution_mode badge, estimated_effort chip, project dot, tags, dependency count
     - **Task detail modal**: Click any card → overlay with all task info (description, timestamps, dependencies, result, failure_reason, new fields). Close on click outside or ESC key
     - **Filters bar**: Project pills, tag pills, priority pills, execution_mode pills, task_type pills. Multiple selection, OR logic within groups, AND across groups
     - **Dark theme**: Premium dark colors — `#0f172a` base, `#1e293b` cards, accent colors for priorities, subtle gradients and shadows
     - **Animations**: Card hover lift, modal slide-in, filter pill transitions
     - **Typography**: System font stack, proper hierarchy
     - **Auto-refresh**: JS `setTimeout` polling every 30s that reloads the page (simple, no WebSockets needed)
  2. In `src/server.ts`:
     - Change default BIND from `"127.0.0.1"` to `"0.0.0.0"`
  3. Run tests after implementation: `npx vitest run`

### 6. Kanban UI — Validation
- **Task ID**: kanban-validate
- **Depends On**: kanban-impl
- **Assigned To**: validator-final
- **Agent Type**: validator
- **Parallel**: false
- Run `npx vitest run` — all tests must pass
- Run `npx tsc --noEmit` — no type errors
- Verify the generated HTML is valid (DOCTYPE, proper closing tags)
- Check responsive CSS is present (media queries for mobile)
- Check modal markup is present
- Check server.ts defaults to 0.0.0.0

### 7. Night-Worker Integration Docs
- **Task ID**: docs-nightworker
- **Depends On**: schema-validate (needs finalized schema to document)
- **Assigned To**: builder-docs
- **Agent Type**: builder
- **Parallel**: true (can run alongside kanban work)
- Create `docs/night-worker-integration.md` with:
  - **Overview**: How CTE v2 schema fields support the night-worker
  - **Field Usage Guide**:
    - `execution_mode`: "autonomous" → night-worker can complete alone; "review_needed" → prepare options, mark in_progress
    - `task_type`: Determines CC launch strategy (code → project dir, research → main session does web research first, design → may need browser, ops → infrastructure work)
    - `workdir`: Explicit working directory for CC session (replaces guessing from context)
    - `needs_research`: If true, night-worker must do web research from main session before spawning CC sub-agent
    - `estimated_effort`: Helps scheduling — "small" tasks first for quick wins, "large" tasks need more timeout
  - **Proposed Night-Worker Workflow Changes**:
    - Pre-flight: Filter by `execution_mode != "review_needed"` for fully autonomous runs
    - Use `task_type` to determine launch strategy instead of guessing
    - Use `workdir` directly instead of inferring from task content
    - If `needs_research`, do research phase first from main session, compile findings, then spawn CC
    - Use `estimated_effort` for timeout and scheduling: small=5min, medium=15min, large=30min
  - **Pre-sleep Reminder Enhancement**: Include tasks with `execution_mode: "review_needed"` in the pre-sleep scan
  - **CLI Examples**: How to add tasks with the new fields for night-worker consumption
  - **Backward Compatibility**: Tasks without new fields still work (defaults: autonomous assumed, type inferred from tags/title)

### 8. Final Validation
- **Task ID**: validate-all
- **Depends On**: schema-validate, kanban-validate, docs-nightworker
- **Assigned To**: validator-final
- **Agent Type**: validator
- **Parallel**: false
- Run full test suite: `npx vitest run`
- Run typecheck: `npx tsc --noEmit`
- Build: `npx tsc`
- Verify existing `data/tasks.json` loads correctly (backward compatibility)
- Verify `cte list` still works with real data
- Verify `cte add "Test task" --priority p2 --execution-mode autonomous --task-type code --workdir /tmp --estimated-effort small` works
- Verify `cte show` displays all new fields
- Verify kanban HTML generates correctly with real data
- Verify `docs/night-worker-integration.md` exists and is complete
- Verify server.ts default bind is 0.0.0.0
- ALL 86+ tests must pass (original 86 + new tests)
- Report pass/fail for each criterion

## Testing Strategy
- **Approach**: TDD — tests written before implementation for each feature
- **Test framework**: vitest
- **Test types**: Unit tests (types, store, priority), integration tests (CLI, kanban), E2E tests
- **Run command**: `npx vitest run`
- **Each builder task must**: write tests → implement → run tests → run `npx tsc --noEmit`

## Acceptance Criteria
1. `cte add "task" --priority p2` normalizes to P2 and does NOT corrupt the store
2. `cte list` works correctly after adding tasks with lowercase priority
3. All 5 new fields (`execution_mode`, `task_type`, `workdir`, `needs_research`, `estimated_effort`) exist in schema with correct defaults
4. Existing `data/tasks.json` (without new fields) loads without error
5. CLI supports `--execution-mode`, `--task-type`, `--workdir`, `--needs-research`, `--estimated-effort` for add and update
6. `cte show` displays all new fields
7. Kanban UI is responsive (works on mobile viewport)
8. Kanban has task detail modal (click to view full task info)
9. Kanban has filtering by project, tags, priority, execution_mode, task_type
10. Kanban has stats/overview section
11. Server binds to 0.0.0.0 by default
12. `docs/night-worker-integration.md` exists with comprehensive analysis
13. All tests pass (86 original + new tests)
14. TypeScript compiles with no errors

## Validation Commands
- `npx vitest run` — all tests pass
- `npx tsc --noEmit` — no type errors
- `npx tsc` — builds successfully
- `node dist/cli.js add "Test" --priority p2` — lowercase priority works
- `node dist/cli.js list` — lists tasks correctly

## Notes
- Backward compatibility is critical: new fields are all optional with sensible defaults
- The kanban is server-rendered HTML — no React/Vue, no build step for frontend
- The UI must look premium: "a otro level, que sea un placer verla" — put effort into the CSS
- Server accessible via Tailscale at 100.70.244.126:8099 (Mac) and iPhone
- Zod v4 is being used (not v3) — field syntax may differ slightly
- Current test suite has 86 tests across 8 files — all must continue to pass
