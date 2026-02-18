import { describe, it, expect } from "vitest";
import { planExecution } from "../executor.js";
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
function makeStore(tasks) {
    return {
        tasks,
        projects: [{ id: "personal", name: "Personal", color: "#4A90D9" }],
    };
}
describe("planExecution", () => {
    it("returns empty plan for empty store", () => {
        const plan = planExecution(makeStore([]), 3);
        expect(plan.waves).toHaveLength(0);
        expect(plan.summary).toContain("0");
    });
    it("plans waves for simple chain", () => {
        const store = makeStore([
            makeTask({ id: "A" }),
            makeTask({ id: "B", dependencies: ["A"] }),
            makeTask({ id: "C", dependencies: ["B"] }),
        ]);
        const plan = planExecution(store, 3);
        expect(plan.waves).toHaveLength(3);
        expect(plan.waves[0].tasks.map((t) => t.id)).toEqual(["A"]);
        expect(plan.waves[1].tasks.map((t) => t.id)).toEqual(["B"]);
        expect(plan.waves[2].tasks.map((t) => t.id)).toEqual(["C"]);
    });
    it("respects maxConcurrent limit", () => {
        const store = makeStore([
            makeTask({ id: "A" }),
            makeTask({ id: "B" }),
            makeTask({ id: "C" }),
            makeTask({ id: "D" }),
            makeTask({ id: "E" }),
        ]);
        const plan = planExecution(store, 2);
        // All 5 tasks are independent, but max 2 per wave
        for (const wave of plan.waves) {
            expect(wave.tasks.length).toBeLessThanOrEqual(2);
        }
        const allTasks = plan.waves.flatMap((w) => w.tasks);
        expect(allTasks).toHaveLength(5);
    });
    it("skips completed tasks", () => {
        const store = makeStore([
            makeTask({ id: "A", status: "completed" }),
            makeTask({ id: "B", dependencies: ["A"] }),
        ]);
        const plan = planExecution(store, 3);
        expect(plan.waves).toHaveLength(1);
        expect(plan.waves[0].tasks[0].id).toBe("B");
    });
    it("produces a summary string", () => {
        const store = makeStore([
            makeTask({ id: "A", priority: "P1" }),
            makeTask({ id: "B", priority: "P2", dependencies: ["A"] }),
        ]);
        const plan = planExecution(store, 3);
        expect(plan.summary).toContain("2 tasks");
        expect(plan.summary).toContain("2 waves");
    });
    it("sorts tasks within waves by priority", () => {
        const store = makeStore([
            makeTask({ id: "A", priority: "P3" }),
            makeTask({ id: "B", priority: "P1" }),
            makeTask({ id: "C", priority: "P2" }),
        ]);
        const plan = planExecution(store, 3);
        expect(plan.waves[0].tasks.map((t) => t.id)).toEqual(["B", "C", "A"]);
    });
});
//# sourceMappingURL=executor.test.js.map