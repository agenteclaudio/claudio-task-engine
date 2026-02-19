# Plan: CTE v3 — UI Features & Board Improvements

## Task Description
Implement 6 features for CTE v3: priority sorting, dual board modes (With Pablo / Autonomous), structured tags, manual task creation from UI, chat interface, and server bind security. All changes build on top of the existing working CTE v2 codebase (118 tests passing).

## Objective
Enhance the kanban UI with new board modes, better defaults, manual task management, a chat interface, and improved server security — all while keeping backward compatibility with existing tasks and passing all existing tests.

## Problem Statement
The current kanban UI is a single-board view with no task creation capability, no chat, no priority sorting by default, and binds to 0.0.0.0 (insecure). The system needs board modes to separate collaborative vs autonomous work, structured tags for consistency, and a way to interact with the orchestrator from the UI.

## Solution Approach
Follow the spec's build order: types+store first (foundation), then server (API/chat/bind), then kanban UI (boards/sort/form/chat), then CLI updates. Use TDD throughout with 20+ new tests.

Key technical decisions:
- Add `waiting_for_input` to `TaskStatus` enum and `collaborative` to `ExecutionMode` enum
- Structured tags live as constants in types.ts, validated in store.ts
- Server gets full REST API, chat endpoints, and dual-bind architecture
- Kanban HTML generator gets board mode toggle, sort logic, create form, chat bar — all inline (no framework)
- Chat commands parsed server-side with simple string matching

## Relevant Files

### Existing Files to Modify
- `src/types.ts` — Add `waiting_for_input` status, `collaborative` execution mode, structured tag constants
- `src/store.ts` — Tag validation in addTask/updateTask, support new status
- `src/server.ts` — Full REST API, chat endpoints, dual-bind security
- `src/kanban.ts` — Board mode toggle, priority sort, create form, chat bar, structured tag pills
- `src/cli.ts` — Support new status/mode in add/update/list commands
- `src/dag.ts` — Handle `waiting_for_input` in computeStatus (treat like in_progress — don't recompute)
- `src/__tests__/types.test.ts` — New status/mode validation tests
- `src/__tests__/store.test.ts` — Tag validation tests
- `src/__tests__/kanban.test.ts` — Board mode, sort, form, chat tests
- `src/__tests__/cli.test.ts` — CLI tests for new features

### New Files
- `src/__tests__/server.test.ts` — Server API, chat command parsing, dual-bind tests
- `src/chat.ts` — Chat command parser + inbox/outbox file management

## Implementation Phases

### Phase 1: Foundation (Types + Store)
Add new status, execution mode, structured tags to type system. Update store validation.

### Phase 2: Server (API + Chat + Bind)
Full REST API for tasks, chat command parsing, dual-bind server.

### Phase 3: Kanban UI (Boards + Sort + Form + Chat)
Board mode toggle, priority sorting, task creation modal, chat interface.

### Phase 4: CLI + Integration
CLI support for new features, final integration testing.

## Team Orchestration

Team lead orchestrates, NEVER codes directly. Uses Task tools for all coordination.

### Team Members

- Builder
  - Name: builder-foundation
  - Role: Types, store, and DAG changes (Phase 1)
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-server
  - Role: Server API, chat system, dual-bind (Phase 2)
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-kanban
  - Role: Kanban UI — board modes, sort, form, chat bar (Phase 3)
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-cli
  - Role: CLI updates for new features (Phase 4)
  - Agent Type: builder
  - Resume: true

- Validator
  - Name: validator-final
  - Role: Final validation — all tests, typecheck, acceptance criteria
  - Agent Type: validator
  - Resume: false

## Step by Step Tasks

### 1. Foundation — Tests
- **Task ID**: foundation-tests
- **Depends On**: none
- **Assigned To**: builder-foundation
- **Agent Type**: builder
- **Parallel**: false
- Write failing tests for:
  - `waiting_for_input` is a valid TaskStatus
  - `collaborative` is a valid ExecutionMode
  - Structured tag constants exist with correct categories (area, type, tool)
  - Tag validation: addTask with valid structured tags succeeds
  - Tag validation: addTask with unknown tags still succeeds (backward compat — stored as-is)
  - `computeStatus` does NOT recompute `waiting_for_input` tasks (treats like in_progress)
  - updateTask can set status to `waiting_for_input`

### 2. Foundation — Implementation
- **Task ID**: foundation-impl
- **Depends On**: foundation-tests
- **Assigned To**: builder-foundation (resume)
- **Agent Type**: builder
- **Parallel**: false
- In `src/types.ts`:
  - Add `"waiting_for_input"` to TaskStatus enum
  - Add `"collaborative"` to ExecutionMode enum
  - Add `TAG_CATEGORIES` constant: `{ area: [...], type: [...], tool: [...] }` as const
  - Add `ALL_TAGS` flat set derived from TAG_CATEGORIES
  - Export a `categorizeTag(tag: string)` function that returns the category or `"other"`
- In `src/store.ts`:
  - No blocking validation on tags (backward compat) — tags remain string arrays
  - No changes to addTask/updateTask needed for tag validation (keep permissive)
- In `src/dag.ts`:
  - Add `waiting_for_input` to the "don't recompute" list in `computeStatus` (alongside completed, in_progress, failed)
- Run tests: `npx vitest run src/__tests__/types.test.ts src/__tests__/store.test.ts src/__tests__/dag.test.ts`
- Run typecheck: `npx tsc --noEmit`

### 3. Server — Tests
- **Task ID**: server-tests
- **Depends On**: foundation-impl
- **Assigned To**: builder-server
- **Agent Type**: builder
- **Parallel**: false
- Create `src/__tests__/server.test.ts` with tests for:
  - REST API: GET /api/tasks returns task list as JSON
  - REST API: POST /api/tasks creates a new task, returns it
  - REST API: PUT /api/tasks/:id updates a task
  - REST API: DELETE /api/tasks/:id deletes a task
  - GET / returns HTML (kanban)
  - Chat command parsing (extract to `src/chat.ts`):
    - `move task-001 in_progress` → returns `{type: "command", action: "move", taskId: "task-001", value: "in_progress"}`
    - `priority task-001 P1` → returns `{type: "command", action: "priority", taskId: "task-001", value: "P1"}`
    - `tag task-001 research` → returns `{type: "command", action: "tag", taskId: "task-001", value: "research"}`
    - `hello world` → returns `{type: "message", text: "hello world"}`
  - Chat API: POST /api/chat with command message executes and returns result
  - Chat API: POST /api/chat with non-command message writes to inbox file
  - Chat API: GET /api/chat returns outbox messages
  - Dual-bind: test that `parseBind` parses CTE_BIND env var correctly

### 4. Server — Implementation
- **Task ID**: server-impl
- **Depends On**: server-tests
- **Assigned To**: builder-server (resume)
- **Agent Type**: builder
- **Parallel**: false
- Create `src/chat.ts`:
  - `parseChatCommand(text: string)` — parse move/priority/tag commands
  - `readInbox(dataDir: string)` / `writeInbox(dataDir, message)` — manage chat-inbox.json
  - `readOutbox(dataDir: string)` / `writeOutbox(dataDir, message)` — manage chat-outbox.json
- Rewrite `src/server.ts`:
  - Keep existing HTML serving on GET /
  - Add JSON API routes:
    - `GET /api/tasks` — returns `{tasks, projects}` from store
    - `POST /api/tasks` — creates task via store.addTask, saves, returns new task
    - `PUT /api/tasks/:id` — updates task via store.updateTask, saves
    - `DELETE /api/tasks/:id` — deletes task via store.deleteTask, saves
    - `POST /api/chat` — receives `{message}`, parses command or writes to inbox
    - `GET /api/chat` — returns outbox messages and clears them
  - Dual-bind:
    - Parse `CTE_BIND` env var (comma-separated IPs, default `127.0.0.1,100.70.244.126`)
    - Create one HTTP server per bind address, sharing the same request handler
    - Gracefully skip Tailscale IP if bind fails (EADDRNOTAVAIL)
    - Log active interfaces on startup
- Run tests: `npx vitest run src/__tests__/server.test.ts`
- Run full suite: `npx vitest run`

### 5. Kanban UI — Tests
- **Task ID**: kanban-tests
- **Depends On**: foundation-impl
- **Assigned To**: builder-kanban
- **Agent Type**: builder
- **Parallel**: true (parallel with server-tests)
- Add tests to `src/__tests__/kanban.test.ts`:
  - Tasks are sorted by priority within columns (P1 first, P4 last)
  - Within same priority, sorted by created_at (oldest first)
  - Board mode toggle is present in HTML
  - Board mode data attributes on cards for filtering
  - `waiting_for_input` column rendered in autonomous board markup
  - Structured tags render with category-specific CSS classes
  - Task creation form/modal markup is present
  - Chat bar markup is present at bottom
  - "With Pablo" board shows 4 columns (backlog, ready, in_progress, done)
  - "Autonomous" board shows 5 columns (backlog, ready, waiting_for_input, in_progress, done)

### 6. Kanban UI — Implementation
- **Task ID**: kanban-impl
- **Depends On**: kanban-tests, server-impl
- **Assigned To**: builder-kanban (resume)
- **Agent Type**: builder
- **Parallel**: false
- In `src/kanban.ts`:
  - **Priority sort**: In `categorize()`, sort tasks in each column by priority then created_at
  - **Board modes**:
    - Add board mode toggle (tabs: "With Pablo" / "Autonomous") in header area
    - Add `data-execution-mode` already exists on cards — use it for JS filtering
    - "With Pablo": show collaborative/null/review_needed/pair tasks, hide autonomous. Columns: backlog, ready, in_progress, done
    - "Autonomous": show autonomous tasks only. Columns: backlog, ready, waiting_for_input, in_progress, done
    - `waiting_for_input` column with amber/yellow accent styling
    - Store selected board in localStorage, default "With Pablo"
    - JS: toggle board mode shows/hides columns and filters cards
  - **Structured tags**:
    - Import TAG_CATEGORIES and categorizeTag from types.ts
    - Render tag pills with category-specific colors: area=blue, type=green, tool=purple, other=gray
    - Filter panel: show tags grouped by category in expandable sections
  - **Task creation form**:
    - Add "+" floating action button (bottom-right corner)
    - Modal with form: title, description, priority dropdown, project dropdown, execution_mode toggle, tag multi-select
    - On submit: POST to /api/tasks, on success refresh the page
    - Mobile-friendly styling
  - **Chat bar**:
    - Fixed bar at bottom, collapsible/expandable
    - Input field + send button
    - Chat panel above input shows message history
    - On send: POST to /api/chat, display response
    - Poll GET /api/chat every 3s for OpenClaw responses
    - Basic markdown rendering (bold, code, lists)
  - Update stats section to reflect active board mode
- Run tests: `npx vitest run src/__tests__/kanban.test.ts`

### 7. CLI — Tests & Implementation
- **Task ID**: cli-impl
- **Depends On**: foundation-impl
- **Assigned To**: builder-cli
- **Agent Type**: builder
- **Parallel**: true (parallel with kanban-impl)
- In `src/__tests__/cli.test.ts`, add tests:
  - `cte add "task" --execution-mode collaborative` works
  - `cte update task-001 --status waiting_for_input` works
  - `cte list --status waiting_for_input` filters correctly
- In `src/cli.ts`:
  - Update usage strings to mention new statuses and execution modes
  - No structural changes needed — existing parsing already handles string values
- Run tests: `npx vitest run src/__tests__/cli.test.ts`

### 8. Final Validation
- **Task ID**: validate-all
- **Depends On**: kanban-impl, cli-impl
- **Assigned To**: validator-final
- **Agent Type**: validator
- **Parallel**: false
- Run full test suite: `npx vitest run` — all tests must pass (118 existing + 20+ new)
- Run typecheck: `npx tsc --noEmit`
- Verify acceptance criteria:
  - [ ] Tasks sorted P1→P4 by default in every column
  - [ ] Board toggle between "With Pablo" and "Autonomous" works
  - [ ] `waiting_for_input` status works end-to-end (types, store, kanban, CLI)
  - [ ] Structured tags render with category colors
  - [ ] Tag filter panel shows categories
  - [ ] Task creation form creates tasks via API
  - [ ] Chat bar sends commands and messages
  - [ ] Chat command parsing works (move, priority, tag)
  - [ ] Server binds to localhost + Tailscale (not 0.0.0.0)
  - [ ] All existing 118 tests still pass
  - [ ] 20+ new tests added
  - [ ] No backward compatibility breaks

## Testing Strategy
- **Approach**: TDD — tests written before implementation for each feature
- **Test framework**: vitest
- **Test types**: Unit tests for all modules, integration tests for server API
- **Run command**: `npx vitest run`
- **Each builder task must**: write tests → implement → run tests → run typecheck

## Acceptance Criteria
1. Tasks in every column sorted P1 → P2 → P3 → P4 by default; same priority sorted by created_at
2. Board toggle switches between "With Pablo" (4 columns) and "Autonomous" (5 columns with waiting_for_input)
3. `waiting_for_input` is a valid status throughout the system
4. Structured tags with category-specific colors; backward compatible with old free-form tags
5. "+" button opens task creation form that POSTs to /api/tasks
6. Chat bar at bottom with command parsing (move, priority, tag) and OpenClaw message forwarding
7. Server binds to 127.0.0.1 + Tailscale IP (not 0.0.0.0), with CTE_BIND override
8. All 118 existing tests pass; 20+ new tests added
9. TypeScript compiles with no errors

## Validation Commands
```bash
npx vitest run          # All tests pass
npx tsc --noEmit        # TypeScript compiles
```

## Notes
- The existing `ExecutionMode` has `"review_needed" | "pair"` — for board filtering, treat these + null as "collaborative" board (With Pablo)
- Current data has all tasks with `execution_mode: null` except one `autonomous` — the "With Pablo" board should show null/collaborative/review_needed/pair tasks
- The server is currently minimal (just serves HTML). It needs a full REST API + chat + dual-bind — this is the biggest change
- Chat inbox/outbox are simple JSON files that OpenClaw polls — no WebSocket needed
- The kanban.ts generates a single self-contained HTML file with inline CSS/JS — all UI features must be added inline
