# CTE v2 Implementation Context

## What happened
A previous CC session ran /plan-w-team and generated `specs/cte-v2-overhaul.md`. Then /build was run, but instead of implementing the new features, it only recreated the existing TypeScript source files and wrote tests for existing functionality. None of the v2 features were actually implemented.

## What needs to be done NOW

You must implement ALL of these changes to the existing codebase. The source files already exist in src/. Do NOT recreate them — MODIFY them.

### 1. Schema Extension (src/types.ts)
Add these 5 optional fields to TaskSchema (backward-compatible with defaults):
- `execution_mode`: enum "autonomous" | "review_needed" | "pair", default "review_needed"
- `task_type`: enum "research" | "coding" | "writing" | "ops" | "mixed", default "mixed"
- `workdir`: string nullable, default null (project working directory for CC)
- `needs_research`: boolean, default false (whether task needs web research before execution)
- `estimated_effort`: enum "small" | "medium" | "large", default "medium"

### 2. Priority Case-Sensitivity Bug Fix (src/cli.ts)
When user passes `--priority p2` (lowercase), normalize to "P2" (uppercase) BEFORE Zod validation. Currently it passes through as-is and Zod rejects it, corrupting the store.

### 3. CLI New Flags (src/cli.ts)
Add CLI flags for the new fields: `--execution-mode`, `--task-type`, `--workdir`, `--needs-research`, `--estimated-effort`

### 4. Store Updates (src/store.ts)
Update AddTaskInput and UpdateTaskInput to include the new fields.

### 5. Server Bind (src/server.ts)
Change default BIND from "127.0.0.1" to "0.0.0.0" for Tailscale accessibility.

### 6. Kanban UI Overhaul (src/kanban.ts)
Rewrite the kanban HTML generation:
- Dark theme (dark background, light text)
- Responsive layout (CSS Grid columns on desktop, stacked on mobile)
- Task detail modal (click a card → overlay with full task info including new fields)
- Filtering by project, priority, execution_mode, task_type
- Stats bar at the top (total tasks, by status, by priority)
- Modern CSS with transitions/animations

### 7. Update Tests
Update existing tests and add new ones covering:
- New schema fields validation
- Priority normalization (p2 → P2)
- CLI new flags
- Kanban renders new fields

### 8. Build & Verify
- Run `npm run build` to compile
- Run `npm test` to verify all tests pass
- Rebuild the dist/ symlink binary

## Important
- Read the full spec at specs/cte-v2-overhaul.md for detailed requirements
- The existing tests (86) must continue passing
- All changes are backward-compatible (new fields have defaults)
- Commit with a descriptive message when done
