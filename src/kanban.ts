import type { Task, TaskStore } from "./types.js";
import { computeStatus } from "./dag.js";

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
  done: "#22c55e",
  failed: "#ef4444",
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
      ${task.tags.length > 0 ? `<div class="card-tags">${task.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>` : ""}
      ${depCount > 0 ? `<div class="card-deps">\u{1F517} ${depCount} dep${depCount > 1 ? "s" : ""}</div>` : ""}
    </div>`;
}

function categorize(tasks: Task[], store: TaskStore): Map<string, { label: string; tasks: Task[] }> {
  const updated = computeStatus(tasks);
  const columns = new Map<string, { label: string; tasks: Task[] }>([
    ["backlog", { label: "Backlog", tasks: [] }],
    ["ready", { label: "Ready", tasks: [] }],
    ["in_progress", { label: "In Progress", tasks: [] }],
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
      case "in_progress":
        columns.get("in_progress")!.tasks.push(t);
        break;
      case "completed":
        columns.get("done")!.tasks.push(t);
        break;
      case "failed":
        columns.get("failed")!.tasks.push(t);
        break;
    }
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

  return `
  <div class="stats">
    <div class="stats-row">
      <div class="stat-item">
        <span class="stat-value">${total}</span>
        <span class="stat-label">Total</span>
      </div>
      ${["backlog", "ready", "in_progress", "done", "failed"].map((key) => {
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

export function generateKanban(store: TaskStore): string {
  const columns = categorize(store.tasks, store);
  const allTags = [...new Set(store.tasks.flatMap((t) => t.tags))].sort();
  const allExecModes = [...new Set(store.tasks.map((t) => t.execution_mode).filter(Boolean))].sort() as string[];
  const allTaskTypes = [...new Set(store.tasks.map((t) => t.task_type).filter(Boolean))].sort() as string[];
  const columnOrder = ["backlog", "ready", "in_progress", "done", "failed"];

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
  .header h1 {
    font-size: 22px;
    font-weight: 700;
    background: linear-gradient(135deg, #818cf8, #6366f1);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    letter-spacing: -0.5px;
  }
  .header-time { font-size: 12px; color: var(--text-muted); }

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
    grid-template-columns: repeat(5, 1fr);
    gap: 12px;
    padding: 16px 24px;
    min-height: calc(100vh - 240px);
  }

  /* Column */
  .column {
    background: var(--bg-surface);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--border);
    min-width: 0;
  }
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
    background: var(--bg-elevated);
    color: var(--text-secondary);
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

  /* Responsive */
  @media (max-width: 1024px) {
    .board { grid-template-columns: repeat(3, 1fr); overflow-x: auto; }
  }
  @media (max-width: 640px) {
    .board { grid-template-columns: 1fr; }
    .stats-row { gap: 12px; }
    .filters { padding: 10px 16px; }
    .header { padding: 16px; }
    .board { padding: 12px 16px; }
    .modal { max-width: 100%; margin: 12px; border-radius: 12px; }
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
  <h1>CTE Kanban</h1>
  <span class="header-time" id="last-updated"></span>
</div>
${renderStats(store, columns)}
<div class="filters">
  <div class="filter-group">
    <span class="filter-label">Project</span>
    ${store.projects.map((p) => `<button class="filter-btn" data-filter-project="${escapeHtml(p.id)}"><span class="dot" style="background:${escapeHtml(p.color)}"></span>${escapeHtml(p.name)}</button>`).join("\n    ")}
  </div>
  ${allTags.length > 0 ? `<div class="filter-group">
    <span class="filter-label">Tags</span>
    ${allTags.map((t) => `<button class="filter-btn" data-filter-tag="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join("\n    ")}
  </div>` : ""}
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
<div class="board">
${columnOrder
  .map((key) => {
    const col = columns.get(key)!;
    return `  <div class="column">
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

<div class="modal-overlay" id="modal-overlay">
  <div class="modal">
    <div class="modal-header">
      <h2 id="modal-title"></h2>
      <button class="modal-close" onclick="closeModal()">\u2715</button>
    </div>
    <div class="modal-body" id="modal-body"></div>
  </div>
</div>

<script>
document.getElementById('last-updated').textContent = 'Updated ' + new Date().toLocaleTimeString();

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

  document.querySelectorAll('.card').forEach(card => {
    const proj = card.dataset.project;
    const tags = card.dataset.tags ? card.dataset.tags.split(',').filter(Boolean) : [];
    const priority = card.dataset.priority;
    const mode = card.dataset.executionMode;
    const type = card.dataset.taskType;

    const matchProj = activeProjects.length === 0 || activeProjects.includes(proj);
    const matchTag = activeTags.length === 0 || activeTags.some(t => tags.includes(t));
    const matchPriority = activePriorities.length === 0 || activePriorities.includes(priority);
    const matchMode = activeModes.length === 0 || activeModes.includes(mode);
    const matchType = activeTypes.length === 0 || activeTypes.includes(type);

    card.style.display = (matchProj && matchTag && matchPriority && matchMode && matchType) ? '' : 'none';
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

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
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
