import { describe, it, expect } from "vitest";
import { TaskSchema, TaskStoreSchema, Priority, TaskStatus, ExecutionMode, TaskType, EstimatedEffort, ok, err } from "../types.js";

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

  it("validates new v2 fields with valid values", () => {
    const result = TaskSchema.safeParse({
      id: "task-001",
      title: "V2 task",
      created_at: "2026-02-16T00:00:00Z",
      execution_mode: "autonomous",
      task_type: "coding",
      workdir: "/home/user/project",
      needs_research: true,
      estimated_effort: "large",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.execution_mode).toBe("autonomous");
      expect(result.data.task_type).toBe("coding");
      expect(result.data.workdir).toBe("/home/user/project");
      expect(result.data.needs_research).toBe(true);
      expect(result.data.estimated_effort).toBe("large");
    }
  });

  it("applies defaults for new v2 fields when omitted", () => {
    const result = TaskSchema.parse({
      id: "task-001",
      title: "Minimal task",
      created_at: "2026-02-16T00:00:00Z",
    });
    expect(result.execution_mode).toBeNull();
    expect(result.task_type).toBeNull();
    expect(result.workdir).toBeNull();
    expect(result.needs_research).toBe(false);
    expect(result.estimated_effort).toBeNull();
  });

  it("rejects invalid execution_mode", () => {
    const result = TaskSchema.safeParse({
      id: "task-001",
      title: "Bad mode",
      created_at: "2026-02-16T00:00:00Z",
      execution_mode: "invalid_mode",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid task_type", () => {
    const result = TaskSchema.safeParse({
      id: "task-001",
      title: "Bad type",
      created_at: "2026-02-16T00:00:00Z",
      task_type: "invalid_type",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid estimated_effort", () => {
    const result = TaskSchema.safeParse({
      id: "task-001",
      title: "Bad effort",
      created_at: "2026-02-16T00:00:00Z",
      estimated_effort: "tiny",
    });
    expect(result.success).toBe(false);
  });

  it("validates v2 enum values", () => {
    expect(ExecutionMode.options).toEqual(["autonomous", "review_needed", "pair"]);
    expect(TaskType.options).toEqual(["research", "coding", "writing", "ops", "mixed"]);
    expect(EstimatedEffort.options).toEqual(["small", "medium", "large"]);
  });

  it("backward compatibility: existing tasks without new fields parse correctly", () => {
    const oldTask = {
      id: "task-001",
      title: "Legacy task",
      description: "Old task",
      status: "completed",
      priority: "P1",
      dependencies: [],
      tags: ["legacy"],
      project: "personal",
      created_at: "2026-01-01T00:00:00Z",
      started_at: "2026-01-01T01:00:00Z",
      completed_at: "2026-01-02T00:00:00Z",
      assignee: "claudio",
      result: "Done",
      failure_reason: null,
    };
    const result = TaskSchema.safeParse(oldTask);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.execution_mode).toBeNull();
      expect(result.data.needs_research).toBe(false);
    }
  });
});
