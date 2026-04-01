# CTE v3 — UI Features & Board Improvements

Read `specs/context.md` first for project state and constraints.

## Overview
Enhance the kanban UI with new board modes, better defaults, manual task management, and a chat interface for interacting with the orchestrator (OpenClaw).

## Feature 1: Sort by Priority

**Default sort order**: Tasks within each column should be sorted by priority (P1 first, P4 last). This should be the default behavior, not just a filter option.

**Acceptance criteria:**
- Tasks in every column are sorted P1 → P2 → P3 → P4 by default
- Within same priority, sort by creation date (oldest first)
- Existing priority filter still works on top of this

## Feature 2: Two Board Modes

Add a toggle at the top of the kanban to switch between two board views:

### Board 1: "With Pablo" (collaborative tasks)
Shows tasks where `execution_mode === "collaborative"` or `execution_mode` is not set (default).
Columns: `backlog` → `ready` → `in_progress` → `completed`

### Board 2: "Autonomous" (Claudio works alone)
Shows tasks where `execution_mode === "autonomous"`.
Columns: `backlog` → `ready` → `waiting_for_input` → `in_progress` → `completed`

The `waiting_for_input` status is NEW — it means Claudio has a question or needs a confirmation before proceeding. Tasks in this column should visually stand out (e.g. yellow/amber accent).

**Implementation notes:**
- Add `waiting_for_input` as a valid status in `src/types.ts` (TaskStatus enum/union)
- Update store, CLI, and all relevant code to support this new status
- The board toggle should be a prominent UI element (tabs or segmented control)
- Remember the user's last selected board (localStorage)
- Default board: "With Pablo"

## Feature 3: Structured Tags

Replace free-form tags with a curated tag system. Define tag categories:

```typescript
const TAG_CATEGORIES = {
  area: ['openclaw', 'cte', 'negocio', 'universidad', 'personal', 'infra'],
  type: ['research', 'implementation', 'fix', 'improvement', 'exploration'],
  tool: ['cc', 'browser', 'night-worker', 'mem0', 'tts'],
} as const;
```

**UI**: Show tags as colored pills grouped by category. In the filter panel, show tag categories as expandable sections.

**Migration**: Map existing free-form tags to the new categories where possible. Unknown tags go into an `other` category.

**Acceptance criteria:**
- Tags are validated against the category system on creation
- UI shows tags with category-specific colors
- Filter panel has category-based tag filtering
- Backward compatible: old tasks with free-form tags still display (as "other")

## Feature 4: Manual Task Creation from UI

Add a "+" button (floating action button or header button) that opens a modal/form for creating tasks directly from the UI.

**Form fields:**
- Title (required, text input)
- Description (optional, textarea)
- Priority (required, P1-P4 dropdown, default P3)
- Project (optional, dropdown from existing projects + "new")
- Execution mode (collaborative / autonomous, default collaborative)
- Tags (multi-select from structured tags)

**Implementation:**
- POST to `/api/tasks` (the server API already exists or needs to be created)
- After creation, the board refreshes automatically
- Form should be clean, minimal, mobile-friendly (used from iPhone too)

## Feature 5: Chat Interface

Add a chat bar at the bottom of the kanban UI (like a terminal/command bar). This allows the user to:
1. Ask questions about tasks ("what P1 tasks are stalled?")
2. Give commands ("move task-022 to in_progress", "add tag research to task-026")
3. Talk to the orchestrator (messages are sent to OpenClaw)

**Implementation:**
- Fixed bar at bottom of screen, expandable
- Input field + send button
- Messages display in a small chat panel above the input
- POST messages to `/api/chat` endpoint on the server
- Server writes the message to a file (`data/chat-inbox.json`) that OpenClaw polls
- Responses from OpenClaw are written to `data/chat-outbox.json` and displayed in the chat panel
- The chat panel polls for new responses every 3 seconds
- Support basic markdown in responses (bold, code, lists)

**Simple command parsing** (server-side, no AI needed):
- `move <task-id> <status>` → update task status
- `priority <task-id> <P1-P4>` → update priority
- `tag <task-id> <tag>` → add tag
- Everything else → goes to chat-inbox.json for OpenClaw

## Feature 6: Server Bind Security

Change the server to bind to specific interfaces instead of 0.0.0.0:
- Always bind to `127.0.0.1` (localhost)
- Also bind to Tailscale interface if available (`100.70.244.126`)
- Environment variable `CTE_BIND` to override (comma-separated IPs)

**Implementation:**
- Create two HTTP servers (one per IP) sharing the same handler
- Fallback: if Tailscale IP is not available, just bind localhost
- Log which interfaces are active on startup

## Non-Goals (explicitly out of scope)
- Authentication (Tailscale network is trusted)
- Database migration (keep JSON store)
- Real-time WebSocket updates (polling is fine for now)
- Mobile app (responsive web is enough)

## Test Requirements
- All existing 118 tests must continue passing
- New tests for: waiting_for_input status, tag validation, board filtering, chat command parsing, dual-bind server
- Minimum 20 new tests

## Build Order
1. Types + store changes (new status, structured tags)
2. Server changes (API endpoints, dual-bind, chat)
3. Kanban UI (boards, sort, form, chat bar)
4. CLI updates (new status, structured tags)
5. Tests throughout
