import type { Task, TaskStore } from "./types.js";
import { computeStatus } from "./dag.js";

const PRIORITY_COLORS = {
  P1: "#ef4444",
  P2: "#eab308",
  P3: "#3b82f6",
  P4: "#6b7280",
} as const;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderCard(task: Task, store: TaskStore): string {
  const project = task.project
    ? store.projects.find((p) => p.id === task.project)
    : null;
  const depCount = task.dependencies.length;

  return `
    <div class="card" data-project="${escapeHtml(task.project ?? "")}" data-tags="${escapeHtml(task.tags.join(","))}">
      <div class="card-header">
        <span class="priority-badge" style="background: ${PRIORITY_COLORS[task.priority]}">${escapeHtml(task.priority)}</span>
        <span class="task-id">${escapeHtml(task.id)}</span>
      </div>
      <div class="card-title">${escapeHtml(task.title)}</div>
      ${project ? `<div class="card-project"><span class="project-dot" style="background: ${escapeHtml(project.color)}"></span>${escapeHtml(project.name)}</div>` : ""}
      ${task.tags.length > 0 ? `<div class="card-tags">${task.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>` : ""}
      ${depCount > 0 ? `<div class="card-deps">${depCount} dep${depCount > 1 ? "s" : ""}</div>` : ""}
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

export function generateKanban(store: TaskStore): string {
  const columns = categorize(store.tasks, store);
  const allTags = [...new Set(store.tasks.flatMap((t) => t.tags))].sort();
  const columnOrder = ["backlog", "ready", "in_progress", "done", "failed"];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CTE Kanban</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #1a1a2e; color: #e0e0e0; min-height: 100vh; }
  .header { padding: 16px 24px; background: #16213e; border-bottom: 1px solid #2a2a4a; }
  .header h1 { font-size: 20px; font-weight: 600; }
  .filters { display: flex; gap: 8px; flex-wrap: wrap; padding: 12px 24px; background: #16213e; border-bottom: 1px solid #2a2a4a; }
  .filter-btn { padding: 4px 12px; border-radius: 12px; border: 1px solid #3a3a5a; background: transparent; color: #a0a0c0; cursor: pointer; font-size: 12px; }
  .filter-btn:hover, .filter-btn.active { background: #2a2a4a; color: #fff; }
  .filter-btn .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; }
  .board { display: flex; gap: 16px; padding: 16px 24px; overflow-x: auto; min-height: calc(100vh - 110px); }
  .column { flex: 1; min-width: 240px; max-width: 320px; background: #16213e; border-radius: 8px; display: flex; flex-direction: column; }
  .column-header { padding: 12px 16px; font-weight: 600; font-size: 14px; border-bottom: 1px solid #2a2a4a; display: flex; justify-content: space-between; }
  .column-header .count { color: #6b7280; font-weight: 400; }
  .column-body { padding: 8px; flex: 1; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; }
  .card { background: #1e1e3a; border: 1px solid #2a2a4a; border-radius: 6px; padding: 10px 12px; }
  .card-header { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
  .priority-badge { padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; color: #fff; }
  .task-id { font-size: 11px; color: #6b7280; }
  .card-title { font-size: 13px; font-weight: 500; margin-bottom: 6px; }
  .card-project { font-size: 11px; color: #9ca3af; margin-bottom: 4px; display: flex; align-items: center; gap: 4px; }
  .project-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }
  .card-tags { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 4px; }
  .tag { font-size: 10px; padding: 1px 6px; border-radius: 8px; background: #2a2a4a; color: #a0a0c0; }
  .card-deps { font-size: 11px; color: #6b7280; }
</style>
</head>
<body>
<div class="header"><h1>CTE Kanban</h1></div>
<div class="filters">
  <span style="font-size:12px;color:#6b7280;line-height:28px;">Projects:</span>
  ${store.projects.map((p) => `<button class="filter-btn" data-filter-project="${escapeHtml(p.id)}"><span class="dot" style="background:${escapeHtml(p.color)}"></span>${escapeHtml(p.name)}</button>`).join("\n  ")}
  ${allTags.length > 0 ? `<span style="font-size:12px;color:#6b7280;line-height:28px;margin-left:8px;">Tags:</span>` : ""}
  ${allTags.map((t) => `<button class="filter-btn" data-filter-tag="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join("\n  ")}
</div>
<div class="board">
${columnOrder
  .map((key) => {
    const col = columns.get(key)!;
    return `  <div class="column">
    <div class="column-header">${escapeHtml(col.label)} <span class="count">${col.tasks.length}</span></div>
    <div class="column-body">
      ${col.tasks.map((t) => renderCard(t, store)).join("\n      ")}
    </div>
  </div>`;
  })
  .join("\n")}
</div>
<script>
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.classList.toggle('active');
    const activeProjects = [...document.querySelectorAll('.filter-btn.active[data-filter-project]')].map(b => b.dataset.filterProject);
    const activeTags = [...document.querySelectorAll('.filter-btn.active[data-filter-tag]')].map(b => b.dataset.filterTag);
    document.querySelectorAll('.card').forEach(card => {
      const proj = card.dataset.project;
      const tags = card.dataset.tags ? card.dataset.tags.split(',') : [];
      const matchProj = activeProjects.length === 0 || activeProjects.includes(proj);
      const matchTag = activeTags.length === 0 || activeTags.some(t => tags.includes(t));
      card.style.display = (matchProj && matchTag) ? '' : 'none';
    });
  });
});
</script>
</body>
</html>`;
}
