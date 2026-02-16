# Claudio Task Engine (CTE)

## Project
A task management system for OpenClaw AI assistant. JSON-based with dependency graphs, priority execution, and kanban view.

## Stack
- TypeScript, Node.js 22
- No framework — vanilla
- vitest for testing
- Single JSON file storage (no database)
- HTML/CSS kanban (no framework)

## Workflow
- TDD: write failing test first, then implement
- Run single tests during dev: `npx vitest run src/path/to/test.ts`
- Run full suite when done: `npx vitest run`
- TypeScript strict mode

## Code style
- ES modules (import/export)
- Prefer functional style, avoid classes where possible
- Use zod for runtime validation of task schemas
- Error handling: return Result types, don't throw

## Structure
```
src/
  types.ts          # Task, Project, TaskStore types
  store.ts          # JSON file read/write
  dag.ts            # Dependency graph resolution, cycle detection, wave computation
  executor.ts       # Wave-based task execution (dry-run capable)
  priority.ts       # Eisenhower sorting
  kanban.ts         # HTML generation
  cli.ts            # CLI entry point
  __tests__/        # All tests here
data/
  tasks.json        # Task store (created at runtime)
public/
  kanban.html       # Generated kanban view
```

## Important
- Read SPEC.md thoroughly before starting — it's the source of truth
- The executor doesn't actually run tasks itself (that's OpenClaw's job) — it determines execution order and outputs a plan
- Focus on the core engine: store, DAG resolver, priority sorting, CLI, kanban HTML
- Make it work as a standalone CLI tool that OpenClaw calls
