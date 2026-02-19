import fs from "node:fs";
import path from "node:path";
import { TaskStoreSchema, type Task, type TaskStore, type Result, ok, err } from "./types.js";

export function loadStore(filePath: string): Result<TaskStore> {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const json = JSON.parse(raw);
    const parsed = TaskStoreSchema.safeParse(json);
    if (!parsed.success) {
      return err(`Invalid store schema: ${parsed.error.message}`);
    }
    return ok(parsed.data);
  } catch (e) {
    return err(`Failed to load store: ${(e as Error).message}`);
  }
}

export function saveStore(filePath: string, store: TaskStore): Result<void> {
  try {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    const tmpPath = filePath + ".tmp";
    fs.writeFileSync(tmpPath, JSON.stringify(store, null, 2));
    fs.renameSync(tmpPath, filePath);
    return ok(undefined);
  } catch (e) {
    return err(`Failed to save store: ${(e as Error).message}`);
  }
}

function nextId(tasks: Task[]): string {
  if (tasks.length === 0) return "task-001";
  const maxNum = Math.max(
    ...tasks.map((t) => {
      const m = t.id.match(/^task-(\d+)$/);
      return m ? parseInt(m[1]!, 10) : 0;
    })
  );
  return `task-${String(maxNum + 1).padStart(3, "0")}`;
}

function wouldCreateCycle(tasks: Task[], newTaskId: string, deps: string[]): boolean {
  const allTasks = [...tasks, { id: newTaskId, dependencies: deps } as Task];
  const adj = new Map<string, string[]>();
  for (const t of allTasks) {
    for (const dep of t.dependencies) {
      if (!adj.has(dep)) adj.set(dep, []);
      adj.get(dep)!.push(t.id);
    }
  }

  const visited = new Set<string>();
  const stack = [newTaskId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const next of adj.get(current) ?? []) {
      if (deps.includes(next)) return true;
      stack.push(next);
    }
  }
  return false;
}

export type AddTaskInput = {
  title: string;
  description?: string | null;
  priority?: "P1" | "P2" | "P3" | "P4";
  dependencies?: string[];
  tags?: string[];
  project?: string | null;
  execution_mode?: "autonomous" | "review_needed" | "pair" | null;
  task_type?: "research" | "coding" | "writing" | "ops" | "mixed" | null;
  workdir?: string | null;
  needs_research?: boolean;
  estimated_effort?: "small" | "medium" | "large" | null;
};

export function addTask(store: TaskStore, input: AddTaskInput): Result<TaskStore> {
  const deps = input.dependencies ?? [];

  for (const dep of deps) {
    if (!store.tasks.find((t) => t.id === dep)) {
      return err(`Dependency ${dep} does not exist`);
    }
  }

  const id = nextId(store.tasks);

  if (wouldCreateCycle(store.tasks, id, deps)) {
    return err("Adding this task would create a dependency cycle");
  }

  const task: Task = {
    id,
    title: input.title,
    description: input.description ?? null,
    status: "pending",
    priority: input.priority ?? "P4",
    dependencies: deps,
    tags: input.tags ?? [],
    project: input.project ?? null,
    created_at: new Date().toISOString(),
    started_at: null,
    completed_at: null,
    assignee: null,
    result: null,
    failure_reason: null,
    execution_mode: input.execution_mode ?? null,
    task_type: input.task_type ?? null,
    workdir: input.workdir ?? null,
    needs_research: input.needs_research ?? false,
    estimated_effort: input.estimated_effort ?? null,
  };

  return ok({ ...store, tasks: [...store.tasks, task] });
}

export type UpdateTaskInput = Partial<
  Pick<Task, "title" | "description" | "status" | "priority" | "tags" | "project" | "result" | "failure_reason" | "assignee" | "execution_mode" | "task_type" | "workdir" | "needs_research" | "estimated_effort">
>;

export function updateTask(store: TaskStore, id: string, updates: UpdateTaskInput): Result<TaskStore> {
  const idx = store.tasks.findIndex((t) => t.id === id);
  if (idx === -1) return err(`Task ${id} not found`);

  const existing = store.tasks[idx]!;
  const task: Task = {
    ...existing,
    ...updates,
  };

  if (updates.status === "in_progress" && !existing.started_at) {
    task.started_at = new Date().toISOString();
  }
  if (updates.status === "completed" && !existing.completed_at) {
    task.completed_at = new Date().toISOString();
  }

  const tasks = [...store.tasks];
  tasks[idx] = task;
  return ok({ ...store, tasks });
}

export function deleteTask(store: TaskStore, id: string): Result<TaskStore> {
  const idx = store.tasks.findIndex((t) => t.id === id);
  if (idx === -1) return err(`Task ${id} not found`);

  const tasks = store.tasks
    .filter((t) => t.id !== id)
    .map((t) => ({
      ...t,
      dependencies: t.dependencies.filter((d) => d !== id),
    }));

  return ok({ ...store, tasks });
}
