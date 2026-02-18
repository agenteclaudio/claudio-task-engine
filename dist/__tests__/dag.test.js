import { describe, it, expect } from "vitest";
import { buildGraph, detectCycle, computeStatus, computeWaves, getReadyTasks } from "../dag.js";
function makeTask(overrides) {
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
describe("buildGraph", () => {
    it("builds adjacency list from dependencies", () => {
        const tasks = [
            makeTask({ id: "A", dependencies: [] }),
            makeTask({ id: "B", dependencies: ["A"] }),
            makeTask({ id: "C", dependencies: ["A", "B"] }),
        ];
        const graph = buildGraph(tasks);
        expect(graph.get("A")).toEqual(new Set(["B", "C"]));
        expect(graph.get("B")).toEqual(new Set(["C"]));
        expect(graph.has("C")).toBe(true);
        expect(graph.get("C")?.size ?? 0).toBe(0);
    });
    it("handles tasks with no dependencies", () => {
        const tasks = [makeTask({ id: "A" }), makeTask({ id: "B" })];
        const graph = buildGraph(tasks);
        expect(graph.get("A")?.size ?? 0).toBe(0);
        expect(graph.get("B")?.size ?? 0).toBe(0);
    });
});
describe("detectCycle", () => {
    it("returns false for acyclic graph", () => {
        const tasks = [
            makeTask({ id: "A" }),
            makeTask({ id: "B", dependencies: ["A"] }),
            makeTask({ id: "C", dependencies: ["B"] }),
        ];
        expect(detectCycle(tasks)).toBe(false);
    });
    it("returns true for cyclic graph", () => {
        const tasks = [
            makeTask({ id: "A", dependencies: ["C"] }),
            makeTask({ id: "B", dependencies: ["A"] }),
            makeTask({ id: "C", dependencies: ["B"] }),
        ];
        expect(detectCycle(tasks)).toBe(true);
    });
    it("returns false for empty task list", () => {
        expect(detectCycle([])).toBe(false);
    });
    it("detects self-dependency cycle", () => {
        const tasks = [makeTask({ id: "A", dependencies: ["A"] })];
        expect(detectCycle(tasks)).toBe(true);
    });
});
describe("computeStatus", () => {
    it("marks tasks with completed deps as ready", () => {
        const tasks = [
            makeTask({ id: "A", status: "completed" }),
            makeTask({ id: "B", dependencies: ["A"], status: "pending" }),
        ];
        const updated = computeStatus(tasks);
        expect(updated.find((t) => t.id === "B").status).toBe("ready");
    });
    it("marks tasks with incomplete deps as blocked", () => {
        const tasks = [
            makeTask({ id: "A", status: "pending" }),
            makeTask({ id: "B", dependencies: ["A"], status: "pending" }),
        ];
        const updated = computeStatus(tasks);
        expect(updated.find((t) => t.id === "B").status).toBe("blocked");
    });
    it("marks tasks with failed deps as blocked", () => {
        const tasks = [
            makeTask({ id: "A", status: "failed" }),
            makeTask({ id: "B", dependencies: ["A"], status: "pending" }),
        ];
        const updated = computeStatus(tasks);
        expect(updated.find((t) => t.id === "B").status).toBe("blocked");
    });
    it("marks tasks with no deps and pending status as ready", () => {
        const tasks = [makeTask({ id: "A", status: "pending" })];
        const updated = computeStatus(tasks);
        expect(updated.find((t) => t.id === "A").status).toBe("ready");
    });
    it("does not change completed/in_progress/failed tasks", () => {
        const tasks = [
            makeTask({ id: "A", status: "completed" }),
            makeTask({ id: "B", status: "in_progress" }),
            makeTask({ id: "C", status: "failed" }),
        ];
        const updated = computeStatus(tasks);
        expect(updated.find((t) => t.id === "A").status).toBe("completed");
        expect(updated.find((t) => t.id === "B").status).toBe("in_progress");
        expect(updated.find((t) => t.id === "C").status).toBe("failed");
    });
});
describe("computeWaves", () => {
    it("computes correct waves for linear chain", () => {
        const tasks = [
            makeTask({ id: "A", status: "pending" }),
            makeTask({ id: "B", dependencies: ["A"], status: "pending" }),
            makeTask({ id: "C", dependencies: ["B"], status: "pending" }),
        ];
        const waves = computeWaves(tasks);
        expect(waves).toHaveLength(3);
        expect(waves[0].tasks.map((t) => t.id)).toEqual(["A"]);
        expect(waves[1].tasks.map((t) => t.id)).toEqual(["B"]);
        expect(waves[2].tasks.map((t) => t.id)).toEqual(["C"]);
    });
    it("computes correct waves for parallel tasks", () => {
        const tasks = [
            makeTask({ id: "A", status: "pending" }),
            makeTask({ id: "B", status: "pending" }),
            makeTask({ id: "C", dependencies: ["A", "B"], status: "pending" }),
        ];
        const waves = computeWaves(tasks);
        expect(waves).toHaveLength(2);
        expect(waves[0].tasks.map((t) => t.id).sort()).toEqual(["A", "B"]);
        expect(waves[1].tasks.map((t) => t.id)).toEqual(["C"]);
    });
    it("skips completed tasks", () => {
        const tasks = [
            makeTask({ id: "A", status: "completed" }),
            makeTask({ id: "B", dependencies: ["A"], status: "pending" }),
        ];
        const waves = computeWaves(tasks);
        expect(waves).toHaveLength(1);
        expect(waves[0].tasks.map((t) => t.id)).toEqual(["B"]);
    });
    it("returns empty for all completed", () => {
        const tasks = [
            makeTask({ id: "A", status: "completed" }),
            makeTask({ id: "B", status: "completed" }),
        ];
        const waves = computeWaves(tasks);
        expect(waves).toHaveLength(0);
    });
    it("handles diamond dependency pattern", () => {
        const tasks = [
            makeTask({ id: "A", status: "pending" }),
            makeTask({ id: "B", dependencies: ["A"], status: "pending" }),
            makeTask({ id: "C", dependencies: ["A"], status: "pending" }),
            makeTask({ id: "D", dependencies: ["B", "C"], status: "pending" }),
        ];
        const waves = computeWaves(tasks);
        expect(waves).toHaveLength(3);
        expect(waves[0].tasks.map((t) => t.id)).toEqual(["A"]);
        expect(waves[1].tasks.map((t) => t.id).sort()).toEqual(["B", "C"]);
        expect(waves[2].tasks.map((t) => t.id)).toEqual(["D"]);
    });
});
describe("getReadyTasks", () => {
    it("returns tasks with all deps completed, sorted by priority", () => {
        const tasks = [
            makeTask({ id: "A", status: "completed" }),
            makeTask({ id: "B", dependencies: ["A"], status: "pending", priority: "P3" }),
            makeTask({ id: "C", dependencies: ["A"], status: "pending", priority: "P1" }),
            makeTask({ id: "D", status: "pending", priority: "P2" }),
        ];
        const ready = getReadyTasks(tasks);
        expect(ready.map((t) => t.id)).toEqual(["C", "D", "B"]);
    });
    it("returns empty when nothing is ready", () => {
        const tasks = [
            makeTask({ id: "A", status: "pending" }),
            makeTask({ id: "B", dependencies: ["A"], status: "pending" }),
        ];
        // A has no deps so A is ready, but B is blocked
        const ready = getReadyTasks(tasks);
        expect(ready.map((t) => t.id)).toEqual(["A"]);
    });
    it("respects FIFO within same priority", () => {
        const tasks = [
            makeTask({ id: "A", priority: "P2", created_at: "2026-02-16T02:00:00Z" }),
            makeTask({ id: "B", priority: "P2", created_at: "2026-02-16T01:00:00Z" }),
        ];
        const ready = getReadyTasks(tasks);
        expect(ready.map((t) => t.id)).toEqual(["B", "A"]);
    });
});
//# sourceMappingURL=dag.test.js.map