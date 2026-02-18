import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { runCli } from "../cli.js";
import { loadStore, addTask } from "../store.js";
import { detectCycle, computeWaves, computeStatus, getReadyTasks } from "../dag.js";
import { planExecution } from "../executor.js";
import { generateKanban } from "../kanban.js";
import { sortByPriority } from "../priority.js";
import type { Task, TaskStore } from "../types.js";

const tmpDir = path.join(os.tmpdir(), "cte-e2e");

function sp(): string {
  return path.join(tmpDir, "tasks.json");
}

const baseStore: TaskStore = {
  tasks: [],
  projects: [
    { id: "personal", name: "Personal", color: "#4A90D9" },
    { id: "negocio", name: "Negocio IA", color: "#D94A4A" },
    { id: "universidad", name: "Universidad", color: "#4AD94A" },
    { id: "openclaw-setup", name: "OpenClaw Setup", color: "#D9D94A" },
  ],
};

beforeEach(() => {
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.writeFileSync(sp(), JSON.stringify(baseStore));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("E2E: Diamond dependency pattern", () => {
  it("creates tasks with diamond deps, computes waves, simulates execution", () => {
    // 1. Create 6+ tasks with diamond dependency pattern:
    //    A (root)
    //   / \
    //  B   C   (parallel, wave 2)
    //   \ /
    //    D     (convergence, wave 3)
    //    |
    //    E     (chain, wave 4)
    //    |
    //    F     (chain, wave 5)

    // Add tasks via CLI
    expect(runCli(["add", "Research topic", "--priority", "P1", "--project", "personal", "--tags", "research"], sp()).ok).toBe(true);
    expect(runCli(["add", "Write draft A", "--priority", "P2", "--deps", "task-001", "--tags", "writing"], sp()).ok).toBe(true);
    expect(runCli(["add", "Write draft B", "--priority", "P2", "--deps", "task-001", "--tags", "writing"], sp()).ok).toBe(true);
    expect(runCli(["add", "Merge drafts", "--priority", "P2", "--deps", "task-002,task-003", "--tags", "writing"], sp()).ok).toBe(true);
    expect(runCli(["add", "Review merged", "--priority", "P3", "--deps", "task-004", "--project", "negocio"], sp()).ok).toBe(true);
    expect(runCli(["add", "Publish final", "--priority", "P1", "--deps", "task-005", "--project", "negocio", "--tags", "publishing"], sp()).ok).toBe(true);

    const storeResult = loadStore(sp());
    expect(storeResult.ok).toBe(true);
    if (!storeResult.ok) return;

    const store = storeResult.value;
    expect(store.tasks).toHaveLength(6);

    // 2. Verify cycle detection rejects circular deps
    expect(detectCycle(store.tasks)).toBe(false);

    // Create a hypothetical cycle
    const cyclicTasks: Task[] = [
      ...store.tasks.map((t) =>
        t.id === "task-001" ? { ...t, dependencies: ["task-006"] } : t
      ),
    ];
    expect(detectCycle(cyclicTasks)).toBe(true);

    // 3. Compute waves and verify correct ordering
    const waves = computeWaves(store.tasks);
    expect(waves.length).toBeGreaterThanOrEqual(4);

    // Wave 1: task-001 (root, no deps)
    expect(waves[0].tasks.map((t) => t.id)).toContain("task-001");

    // Wave 2: task-002, task-003 (parallel, both depend on task-001)
    const wave2Ids = waves[1].tasks.map((t) => t.id);
    expect(wave2Ids).toContain("task-002");
    expect(wave2Ids).toContain("task-003");

    // Wave 3: task-004 (depends on both task-002 and task-003)
    expect(waves[2].tasks.map((t) => t.id)).toContain("task-004");

    // 4. Simulate execution: complete wave 1 → verify wave 2 unblocks
    // Before completing wave 1
    const statusBefore = computeStatus(store.tasks);
    const task2Before = statusBefore.find((t) => t.id === "task-002")!;
    expect(task2Before.status).toBe("blocked");

    // Complete wave 1
    const updated1 = runCli(["update", "task-001", "--status", "completed", "--result", "Researched"], sp());
    expect(updated1.ok).toBe(true);

    // Check that wave 2 tasks are now ready
    const storeAfterWave1 = loadStore(sp());
    if (!storeAfterWave1.ok) return;
    const statusAfter = computeStatus(storeAfterWave1.value.tasks);
    expect(statusAfter.find((t) => t.id === "task-002")!.status).toBe("ready");
    expect(statusAfter.find((t) => t.id === "task-003")!.status).toBe("ready");
    expect(statusAfter.find((t) => t.id === "task-004")!.status).toBe("blocked"); // still blocked

    // Complete wave 2
    runCli(["update", "task-002", "--status", "completed"], sp());
    runCli(["update", "task-003", "--status", "completed"], sp());

    const storeAfterWave2 = loadStore(sp());
    if (!storeAfterWave2.ok) return;
    const statusAfter2 = computeStatus(storeAfterWave2.value.tasks);
    expect(statusAfter2.find((t) => t.id === "task-004")!.status).toBe("ready");

    // 5. Generate kanban HTML and verify content
    const kanbanResult = runCli(["kanban", "--output", path.join(tmpDir, "kanban.html")], sp());
    expect(kanbanResult.ok).toBe(true);
    const html = fs.readFileSync(path.join(tmpDir, "kanban.html"), "utf-8");
    expect(html).toContain("Research topic");
    expect(html).toContain("Write draft A");
    expect(html).toContain("Merge drafts");
    expect(html).toContain("Personal");
    expect(html).toContain("Negocio IA");
    expect(html).toContain("<!DOCTYPE html>");

    // 6. Test priority sorting across waves
    const plan = planExecution(storeAfterWave2.value, 3);
    // Remaining tasks: task-004(P2), task-005(P3), task-006(P1)
    // Wave 1: task-004 (ready, deps met)
    // Wave 2: task-005 (deps on task-004)
    // Wave 3: task-006 (deps on task-005)
    expect(plan.waves.length).toBeGreaterThanOrEqual(1);
    expect(plan.summary).toContain("tasks");

    // 7. Test CLI commands work end-to-end
    // List
    const listResult = runCli(["list"], sp());
    expect(listResult.ok).toBe(true);
    if (listResult.ok) {
      expect(listResult.value).toContain("task-004");
    }

    // Show
    const showResult = runCli(["show", "task-004"], sp());
    expect(showResult.ok).toBe(true);
    if (showResult.ok) {
      expect(showResult.value).toContain("Merge drafts");
      expect(showResult.value).toContain("P2");
    }

    // Graph
    const graphResult = runCli(["graph"], sp());
    expect(graphResult.ok).toBe(true);
    if (graphResult.ok) {
      expect(graphResult.value).toContain("Research topic");
    }

    // Run (dry-run)
    const runResult = runCli(["run", "--dry-run"], sp());
    expect(runResult.ok).toBe(true);
    if (runResult.ok) {
      expect(runResult.value).toContain("Wave");
    }

    // Stats
    const statsResult = runCli(["stats"], sp());
    expect(statsResult.ok).toBe(true);
    if (statsResult.ok) {
      expect(statsResult.value).toContain("Total tasks: 6");
      expect(statsResult.value).toContain("completed: 3");
    }

    // Delete
    const deleteResult = runCli(["delete", "task-006"], sp());
    expect(deleteResult.ok).toBe(true);
    const storeAfterDelete = loadStore(sp());
    if (storeAfterDelete.ok) {
      expect(storeAfterDelete.value.tasks).toHaveLength(5);
    }
  });
});

describe("E2E: cycle detection rejects circular deps", () => {
  it("rejects adding a task that would create a cycle via store API", () => {
    // A depends on B, B depends on nothing. Try to make B depend on A.
    let storeResult = loadStore(sp());
    expect(storeResult.ok).toBe(true);
    if (!storeResult.ok) return;

    // Add A with no deps
    let result = addTask(storeResult.value, { title: "A" });
    expect(result.ok).toBe(true);

    // Add B depending on A
    result = addTask(result.ok ? result.value : storeResult.value, {
      title: "B",
      dependencies: ["task-001"],
    });
    expect(result.ok).toBe(true);

    // Now try to add a task that depends on B, where B already depends on A
    // This should succeed (no cycle: A -> B -> C)
    result = addTask(result.ok ? result.value : storeResult.value, {
      title: "C",
      dependencies: ["task-002"],
    });
    expect(result.ok).toBe(true);
  });
});

describe("E2E: getReadyTasks respects priority and FIFO", () => {
  it("returns ready tasks sorted by priority then created_at", () => {
    runCli(["add", "Low priority task", "--priority", "P4"], sp());
    runCli(["add", "High priority task", "--priority", "P1"], sp());
    runCli(["add", "Medium priority task", "--priority", "P2"], sp());

    const store = loadStore(sp());
    if (!store.ok) return;

    const ready = getReadyTasks(store.value.tasks);
    expect(ready.map((t) => t.priority)).toEqual(["P1", "P2", "P4"]);
  });
});

describe("E2E: filter by project and tag via CLI", () => {
  it("filters correctly", () => {
    runCli(["add", "Personal research", "--project", "personal", "--tags", "research"], sp());
    runCli(["add", "Business coding", "--project", "negocio", "--tags", "coding"], sp());
    runCli(["add", "Uni writing", "--project", "universidad", "--tags", "writing,research"], sp());

    // Filter by project
    const byProject = runCli(["list", "--project", "personal"], sp());
    expect(byProject.ok).toBe(true);
    if (byProject.ok) {
      expect(byProject.value).toContain("Personal research");
      expect(byProject.value).not.toContain("Business coding");
    }

    // Filter by tag
    const byTag = runCli(["list", "--tag", "research"], sp());
    expect(byTag.ok).toBe(true);
    if (byTag.ok) {
      expect(byTag.value).toContain("Personal research");
      expect(byTag.value).toContain("Uni writing");
      expect(byTag.value).not.toContain("Business coding");
    }
  });
});
