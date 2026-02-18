import { describe, it, expect } from "vitest";
import { TaskSchema, TaskStoreSchema, Priority, TaskStatus, ok, err } from "../types.js";

describe("types", () => {
  it("validates a full task", () => {
    const result = TaskSchema.safeParse({
      id: "task-001",
      title: "Test task",
      description: "A test",
      status: "pending",
      priority: "P2",
      dependencies: ["task-000"],
      tags: ["research"],
      project: "personal",
      created_at: "2026-02-16T00:00:00Z",
      started_at: null,
      completed_at: null,
      assignee: null,
      result: null,
      failure_reason: null,
    });
    expect(result.success).toBe(true);
  });

  it("applies defaults for optional fields", () => {
    const result = TaskSchema.parse({
      id: "task-001",
      title: "Minimal task",
      created_at: "2026-02-16T00:00:00Z",
    });
    expect(result.status).toBe("pending");
    expect(result.priority).toBe("P4");
    expect(result.dependencies).toEqual([]);
    expect(result.tags).toEqual([]);
    expect(result.project).toBeNull();
    expect(result.description).toBeNull();
  });

  it("rejects invalid status", () => {
    const result = TaskSchema.safeParse({
      id: "task-001",
      title: "Bad status",
      status: "invalid",
      created_at: "2026-02-16T00:00:00Z",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid priority", () => {
    const result = TaskSchema.safeParse({
      id: "task-001",
      title: "Bad priority",
      priority: "P5",
      created_at: "2026-02-16T00:00:00Z",
    });
    expect(result.success).toBe(false);
  });

  it("validates a task store", () => {
    const result = TaskStoreSchema.safeParse({
      tasks: [],
      projects: [{ id: "personal", name: "Personal", color: "#4A90D9" }],
    });
    expect(result.success).toBe(true);
  });

  it("validates priority enum values", () => {
    expect(Priority.options).toEqual(["P1", "P2", "P3", "P4"]);
  });

  it("validates status enum values", () => {
    expect(TaskStatus.options).toEqual([
      "pending", "ready", "in_progress", "completed", "failed", "blocked",
    ]);
  });

  it("Result helpers work", () => {
    const success = ok(42);
    expect(success).toEqual({ ok: true, value: 42 });
    const failure = err("oops");
    expect(failure).toEqual({ ok: false, error: "oops" });
  });
});
