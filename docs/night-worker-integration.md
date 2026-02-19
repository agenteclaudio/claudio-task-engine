# Night-Worker Integration with CTE v2

## Overview

CTE v2 introduces five new task fields specifically designed to support the night-worker skill. These fields give the night-worker explicit metadata about how to handle each task, replacing the need to infer behavior from task titles and tags.

## New Fields

### `execution_mode`
**Values:** `"autonomous"` | `"review_needed"` | `"pair"` | `null`

- **autonomous** - Night-worker can complete the task end-to-end without human review. Ideal for routine coding, ops tasks, and well-defined work.
- **review_needed** - Night-worker should prepare options or a draft, mark the task `in_progress`, and leave results for morning review. Use for decisions that require human judgment.
- **pair** - Task requires real-time collaboration. Night-worker should skip these and flag them for the next interactive session.
- **null** (default) - Night-worker uses its own judgment (legacy behavior).

### `task_type`
**Values:** `"research"` | `"coding"` | `"writing"` | `"ops"` | `"mixed"` | `null`

Determines the CC launch strategy:
- **coding** - Launch CC in the project directory with full code context
- **research** - Main session does web research first, compiles findings, then spawns CC
- **writing** - Content creation tasks (docs, blog posts, emails)
- **ops** - Infrastructure/DevOps work (server setup, deployments, config)
- **mixed** - Multiple types combined; night-worker determines approach per subtask

### `workdir`
**Type:** `string | null`

Explicit working directory for the CC session. Replaces guessing from task context. When set, the night-worker launches CC directly in this directory.

### `needs_research`
**Type:** `boolean` (default: `false`)

When `true`, the night-worker must perform web research from the main session before spawning a CC sub-agent. The research results are compiled and passed as context to the CC session.

### `estimated_effort`
**Values:** `"small"` | `"medium"` | `"large"` | `null`

Helps with scheduling and timeout configuration:
- **small** - ~5 min timeout, prioritize for quick wins
- **medium** - ~15 min timeout, standard work
- **large** - ~30 min timeout, complex tasks that need more time

## Proposed Night-Worker Workflow

### Pre-flight Filtering
```
1. Load tasks with status "ready" or "pending" (with met dependencies)
2. Filter by execution_mode:
   - Include: "autonomous", null (infer as autonomous for backward compat)
   - Skip: "pair" (needs real-time collaboration)
   - Include with caution: "review_needed" (prepare, don't finalize)
3. Sort by: estimated_effort ASC (small first for quick wins), then priority
```

### Task Execution Strategy
```
For each task:
  1. If needs_research: run web research phase first, compile findings
  2. Determine launch dir: use workdir if set, else infer from project/tags
  3. Set timeout based on estimated_effort (small=5m, medium=15m, large=30m)
  4. Launch CC sub-agent with appropriate context
  5. If execution_mode == "review_needed":
     - Mark task in_progress (not completed)
     - Store CC output in task.result for morning review
  6. If execution_mode == "autonomous":
     - Mark task completed on success, failed on error
```

### Pre-sleep Reminder Enhancement
Include tasks with `execution_mode: "review_needed"` in the pre-sleep scan prompt:
> "These tasks need your review before the night-worker runs. Want to change any to 'autonomous'?"

## CLI Examples

```bash
# Add a fully autonomous coding task
cte add "Refactor auth module" \
  --priority P2 \
  --execution-mode autonomous \
  --task-type coding \
  --workdir /home/blito/projects/my-app \
  --estimated-effort medium

# Add a research task that needs web research first
cte add "Compare hosting providers for API" \
  --priority P1 \
  --execution-mode review_needed \
  --task-type research \
  --needs-research \
  --estimated-effort small

# Add an ops task
cte add "Set up monitoring alerts" \
  --execution-mode autonomous \
  --task-type ops \
  --workdir /home/blito/infra \
  --estimated-effort large
```

## Backward Compatibility

Tasks created before v2 (without the new fields) continue to work:
- `execution_mode: null` - Night-worker uses legacy inference
- `task_type: null` - Night-worker infers from tags/title
- `workdir: null` - Night-worker infers from project context
- `needs_research: false` - No research phase
- `estimated_effort: null` - Night-worker uses default timeout (15 min)

No migration needed. Old tasks gain defaults automatically when loaded.
