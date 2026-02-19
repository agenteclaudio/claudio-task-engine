import type { Task, TaskStore } from "./types.js";
import { TAG_CATEGORIES, categorizeTag } from "./types.js";
import { computeStatus } from "./dag.js";
import { sortByPriority } from "./priority.js";

const PRIORITY_COLORS: Record<string, string> = {
  P1: "#ef4444",
  P2: "#f59e0b",
  P3: "#3b82f6",
  P4: "#64748b",
};

const STATUS_COLORS: Record<string, string> = {
  backlog: "#64748b",
  ready: "#22d3ee",
  in_progress: "#f59e0b",
  in_review: "#a855f7",
  waiting_for_input: "#eab308",
  done: "#22c55e",
  failed: "#ef4444",
};

const TAG_CATEGORY_COLORS: Record<string, string> = {
  area: "#3b82f6",
  type: "#22c55e",
  tool: "#a855f7",
  other: "#64748b",
};

const TASK_TYPE_ICONS: Record<string, string> = {
  research: "\u{1F50D}",
  coding: "\u{1F4BB}",
  writing: "\u{270F}\uFE0F",
  ops: "\u2699\uFE0F",
  mixed: "\u{1F504}",
};

const EFFORT_LABELS: Record<string, string> = {
  small: "S",
  medium: "M",
  large: "L",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderTaskJson(task: Task): string {
  return escapeHtml(JSON.stringify({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    project: task.project,
    tags: task.tags,
    dependencies: task.dependencies,
    execution_mode: task.execution_mode,
    task_type: task.task_type,
    workdir: task.workdir,
    needs_research: task.needs_research,
    estimated_effort: task.estimated_effort,
    created_at: task.created_at,
    started_at: task.started_at,
    completed_at: task.completed_at,
    assignee: task.assignee,
    result: task.result,
    failure_reason: task.failure_reason,
  }));
}

function renderTagPill(tag: string): string {
  const category = categorizeTag(tag);
  const color = TAG_CATEGORY_COLORS[category] ?? TAG_CATEGORY_COLORS.other;
  return `<span class="tag tag-${escapeHtml(category)}" style="background: ${color}22; color: ${color}; border: 1px solid ${color}44">${escapeHtml(tag)}</span>`;
}

function renderCard(task: Task, store: TaskStore): string {
  const project = task.project
    ? store.projects.find((p) => p.id === task.project)
    : null;
  const depCount = task.dependencies.length;
  const typeIcon = task.task_type ? TASK_TYPE_ICONS[task.task_type] ?? "" : "";
  const effortLabel = task.estimated_effort ? EFFORT_LABELS[task.estimated_effort] ?? "" : "";

  return `
    <div class="card" data-project="${escapeHtml(task.project ?? "")}" data-tags="${escapeHtml(task.tags.join(","))}" data-priority="${escapeHtml(task.priority)}" data-execution-mode="${escapeHtml(task.execution_mode ?? "")}" data-task-type="${escapeHtml(task.task_type ?? "")}" data-task='${renderTaskJson(task)}' onclick="showModal(this)">
      <div class="card-header">
        <span class="priority-badge" style="background: ${PRIORITY_COLORS[task.priority] ?? "#64748b"}">${escapeHtml(task.priority)}</span>
        ${task.execution_mode ? `<span class="mode-badge mode-${escapeHtml(task.execution_mode)}">${escapeHtml(task.execution_mode)}</span>` : ""}
        <span class="task-id">${escapeHtml(task.id)}</span>
      </div>
      <div class="card-title">${escapeHtml(task.title)}</div>
      <div class="card-meta">
        ${typeIcon ? `<span class="type-icon" title="${escapeHtml(task.task_type ?? "")}">${typeIcon}</span>` : ""}
        ${effortLabel ? `<span class="effort-chip effort-${escapeHtml(task.estimated_effort ?? "")}">${effortLabel}</span>` : ""}
        ${task.needs_research ? `<span class="research-badge" title="Needs research">\u{1F50D}</span>` : ""}
      </div>
      ${project ? `<div class="card-project"><span class="project-dot" style="background: ${escapeHtml(project.color)}"></span>${escapeHtml(project.name)}</div>` : ""}
      ${task.tags.length > 0 ? `<div class="card-tags">${task.tags.map((t) => renderTagPill(t)).join("")}</div>` : ""}
      ${depCount > 0 ? `<div class="card-deps">\u{1F517} ${depCount} dep${depCount > 1 ? "s" : ""}</div>` : ""}
    </div>`;
}

function categorize(tasks: Task[], _store: TaskStore): Map<string, { label: string; tasks: Task[] }> {
  const updated = computeStatus(tasks);
  const columns = new Map<string, { label: string; tasks: Task[] }>([
    ["backlog", { label: "Backlog", tasks: [] }],
    ["waiting_for_input", { label: "Waiting for Input", tasks: [] }],
    ["ready", { label: "Ready", tasks: [] }],
    ["in_progress", { label: "In Progress", tasks: [] }],
    ["in_review", { label: "In Review", tasks: [] }],
    ["done", { label: "Done", tasks: [] }],
    ["failed", { label: "Failed", tasks: [] }],
  ]);

  for (const t of updated) {
    switch (t.status) {
      case "pending":
      case "blocked":
        columns.get("backlog")!.tasks.push(t);
        break;
      case "ready":
        columns.get("ready")!.tasks.push(t);
        break;
      case "waiting_for_input":
        columns.get("waiting_for_input")!.tasks.push(t);
        break;
      case "in_progress":
        columns.get("in_progress")!.tasks.push(t);
        break;
      case "in_review":
        columns.get("in_review")!.tasks.push(t);
        break;
      case "completed":
        columns.get("done")!.tasks.push(t);
        break;
      case "failed":
        columns.get("failed")!.tasks.push(t);
        break;
    }
  }

  // Sort tasks within each column by priority then created_at
  for (const col of columns.values()) {
    col.tasks = sortByPriority(col.tasks);
  }

  return columns;
}

function renderStats(store: TaskStore, columns: Map<string, { label: string; tasks: Task[] }>): string {
  const total = store.tasks.length;
  const byPriority: Record<string, number> = { P1: 0, P2: 0, P3: 0, P4: 0 };
  for (const t of store.tasks) {
    byPriority[t.priority] = (byPriority[t.priority] ?? 0) + 1;
  }
  const completed = columns.get("done")!.tasks.length;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const statKeys = ["backlog", "waiting_for_input", "ready", "in_progress", "in_review", "done", "failed"];

  return `
  <div class="stats">
    <div class="stats-row">
      <div class="stat-item">
        <span class="stat-value">${total}</span>
        <span class="stat-label">Total</span>
      </div>
      ${statKeys.map((key) => {
        const col = columns.get(key)!;
        return `<div class="stat-item">
          <span class="stat-value" style="color:${STATUS_COLORS[key]}">${col.tasks.length}</span>
          <span class="stat-label">${escapeHtml(col.label)}</span>
        </div>`;
      }).join("")}
    </div>
    <div class="progress-bar-container">
      <div class="progress-bar" style="width:${progressPct}%"></div>
      <span class="progress-label">${progressPct}% complete</span>
    </div>
    <div class="stats-row priority-stats">
      ${["P1", "P2", "P3", "P4"].map((p) => `<span class="priority-stat"><span class="priority-dot" style="background:${PRIORITY_COLORS[p]}"></span>${p}: ${byPriority[p]}</span>`).join("")}
    </div>
  </div>`;
}

function renderTagFilterPanel(): string {
  const categories = Object.entries(TAG_CATEGORIES);
  return categories.map(([category, tags]) => {
    const color = TAG_CATEGORY_COLORS[category] ?? TAG_CATEGORY_COLORS.other;
    return `<div class="filter-group filter-group-tags" data-tag-category="${escapeHtml(category)}">
      <span class="filter-label" style="color:${color}">${escapeHtml(category)}</span>
      ${(tags as readonly string[]).map((t) => `<button class="filter-btn" data-filter-tag="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join("\n      ")}
    </div>`;
  }).join("\n  ");
}

export function generateKanban(store: TaskStore): string {
  const columns = categorize(store.tasks, store);
  const allExecModes = [...new Set(store.tasks.map((t) => t.execution_mode).filter(Boolean))].sort() as string[];
  const allTaskTypes = [...new Set(store.tasks.map((t) => t.task_type).filter(Boolean))].sort() as string[];

  // All column keys including waiting_for_input
  const allColumnKeys = ["backlog", "waiting_for_input", "ready", "in_progress", "in_review", "done", "failed"];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CTE Kanban</title>
<style>
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  :root {
    --bg-base: #0f172a;
    --bg-surface: #1e293b;
    --bg-elevated: #334155;
    --border: #334155;
    --border-subtle: #1e293b;
    --text-primary: #f1f5f9;
    --text-secondary: #94a3b8;
    --text-muted: #64748b;
    --accent: #6366f1;
    --accent-glow: rgba(99, 102, 241, 0.15);
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif;
    background: var(--bg-base);
    color: var(--text-primary);
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
    padding-bottom: 60px;
  }

  /* Header */
  .header {
    padding: 20px 24px;
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .header-left { display: flex; align-items: center; gap: 24px; }
  .header h1 {
    font-size: 22px;
    font-weight: 700;
    background: linear-gradient(135deg, #818cf8, #6366f1);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    letter-spacing: -0.5px;
  }
  .header-time { font-size: 12px; color: var(--text-muted); }

  /* Board Mode Toggle */
  .board-toggle {
    display: flex;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid var(--border);
  }
  .board-toggle-btn {
    padding: 6px 16px;
    font-size: 12px;
    font-weight: 600;
    border: none;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }
  .board-toggle-btn.active {
    background: var(--accent);
    color: #fff;
  }
  .board-toggle-btn:hover:not(.active) {
    background: var(--bg-elevated);
    color: var(--text-primary);
  }

  /* Stats */
  .stats {
    padding: 16px 24px;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border);
  }
  .stats-row {
    display: flex;
    gap: 24px;
    flex-wrap: wrap;
    align-items: center;
    margin-bottom: 12px;
  }
  .stat-item { text-align: center; }
  .stat-value { font-size: 20px; font-weight: 700; display: block; }
  .stat-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
  .progress-bar-container {
    height: 6px;
    background: var(--bg-base);
    border-radius: 3px;
    overflow: hidden;
    position: relative;
    margin-bottom: 10px;
  }
  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #22c55e, #4ade80);
    border-radius: 3px;
    transition: width 0.6s ease;
  }
  .progress-label {
    font-size: 11px;
    color: var(--text-muted);
    position: absolute;
    right: 0;
    top: 10px;
  }
  .priority-stats { margin-top: 8px; margin-bottom: 0; gap: 16px; }
  .priority-stat { font-size: 12px; color: var(--text-secondary); display: flex; align-items: center; gap: 4px; }
  .priority-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }

  /* Filters */
  .filters {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    padding: 12px 24px;
    background: var(--bg-base);
    border-bottom: 1px solid var(--border);
    align-items: center;
  }
  .filter-group { display: flex; gap: 6px; align-items: center; margin-right: 8px; }
  .filter-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-right: 2px; white-space: nowrap; }
  .filter-btn {
    padding: 4px 12px;
    border-radius: 14px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s ease;
    white-space: nowrap;
  }
  .filter-btn:hover { background: var(--bg-elevated); color: var(--text-primary); border-color: var(--accent); }
  .filter-btn.active { background: var(--accent-glow); color: #818cf8; border-color: var(--accent); }
  .filter-btn .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; vertical-align: middle; }

  /* Board */
  .board {
    display: grid;
    gap: 12px;
    padding: 16px 24px;
    min-height: calc(100vh - 240px);
  }
  .board.cols-4 { grid-template-columns: repeat(4, 1fr); }
  .board.cols-5 { grid-template-columns: repeat(5, 1fr); }
  .board.cols-6 { grid-template-columns: repeat(6, 1fr); }

  /* Column */
  .column {
    background: var(--bg-surface);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--border);
    min-width: 0;
  }
  .column.column-waiting_for_input { border-color: #eab30844; }
  .column.column-in_review { border-color: #a855f744; }
  .column-header {
    padding: 14px 16px;
    font-weight: 600;
    font-size: 13px;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .column-header .count {
    background: var(--bg-elevated);
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    color: var(--text-muted);
    font-weight: 500;
  }
  .column-body {
    padding: 8px;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
  }

  /* Card */
  .card {
    background: var(--bg-base);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 12px 14px;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
  }
  .card:hover {
    border-color: var(--accent);
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0,0,0,0.3), 0 0 0 1px var(--accent-glow);
  }
  .card-header { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; flex-wrap: wrap; }
  .priority-badge {
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 700;
    color: #fff;
    letter-spacing: 0.5px;
  }
  .mode-badge {
    padding: 2px 6px;
    border-radius: 6px;
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .mode-autonomous { background: rgba(34,197,94,0.2); color: #4ade80; }
  .mode-review_needed { background: rgba(245,158,11,0.2); color: #fbbf24; }
  .mode-pair { background: rgba(168,85,247,0.2); color: #c084fc; }
  .mode-collaborative { background: rgba(59,130,246,0.2); color: #60a5fa; }
  .task-id { font-size: 11px; color: var(--text-muted); margin-left: auto; }
  .card-title { font-size: 13px; font-weight: 500; margin-bottom: 8px; line-height: 1.4; }
  .card-meta { display: flex; gap: 6px; align-items: center; margin-bottom: 6px; }
  .type-icon { font-size: 14px; }
  .effort-chip {
    font-size: 10px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 4px;
    letter-spacing: 0.5px;
  }
  .effort-small { background: rgba(34,197,94,0.2); color: #4ade80; }
  .effort-medium { background: rgba(245,158,11,0.2); color: #fbbf24; }
  .effort-large { background: rgba(239,68,68,0.2); color: #f87171; }
  .research-badge { font-size: 12px; }
  .card-project { font-size: 11px; color: var(--text-secondary); margin-bottom: 6px; display: flex; align-items: center; gap: 4px; }
  .project-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .card-tags { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 6px; }
  .tag {
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 10px;
  }
  .card-deps { font-size: 11px; color: var(--text-muted); }

  /* Modal */
  .modal-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(4px);
    z-index: 1000;
    justify-content: center;
    align-items: center;
    padding: 24px;
    animation: fadeIn 0.2s ease;
  }
  .modal-overlay.active { display: flex; }
  .modal {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    max-width: 560px;
    width: 100%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 24px 48px rgba(0,0,0,0.5);
    animation: slideUp 0.25s ease;
  }
  .modal-header {
    padding: 20px 24px;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .modal-header h2 { font-size: 18px; font-weight: 600; line-height: 1.4; flex: 1; }
  .modal-close {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 20px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
    transition: all 0.15s;
    margin-left: 16px;
    flex-shrink: 0;
  }
  .modal-close:hover { background: var(--bg-elevated); color: var(--text-primary); }
  .modal-body { padding: 20px 24px; }
  .modal-field { margin-bottom: 14px; }
  .modal-field-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .modal-field-value { font-size: 14px; color: var(--text-primary); line-height: 1.5; }
  .modal-field-value.muted { color: var(--text-muted); }
  .modal-badges { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
  .modal-badges .priority-badge { font-size: 12px; padding: 3px 10px; }

  /* Create Task Form Modal */
  .create-form-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(4px);
    z-index: 1001;
    justify-content: center;
    align-items: center;
    padding: 24px;
    animation: fadeIn 0.2s ease;
  }
  .create-form-overlay.active { display: flex; }
  .create-form {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    max-width: 500px;
    width: 100%;
    max-height: 85vh;
    overflow-y: auto;
    box-shadow: 0 24px 48px rgba(0,0,0,0.5);
    animation: slideUp 0.25s ease;
  }
  .create-form-header {
    padding: 20px 24px;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .create-form-header h2 { font-size: 18px; font-weight: 600; }
  .create-form-body { padding: 20px 24px; }
  .form-group { margin-bottom: 16px; }
  .form-group label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }
  .form-group input, .form-group textarea, .form-group select {
    width: 100%;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--bg-base);
    color: var(--text-primary);
    font-size: 14px;
    font-family: inherit;
    transition: border-color 0.2s;
  }
  .form-group input:focus, .form-group textarea:focus, .form-group select:focus {
    outline: none;
    border-color: var(--accent);
  }
  .form-group textarea { resize: vertical; min-height: 80px; }
  .form-actions { display: flex; gap: 8px; justify-content: flex-end; padding-top: 8px; }
  .btn {
    padding: 8px 20px;
    border-radius: 8px;
    border: 1px solid var(--border);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-primary { background: var(--accent); color: #fff; border-color: var(--accent); }
  .btn-primary:hover { opacity: 0.9; }
  .btn-secondary { background: transparent; color: var(--text-secondary); }
  .btn-secondary:hover { background: var(--bg-elevated); }
  .tag-select { display: flex; gap: 4px; flex-wrap: wrap; }
  .tag-select-btn {
    padding: 3px 10px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 11px;
    transition: all 0.2s;
  }
  .tag-select-btn.selected { background: var(--accent-glow); color: #818cf8; border-color: var(--accent); }

  /* FAB */
  .fab {
    position: fixed;
    bottom: 76px;
    right: 24px;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--accent);
    color: #fff;
    border: none;
    font-size: 24px;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
    z-index: 999;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s;
  }
  .fab:hover { transform: scale(1.1); }

  /* Chat Bar */
  .chat-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--bg-surface);
    border-top: 1px solid var(--border);
    z-index: 998;
  }
  .chat-panel {
    max-height: 0;
    overflow-y: auto;
    transition: max-height 0.3s ease;
    padding: 0 16px;
  }
  .chat-panel.expanded { max-height: 300px; padding: 12px 16px; }
  .chat-message { margin-bottom: 8px; font-size: 13px; line-height: 1.4; }
  .chat-message.user { color: #818cf8; }
  .chat-message.system { color: var(--text-secondary); }
  .chat-message code { background: var(--bg-elevated); padding: 1px 4px; border-radius: 3px; font-size: 12px; }
  .chat-input-row {
    display: flex;
    gap: 8px;
    padding: 10px 16px;
    align-items: center;
  }
  .chat-toggle {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 16px;
    padding: 4px;
  }
  .chat-input {
    flex: 1;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--bg-base);
    color: var(--text-primary);
    font-size: 13px;
    font-family: inherit;
  }
  .chat-input:focus { outline: none; border-color: var(--accent); }
  .chat-send {
    padding: 8px 16px;
    border-radius: 8px;
    background: var(--accent);
    color: #fff;
    border: none;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s;
  }
  .chat-send:hover { opacity: 0.9; }

  /* Responsive */
  @media (max-width: 1024px) {
    .board { grid-template-columns: repeat(3, 1fr) !important; overflow-x: auto; }
  }
  @media (max-width: 640px) {
    .board { grid-template-columns: 1fr !important; }
    .stats-row { gap: 12px; }
    .filters { padding: 10px 16px; }
    .header { padding: 16px; flex-wrap: wrap; gap: 12px; }
    .board { padding: 12px 16px; }
    .modal { max-width: 100%; margin: 12px; border-radius: 12px; }
    .create-form { max-width: 100%; margin: 12px; }
  }

  /* Animations */
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
</style>
</head>
<body>
<div class="header">
  <div class="header-left">
    <h1>CTE Kanban</h1>
    <div class="board-toggle" id="board-toggle">
      <button class="board-toggle-btn active" data-board="pablo">With Pablo</button>
      <button class="board-toggle-btn" data-board="autonomous">Autonomous</button>
    </div>
  </div>
  <span class="header-time" id="last-updated"></span>
</div>
${renderStats(store, columns)}
<div class="filters">
  <div class="filter-group">
    <span class="filter-label">Project</span>
    ${store.projects.map((p) => `<button class="filter-btn" data-filter-project="${escapeHtml(p.id)}"><span class="dot" style="background:${escapeHtml(p.color)}"></span>${escapeHtml(p.name)}</button>`).join("\n    ")}
  </div>
  ${renderTagFilterPanel()}
  <div class="filter-group">
    <span class="filter-label">Priority</span>
    ${["P1", "P2", "P3", "P4"].map((p) => `<button class="filter-btn" data-filter-priority="${p}"><span class="dot" style="background:${PRIORITY_COLORS[p]}"></span>${p}</button>`).join("\n    ")}
  </div>
  ${allExecModes.length > 0 ? `<div class="filter-group">
    <span class="filter-label">Mode</span>
    ${allExecModes.map((m) => `<button class="filter-btn" data-filter-execution-mode="${escapeHtml(m)}">${escapeHtml(m)}</button>`).join("\n    ")}
  </div>` : ""}
  ${allTaskTypes.length > 0 ? `<div class="filter-group">
    <span class="filter-label">Type</span>
    ${allTaskTypes.map((t) => `<button class="filter-btn" data-filter-task-type="${escapeHtml(t)}">${TASK_TYPE_ICONS[t] ?? ""} ${escapeHtml(t)}</button>`).join("\n    ")}
  </div>` : ""}
</div>
<div class="board cols-5" id="board">
${allColumnKeys
  .map((key) => {
    const col = columns.get(key)!;
    return `  <div class="column column-${key}" data-column="${key}">
    <div class="column-header">
      <span style="color:${STATUS_COLORS[key]}">${escapeHtml(col.label)}</span>
      <span class="count">${col.tasks.length}</span>
    </div>
    <div class="column-body">
      ${col.tasks.map((t) => renderCard(t, store)).join("\n      ")}
    </div>
  </div>`;
  })
  .join("\n")}
</div>

<!-- Task Detail Modal -->
<div class="modal-overlay" id="modal-overlay">
  <div class="modal">
    <div class="modal-header">
      <h2 id="modal-title"></h2>
      <button class="modal-close" onclick="closeModal()">\u2715</button>
    </div>
    <div class="modal-body" id="modal-body"></div>
  </div>
</div>

<!-- Create Task Form -->
<div class="create-form-overlay" id="create-form-overlay">
  <div class="create-form">
    <div class="create-form-header">
      <h2>New Task</h2>
      <button class="modal-close" onclick="closeCreateForm()">\u2715</button>
    </div>
    <div class="create-form-body">
      <form id="create-task-form">
        <div class="form-group">
          <label for="task-title">Title *</label>
          <input type="text" id="task-title" required placeholder="Task title...">
        </div>
        <div class="form-group">
          <label for="task-description">Description</label>
          <textarea id="task-description" placeholder="Optional description..."></textarea>
        </div>
        <div class="form-group">
          <label for="task-priority">Priority</label>
          <select id="task-priority">
            <option value="P1">P1 - Urgent + Important</option>
            <option value="P2">P2 - Important</option>
            <option value="P3" selected>P3 - Urgent</option>
            <option value="P4">P4 - Backlog</option>
          </select>
        </div>
        <div class="form-group">
          <label for="task-project">Project</label>
          <select id="task-project">
            <option value="">None</option>
            ${store.projects.map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join("")}
          </select>
        </div>
        <div class="form-group">
          <label for="task-exec-mode">Execution Mode</label>
          <select id="task-exec-mode">
            <option value="collaborative" selected>Collaborative (With Pablo)</option>
            <option value="autonomous">Autonomous</option>
          </select>
        </div>
        <div class="form-group">
          <label>Tags</label>
          <div class="tag-select" id="tag-select">
            ${Object.entries(TAG_CATEGORIES).map(([_cat, tags]) =>
              (tags as readonly string[]).map((t) =>
                `<button type="button" class="tag-select-btn" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</button>`
              ).join("")
            ).join("")}
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeCreateForm()">Cancel</button>
          <button type="submit" class="btn btn-primary">Create Task</button>
        </div>
      </form>
    </div>
  </div>
</div>

<!-- FAB -->
<button class="fab" id="fab" onclick="openCreateForm()" title="Create task">+</button>

<!-- Chat Bar -->
<div class="chat-bar" id="chat-bar">
  <div class="chat-panel" id="chat-panel"></div>
  <div class="chat-input-row">
    <button class="chat-toggle" id="chat-toggle" title="Toggle chat">\u25B2</button>
    <input class="chat-input" id="chat-input" type="text" placeholder="Type a command or message..." />
    <button class="chat-send" id="chat-send">Send</button>
  </div>
</div>

<script>
document.getElementById('last-updated').textContent = 'Updated ' + new Date().toLocaleTimeString();

// Board Mode
const boardToggle = document.getElementById('board-toggle');
const board = document.getElementById('board');
const pabloColumns = ['backlog', 'ready', 'in_progress', 'in_review', 'done'];
const autonomousColumns = ['backlog', 'waiting_for_input', 'ready', 'in_progress', 'in_review', 'done'];

function setBoard(mode) {
  const btns = boardToggle.querySelectorAll('.board-toggle-btn');
  btns.forEach(b => b.classList.toggle('active', b.dataset.board === mode));

  const visibleCols = mode === 'autonomous' ? autonomousColumns : pabloColumns;
  board.className = 'board cols-' + visibleCols.length;

  document.querySelectorAll('.column').forEach(col => {
    const colKey = col.dataset.column;
    if (colKey === 'failed') {
      col.style.display = 'none';
      return;
    }
    col.style.display = visibleCols.includes(colKey) ? '' : 'none';
  });

  // Filter cards by execution mode
  document.querySelectorAll('.card').forEach(card => {
    const execMode = card.dataset.executionMode;
    if (mode === 'autonomous') {
      card.style.display = execMode === 'autonomous' ? '' : 'none';
    } else {
      card.style.display = (execMode === 'autonomous') ? 'none' : '';
    }
  });

  localStorage.setItem('cte-board-mode', mode);
}

boardToggle.addEventListener('click', (e) => {
  const btn = e.target.closest('.board-toggle-btn');
  if (btn) setBoard(btn.dataset.board);
});

// Restore saved board mode
setBoard(localStorage.getItem('cte-board-mode') || 'pablo');

// Filtering
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.classList.toggle('active');
    applyFilters();
  });
});

function applyFilters() {
  const activeProjects = [...document.querySelectorAll('.filter-btn.active[data-filter-project]')].map(b => b.dataset.filterProject);
  const activeTags = [...document.querySelectorAll('.filter-btn.active[data-filter-tag]')].map(b => b.dataset.filterTag);
  const activePriorities = [...document.querySelectorAll('.filter-btn.active[data-filter-priority]')].map(b => b.dataset.filterPriority);
  const activeModes = [...document.querySelectorAll('.filter-btn.active[data-filter-execution-mode]')].map(b => b.dataset.filterExecutionMode);
  const activeTypes = [...document.querySelectorAll('.filter-btn.active[data-filter-task-type]')].map(b => b.dataset.filterTaskType);

  const currentBoard = localStorage.getItem('cte-board-mode') || 'pablo';

  document.querySelectorAll('.card').forEach(card => {
    const proj = card.dataset.project;
    const tags = card.dataset.tags ? card.dataset.tags.split(',').filter(Boolean) : [];
    const priority = card.dataset.priority;
    const mode = card.dataset.executionMode;
    const type = card.dataset.taskType;

    // Board mode filter
    let boardMatch;
    if (currentBoard === 'autonomous') {
      boardMatch = mode === 'autonomous';
    } else {
      boardMatch = mode !== 'autonomous';
    }

    const matchProj = activeProjects.length === 0 || activeProjects.includes(proj);
    const matchTag = activeTags.length === 0 || activeTags.some(t => tags.includes(t));
    const matchPriority = activePriorities.length === 0 || activePriorities.includes(priority);
    const matchMode = activeModes.length === 0 || activeModes.includes(mode);
    const matchType = activeTypes.length === 0 || activeTypes.includes(type);

    card.style.display = (boardMatch && matchProj && matchTag && matchPriority && matchMode && matchType) ? '' : 'none';
  });
}

// Modal
function showModal(cardEl) {
  const task = JSON.parse(cardEl.dataset.task);
  document.getElementById('modal-title').textContent = task.title;

  const fields = [
    { label: 'ID', value: task.id },
    { label: 'Status', value: task.status },
    { label: 'Priority', value: task.priority },
    { label: 'Project', value: task.project || '-' },
    { label: 'Tags', value: task.tags.length > 0 ? task.tags.join(', ') : '-' },
    { label: 'Dependencies', value: task.dependencies.length > 0 ? task.dependencies.join(', ') : '-' },
    { label: 'Execution Mode', value: task.execution_mode || '-' },
    { label: 'Task Type', value: task.task_type || '-' },
    { label: 'Working Dir', value: task.workdir || '-' },
    { label: 'Needs Research', value: task.needs_research ? 'Yes' : 'No' },
    { label: 'Estimated Effort', value: task.estimated_effort || '-' },
    { label: 'Description', value: task.description || '-' },
    { label: 'Created', value: task.created_at },
    { label: 'Started', value: task.started_at || '-' },
    { label: 'Completed', value: task.completed_at || '-' },
    { label: 'Assignee', value: task.assignee || '-' },
    { label: 'Result', value: task.result || '-' },
    { label: 'Failure Reason', value: task.failure_reason || '-' },
  ];

  const html = fields.map(f =>
    '<div class="modal-field"><div class="modal-field-label">' + f.label + '</div><div class="modal-field-value' + (f.value === '-' ? ' muted' : '') + '">' + escapeHtmlJs(f.value) + '</div></div>'
  ).join('');

  document.getElementById('modal-body').innerHTML = html;
  document.getElementById('modal-overlay').classList.add('active');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
}

document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});

// Create Task Form
function openCreateForm() {
  document.getElementById('create-form-overlay').classList.add('active');
  document.getElementById('task-title').focus();
}

function closeCreateForm() {
  document.getElementById('create-form-overlay').classList.remove('active');
  document.getElementById('create-task-form').reset();
  document.querySelectorAll('.tag-select-btn.selected').forEach(b => b.classList.remove('selected'));
}

document.getElementById('create-form-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('create-form-overlay')) closeCreateForm();
});

document.querySelectorAll('.tag-select-btn').forEach(btn => {
  btn.addEventListener('click', () => btn.classList.toggle('selected'));
});

document.getElementById('create-task-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    title: document.getElementById('task-title').value,
    description: document.getElementById('task-description').value || null,
    priority: document.getElementById('task-priority').value,
    project: document.getElementById('task-project').value || null,
    execution_mode: document.getElementById('task-exec-mode').value,
    tags: [...document.querySelectorAll('.tag-select-btn.selected')].map(b => b.dataset.tag),
  };
  try {
    const res = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) {
      closeCreateForm();
      location.reload();
    } else {
      const err = await res.json();
      alert('Error: ' + (err.error || 'Unknown error'));
    }
  } catch (e) {
    alert('Network error');
  }
});

// Chat
const chatPanel = document.getElementById('chat-panel');
const chatInput = document.getElementById('chat-input');
const chatToggle = document.getElementById('chat-toggle');
let chatExpanded = false;

chatToggle.addEventListener('click', () => {
  chatExpanded = !chatExpanded;
  chatPanel.classList.toggle('expanded', chatExpanded);
  chatToggle.textContent = chatExpanded ? '\\u25BC' : '\\u25B2';
});

function addChatMessage(text, cls) {
  const div = document.createElement('div');
  div.className = 'chat-message ' + cls;
  div.innerHTML = text.replace(/\`([^\`]+)\`/g, '<code>$1</code>').replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>');
  chatPanel.appendChild(div);
  chatPanel.scrollTop = chatPanel.scrollHeight;
  if (!chatExpanded) {
    chatExpanded = true;
    chatPanel.classList.add('expanded');
    chatToggle.textContent = '\\u25BC';
  }
}

async function sendChat() {
  const msg = chatInput.value.trim();
  if (!msg) return;
  chatInput.value = '';
  addChatMessage(msg, 'user');
  try {
    const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg }) });
    const data = await res.json();
    if (data.type === 'message' && data.queued) {
      addChatMessage('⏳ Enviado a Claudio...', 'system');
    }
    if (data.response) addChatMessage(data.response, 'system');
  } catch (e) {
    addChatMessage('Network error', 'system');
  }
}

document.getElementById('chat-send').addEventListener('click', sendChat);
chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); });

// Poll for outbox messages
setInterval(async () => {
  try {
    const res = await fetch('/api/chat');
    const data = await res.json();
    if (data.messages && data.messages.length > 0) {
      data.messages.forEach(m => addChatMessage(m.message, 'system'));
    }
  } catch (e) {}
}, 3000);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeModal(); closeCreateForm(); }
});

function escapeHtmlJs(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

// Auto-refresh every 30s
setTimeout(() => location.reload(), 30000);
</script>
</body>
</html>`;
}
