import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { runCli } from "../cli.js";
import type { TaskStore } from "../types.js";

const tmpDir = path.join(os.tmpdir(), "cte-test-cli");

function storePath(): string {
  return path.join(tmpDir, "tasks.json");
}

const emptyStore: TaskStore = {
  tasks: [],
  projects: [
    { id: "personal", name: "Personal", color: "#4A90D9" },
    { id: "negocio", name: "Negocio IA", color: "#D94A4A" },
  ],
};

beforeEach(() => {
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.writeFileSync(storePath(), JSON.stringify(emptyStore));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("CLI: add", () => {
  it("adds a task", () => {
    const result = runCli(["add", "My first task", "--priority", "P2", "--project", "personal"], storePath());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toContain("task-001");
    }
    const store = JSON.parse(fs.readFileSync(storePath(), "utf-8"));
    expect(store.tasks).toHaveLength(1);
    expect(store.tasks[0].title).toBe("My first task");
    expect(store.tasks[0].priority).toBe("P2");
  });

  it("adds a task with tags and deps", () => {
    // First add a prerequisite task
    runCli(["add", "Prereq"], storePath());
    const result = runCli(
      ["add", "Dependent task", "--tags", "research,health", "--deps", "task-001"],
      storePath()
    );
    expect(result.ok).toBe(true);
    const store = JSON.parse(fs.readFileSync(storePath(), "utf-8"));
    expect(store.tasks[1].tags).toEqual(["research", "health"]);
    expect(store.tasks[1].dependencies).toEqual(["task-001"]);
  });

  it("adds a task with description", () => {
    const result = runCli(
      ["add", "Task with desc", "--description", "This is a detailed description"],
      storePath()
    );
    expect(result.ok).toBe(true);
    const store = JSON.parse(fs.readFileSync(storePath(), "utf-8"));
    expect(store.tasks[0].description).toBe("This is a detailed description");
  });
});

describe("CLI: list", () => {
  it("lists tasks", () => {
    runCli(["add", "Task A", "--priority", "P1"], storePath());
    runCli(["add", "Task B", "--priority", "P3"], storePath());
    const result = runCli(["list"], storePath());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toContain("Task A");
      expect(result.value).toContain("Task B");
    }
  });

  it("filters by status", () => {
    runCli(["add", "Task A"], storePath());
    runCli(["update", "task-001", "--status", "completed"], storePath());
    runCli(["add", "Task B"], storePath());
    const result = runCli(["list", "--status", "completed"], storePath());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toContain("Task A");
      expect(result.value).not.toContain("Task B");
    }
  });

  it("filters by project", () => {
    runCli(["add", "Personal task", "--project", "personal"], storePath());
    runCli(["add", "Other task", "--project", "negocio"], storePath());
    const result = runCli(["list", "--project", "personal"], storePath());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toContain("Personal task");
      expect(result.value).not.toContain("Other task");
    }
  });

  it("filters by tag", () => {
    runCli(["add", "Research task", "--tags", "research"], storePath());
    runCli(["add", "Coding task", "--tags", "coding"], storePath());
    const result = runCli(["list", "--tag", "research"], storePath());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toContain("Research task");
      expect(result.value).not.toContain("Coding task");
    }
  });
});

describe("CLI: show", () => {
  it("shows task details", () => {
    runCli(["add", "Detailed task", "--priority", "P1", "--project", "personal", "--tags", "research"], storePath());
    const result = runCli(["show", "task-001"], storePath());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toContain("Detailed task");
      expect(result.value).toContain("P1");
      expect(result.value).toContain("personal");
    }
  });

  it("returns error for unknown task", () => {
    const result = runCli(["show", "task-999"], storePath());
    expect(result.ok).toBe(false);
  });
});

describe("CLI: update", () => {
  it("updates task status", () => {
    runCli(["add", "Task"], storePath());
    const result = runCli(["update", "task-001", "--status", "completed", "--result", "Done!"], storePath());
    expect(result.ok).toBe(true);
    const store = JSON.parse(fs.readFileSync(storePath(), "utf-8"));
    expect(store.tasks[0].status).toBe("completed");
    expect(store.tasks[0].result).toBe("Done!");
  });

  it("updates task priority", () => {
    runCli(["add", "Task"], storePath());
    runCli(["update", "task-001", "--priority", "P1"], storePath());
    const store = JSON.parse(fs.readFileSync(storePath(), "utf-8"));
    expect(store.tasks[0].priority).toBe("P1");
  });
});

describe("CLI: delete", () => {
  it("deletes a task", () => {
    runCli(["add", "To delete"], storePath());
    const result = runCli(["delete", "task-001"], storePath());
    expect(result.ok).toBe(true);
    const store = JSON.parse(fs.readFileSync(storePath(), "utf-8"));
    expect(store.tasks).toHaveLength(0);
  });
});

describe("CLI: graph", () => {
  it("prints dependency graph", () => {
    runCli(["add", "Root task"], storePath());
    runCli(["add", "Child task", "--deps", "task-001"], storePath());
    const result = runCli(["graph"], storePath());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toContain("Root task");
      expect(result.value).toContain("Child task");
    }
  });
});

describe("CLI: run", () => {
  it("shows execution plan in dry-run", () => {
    runCli(["add", "Task A", "--priority", "P1"], storePath());
    runCli(["add", "Task B", "--priority", "P2", "--deps", "task-001"], storePath());
    const result = runCli(["run", "--dry-run"], storePath());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toContain("Wave");
      expect(result.value).toContain("Task A");
    }
  });

  it("respects max-concurrent flag", () => {
    runCli(["add", "A"], storePath());
    runCli(["add", "B"], storePath());
    runCli(["add", "C"], storePath());
    const result = runCli(["run", "--dry-run", "--max-concurrent", "1"], storePath());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toContain("Wave 1");
      expect(result.value).toContain("Wave 2");
      expect(result.value).toContain("Wave 3");
    }
  });
});

describe("CLI: kanban", () => {
  it("generates kanban HTML", () => {
    runCli(["add", "Task A"], storePath());
    const outputPath = path.join(tmpDir, "kanban.html");
    const result = runCli(["kanban", "--output", outputPath], storePath());
    expect(result.ok).toBe(true);
    expect(fs.existsSync(outputPath)).toBe(true);
    const html = fs.readFileSync(outputPath, "utf-8");
    expect(html).toContain("Task A");
  });
});

describe("CLI: stats", () => {
  it("shows stats summary", () => {
    runCli(["add", "A", "--priority", "P1"], storePath());
    runCli(["add", "B", "--priority", "P2"], storePath());
    runCli(["update", "task-001", "--status", "completed"], storePath());
    const result = runCli(["stats"], storePath());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toContain("completed");
      expect(result.value).toContain("Total tasks: 2");
    }
  });
});

describe("CLI: error handling", () => {
  it("returns error for unknown command", () => {
    const result = runCli(["unknown"], storePath());
    expect(result.ok).toBe(false);
  });

  it("returns error for missing command", () => {
    const result = runCli([], storePath());
    expect(result.ok).toBe(false);
  });
});
