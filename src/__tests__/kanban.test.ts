import { describe, it, expect } from "vitest";
import { generateKanban } from "../kanban.js";
import type { Task, TaskStore } from "../types.js";

function makeTask(overrides: Partial<Task> & { id: string }): Task {
  return {
    title: overrides.id,
    description: null,
    status: "pending",
    priority: "P4",
    dependencies: [],
    tags: [],
    project: null,
    created_at: "2026-02-16T00:00:00Z",
    started_at: null,
    completed_at: null,
    assignee: null,
    result: null,
    failure_reason: null,
    execution_mode: null,
    task_type: null,
    workdir: null,
    needs_research: false,
    estimated_effort: null,
    ...overrides,
  };
}

const projects = [
  { id: "personal", name: "Personal", color: "#4A90D9" },
  { id: "negocio", name: "Negocio IA", color: "#D94A4A" },
];

describe("generateKanban", () => {
  it("returns valid HTML", () => {
    const store: TaskStore = { tasks: [], projects };
    const html = generateKanban(store);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("</html>");
  });

  it("includes column headers", () => {
    const store: TaskStore = { tasks: [], projects };
    const html = generateKanban(store);
    expect(html).toContain("Backlog");
    expect(html).toContain("Ready");
    expect(html).toContain("In Progress");
    expect(html).toContain("Done");
    expect(html).toContain("Failed");
  });

  it("renders task cards in correct columns", () => {
    const store: TaskStore = {
      tasks: [
        makeTask({ id: "task-001", title: "Pending task", status: "pending", priority: "P4" }),
        makeTask({ id: "task-002", title: "Ready task", status: "ready", priority: "P1" }),
        makeTask({ id: "task-003", title: "Active task", status: "in_progress", priority: "P2" }),
        makeTask({ id: "task-004", title: "Done task", status: "completed", priority: "P3" }),
        makeTask({ id: "task-005", title: "Failed task", status: "failed", priority: "P1" }),
      ],
      projects,
    };
    const html = generateKanban(store);
    expect(html).toContain("Pending task");
    expect(html).toContain("Ready task");
    expect(html).toContain("Active task");
    expect(html).toContain("Done task");
    expect(html).toContain("Failed task");
  });

  it("shows priority badges", () => {
    const store: TaskStore = {
      tasks: [makeTask({ id: "task-001", title: "Urgent", priority: "P1" })],
      projects,
    };
    const html = generateKanban(store);
    expect(html).toContain("P1");
  });

  it("shows project info", () => {
    const store: TaskStore = {
      tasks: [makeTask({ id: "task-001", title: "My task", project: "personal" })],
      projects,
    };
    const html = generateKanban(store);
    expect(html).toContain("Personal");
    expect(html).toContain("#4A90D9");
  });

  it("shows tags", () => {
    const store: TaskStore = {
      tasks: [makeTask({ id: "task-001", title: "Tagged", tags: ["research", "health"] })],
      projects,
    };
    const html = generateKanban(store);
    expect(html).toContain("research");
    expect(html).toContain("health");
  });

  it("shows dependency count", () => {
    const store: TaskStore = {
      tasks: [
        makeTask({ id: "task-001", title: "A" }),
        makeTask({ id: "task-002", title: "B", dependencies: ["task-001"] }),
      ],
      projects,
    };
    const html = generateKanban(store);
    expect(html).toContain("1 dep");
  });

  it("includes filter buttons for projects", () => {
    const store: TaskStore = { tasks: [], projects };
    const html = generateKanban(store);
    expect(html).toContain("Personal");
    expect(html).toContain("Negocio IA");
  });

  it("has dark mode styles", () => {
    const store: TaskStore = { tasks: [], projects };
    const html = generateKanban(store);
    expect(html).toContain("#0f172a");
    expect(html).toContain("#1e293b");
  });

  it("has responsive viewport meta tag", () => {
    const store: TaskStore = { tasks: [], projects };
    const html = generateKanban(store);
    expect(html).toContain('name="viewport"');
    expect(html).toContain("width=device-width");
  });

  it("has responsive CSS media queries", () => {
    const store: TaskStore = { tasks: [], projects };
    const html = generateKanban(store);
    expect(html).toContain("@media");
    expect(html).toContain("640px");
    expect(html).toContain("1024px");
  });

  it("has task detail modal markup", () => {
    const store: TaskStore = { tasks: [], projects };
    const html = generateKanban(store);
    expect(html).toContain("modal-overlay");
    expect(html).toContain("modal-body");
    expect(html).toContain("showModal");
    expect(html).toContain("closeModal");
  });

  it("renders new v2 fields on cards when present", () => {
    const store: TaskStore = {
      tasks: [makeTask({
        id: "task-001",
        title: "V2 task",
        execution_mode: "autonomous",
        task_type: "coding",
        estimated_effort: "large",
        needs_research: true,
      })],
      projects,
    };
    const html = generateKanban(store);
    expect(html).toContain("autonomous");
    expect(html).toContain("mode-autonomous");
    expect(html).toContain("effort-large");
    expect(html).toContain("research-badge");
  });

  it("has filter buttons for priority", () => {
    const store: TaskStore = { tasks: [], projects };
    const html = generateKanban(store);
    expect(html).toContain("data-filter-priority");
    expect(html).toContain("P1");
    expect(html).toContain("P2");
  });

  it("has filter buttons for execution_mode when tasks have modes", () => {
    const store: TaskStore = {
      tasks: [makeTask({ id: "task-001", title: "Auto", execution_mode: "autonomous" })],
      projects,
    };
    const html = generateKanban(store);
    expect(html).toContain("data-filter-execution-mode");
    expect(html).toContain("autonomous");
  });

  it("has stats section with task counts", () => {
    const store: TaskStore = {
      tasks: [
        makeTask({ id: "task-001", title: "A", status: "pending" }),
        makeTask({ id: "task-002", title: "B", status: "completed" }),
      ],
      projects,
    };
    const html = generateKanban(store);
    expect(html).toContain("stats");
    expect(html).toContain("progress-bar");
    expect(html).toContain("50%");
  });

  it("has auto-refresh mechanism", () => {
    const store: TaskStore = { tasks: [], projects };
    const html = generateKanban(store);
    expect(html).toContain("setTimeout");
    expect(html).toContain("reload");
  });

  it("escapes HTML in new v2 fields", () => {
    const store: TaskStore = {
      tasks: [makeTask({
        id: "task-001",
        title: "XSS test",
        workdir: "</script><script>alert(1)</script>",
        execution_mode: "autonomous",
      })],
      projects,
    };
    const html = generateKanban(store);
    expect(html).not.toContain("</script><script>alert(1)</script>");
    expect(html).toContain("&lt;/script&gt;");
  });
});
