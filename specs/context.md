# CTE v2 Context — Read This First

## Current State
CTE v2 is already built and working. The codebase has:
- TypeScript source in `src/` (types, store, cli, kanban, server, dag, executor, priority)
- Tests in `src/__tests__/` — 118 tests all passing
- Compiled output in `dist/`
- Data store at `data/tasks.json` (20+ real tasks)

## DO NOT
- Recreate or restructure existing files from scratch. Build ON TOP of what exists.
- Break backward compatibility with existing tasks in data/tasks.json
- Remove existing features — only add new ones
- Change the CLI interface in breaking ways

## Architecture
- `src/kanban.ts` generates a full HTML page (single file, no framework, inline CSS/JS)
- `src/server.ts` serves the kanban HTML + a JSON API (GET/POST/PUT/DELETE on /api/tasks)
- The server currently binds to 0.0.0.0:8099
- Tasks have: id, title, description, status, priority (P1-P4), project, tags, deps, and v2 fields (execution_mode, task_type, workdir, needs_research, estimated_effort)

## Integration
- CTE is used by OpenClaw (AI assistant) via CLI (`~/bin/cte`)
- A "night-worker" cron job picks up autonomous tasks and executes them overnight
- The kanban UI is accessed remotely via Tailscale from Mac/iPhone
- There is NO auth on the server (Tailscale network is trusted)

## Test Commands
```bash
npx vitest run          # Run all tests
npx tsc                 # Type check
node dist/server.js     # Start server (after npm run build)
```
