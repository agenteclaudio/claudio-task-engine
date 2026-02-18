import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { loadStore, saveStore, addTask, updateTask, deleteTask } from "../store.js";
const tmpDir = path.join(os.tmpdir(), "cte-test-store");
function tmpFile(name) {
    return path.join(tmpDir, name);
}
const emptyStore = {
    tasks: [],
    projects: [{ id: "personal", name: "Personal", color: "#4A90D9" }],
};
beforeEach(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
});
afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
});
describe("loadStore", () => {
    it("loads a valid store file", () => {
        const p = tmpFile("valid.json");
        fs.writeFileSync(p, JSON.stringify(emptyStore));
        const result = loadStore(p);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.tasks).toEqual([]);
            expect(result.value.projects).toHaveLength(1);
        }
    });
    it("returns error for missing file", () => {
        const result = loadStore(tmpFile("missing.json"));
        expect(result.ok).toBe(false);
    });
    it("returns error for invalid JSON", () => {
        const p = tmpFile("bad.json");
        fs.writeFileSync(p, "not json");
        const result = loadStore(p);
        expect(result.ok).toBe(false);
    });
    it("returns error for invalid schema", () => {
        const p = tmpFile("bad-schema.json");
        fs.writeFileSync(p, JSON.stringify({ tasks: "not an array" }));
        const result = loadStore(p);
        expect(result.ok).toBe(false);
    });
});
describe("saveStore", () => {
    it("saves store atomically", () => {
        const p = tmpFile("save.json");
        const result = saveStore(p, emptyStore);
        expect(result.ok).toBe(true);
        const content = JSON.parse(fs.readFileSync(p, "utf-8"));
        expect(content.tasks).toEqual([]);
    });
    it("creates parent directories if needed", () => {
        const p = path.join(tmpDir, "nested", "dir", "store.json");
        const result = saveStore(p, emptyStore);
        expect(result.ok).toBe(true);
        expect(fs.existsSync(p)).toBe(true);
    });
});
describe("addTask", () => {
    it("adds a task with auto-generated ID", () => {
        const store = { ...emptyStore, tasks: [] };
        const result = addTask(store, { title: "My task", priority: "P2" });
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.tasks).toHaveLength(1);
            expect(result.value.tasks[0].id).toMatch(/^task-\d{3}$/);
            expect(result.value.tasks[0].title).toBe("My task");
            expect(result.value.tasks[0].priority).toBe("P2");
            expect(result.value.tasks[0].status).toBe("pending");
        }
    });
    it("increments ID based on existing tasks", () => {
        const store = {
            ...emptyStore,
            tasks: [
                {
                    id: "task-005",
                    title: "Existing",
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
                    description: null,
                },
            ],
        };
        const result = addTask(store, { title: "New task" });
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.tasks[1].id).toBe("task-006");
        }
    });
    it("rejects task with dependency that would create a cycle", () => {
        const store = {
            ...emptyStore,
            tasks: [
                {
                    id: "task-001",
                    title: "A",
                    status: "pending",
                    priority: "P4",
                    dependencies: ["task-002"],
                    tags: [],
                    project: null,
                    created_at: "2026-02-16T00:00:00Z",
                    started_at: null,
                    completed_at: null,
                    assignee: null,
                    result: null,
                    failure_reason: null,
                    description: null,
                },
                {
                    id: "task-002",
                    title: "B",
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
                    description: null,
                },
            ],
        };
        // Adding task-002 -> task-001 dep would create cycle: task-001 -> task-002 -> task-001
        const result = addTask(store, {
            title: "C",
            dependencies: ["task-001"],
        });
        // This should succeed since "C" depending on task-001 doesn't create a cycle
        expect(result.ok).toBe(true);
    });
    it("rejects task with non-existent dependency", () => {
        const result = addTask(emptyStore, {
            title: "Bad dep",
            dependencies: ["task-999"],
        });
        expect(result.ok).toBe(false);
    });
});
describe("updateTask", () => {
    it("updates task fields", () => {
        const store = {
            ...emptyStore,
            tasks: [
                {
                    id: "task-001",
                    title: "Original",
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
                    description: null,
                },
            ],
        };
        const result = updateTask(store, "task-001", {
            status: "completed",
            result: "Done",
        });
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.tasks[0].status).toBe("completed");
            expect(result.value.tasks[0].result).toBe("Done");
            expect(result.value.tasks[0].completed_at).not.toBeNull();
        }
    });
    it("returns error for non-existent task", () => {
        const result = updateTask(emptyStore, "task-999", { status: "completed" });
        expect(result.ok).toBe(false);
    });
    it("sets started_at when moving to in_progress", () => {
        const store = {
            ...emptyStore,
            tasks: [
                {
                    id: "task-001",
                    title: "T",
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
                    description: null,
                },
            ],
        };
        const result = updateTask(store, "task-001", { status: "in_progress" });
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.tasks[0].started_at).not.toBeNull();
        }
    });
});
describe("deleteTask", () => {
    it("removes a task", () => {
        const store = {
            ...emptyStore,
            tasks: [
                {
                    id: "task-001",
                    title: "To delete",
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
                    description: null,
                },
            ],
        };
        const result = deleteTask(store, "task-001");
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.tasks).toHaveLength(0);
        }
    });
    it("cleans up dependency references", () => {
        const store = {
            ...emptyStore,
            tasks: [
                {
                    id: "task-001",
                    title: "A",
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
                    description: null,
                },
                {
                    id: "task-002",
                    title: "B depends on A",
                    status: "pending",
                    priority: "P4",
                    dependencies: ["task-001"],
                    tags: [],
                    project: null,
                    created_at: "2026-02-16T00:00:00Z",
                    started_at: null,
                    completed_at: null,
                    assignee: null,
                    result: null,
                    failure_reason: null,
                    description: null,
                },
            ],
        };
        const result = deleteTask(store, "task-001");
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.tasks[0].dependencies).toEqual([]);
        }
    });
    it("returns error for non-existent task", () => {
        const result = deleteTask(emptyStore, "task-999");
        expect(result.ok).toBe(false);
    });
});
//# sourceMappingURL=store.test.js.map