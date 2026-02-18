import { describe, it, expect } from "vitest";
import { sortByPriority, eisenhowerLabel } from "../priority.js";
import type { Task } from "../types.js";

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
    ...overrides,
  };
}

describe("sortByPriority", () => {
  it("sorts P1 before P2 before P3 before P4", () => {
    const tasks = [
      makeTask({ id: "D", priority: "P4" }),
      makeTask({ id: "A", priority: "P1" }),
      makeTask({ id: "C", priority: "P3" }),
      makeTask({ id: "B", priority: "P2" }),
    ];
    const sorted = sortByPriority(tasks);
    expect(sorted.map((t) => t.id)).toEqual(["A", "B", "C", "D"]);
  });

  it("sorts by created_at within same priority (FIFO)", () => {
    const tasks = [
      makeTask({ id: "B", priority: "P2", created_at: "2026-02-16T12:00:00Z" }),
      makeTask({ id: "A", priority: "P2", created_at: "2026-02-16T08:00:00Z" }),
      makeTask({ id: "C", priority: "P2", created_at: "2026-02-16T10:00:00Z" }),
    ];
    const sorted = sortByPriority(tasks);
    expect(sorted.map((t) => t.id)).toEqual(["A", "C", "B"]);
  });

  it("does not mutate original array", () => {
    const tasks = [
      makeTask({ id: "B", priority: "P3" }),
      makeTask({ id: "A", priority: "P1" }),
    ];
    const original = [...tasks];
    sortByPriority(tasks);
    expect(tasks.map((t) => t.id)).toEqual(original.map((t) => t.id));
  });

  it("handles empty array", () => {
    expect(sortByPriority([])).toEqual([]);
  });
});

describe("eisenhowerLabel", () => {
  it("returns correct labels", () => {
    expect(eisenhowerLabel("P1")).toBe("Urgent + Important");
    expect(eisenhowerLabel("P2")).toBe("Important");
    expect(eisenhowerLabel("P3")).toBe("Urgent");
    expect(eisenhowerLabel("P4")).toBe("Backlog");
  });
});
