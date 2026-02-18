import { type Task, type TaskStore, type Result } from "./types.js";
export declare function loadStore(filePath: string): Result<TaskStore>;
export declare function saveStore(filePath: string, store: TaskStore): Result<void>;
export type AddTaskInput = {
    title: string;
    description?: string | null;
    priority?: "P1" | "P2" | "P3" | "P4";
    dependencies?: string[];
    tags?: string[];
    project?: string | null;
};
export declare function addTask(store: TaskStore, input: AddTaskInput): Result<TaskStore>;
export type UpdateTaskInput = Partial<Pick<Task, "title" | "description" | "status" | "priority" | "tags" | "project" | "result" | "failure_reason" | "assignee">>;
export declare function updateTask(store: TaskStore, id: string, updates: UpdateTaskInput): Result<TaskStore>;
export declare function deleteTask(store: TaskStore, id: string): Result<TaskStore>;
