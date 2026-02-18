import { z } from "zod";
export const TaskStatus = z.enum([
    "pending",
    "ready",
    "in_progress",
    "completed",
    "failed",
    "blocked",
]);
export const Priority = z.enum(["P1", "P2", "P3", "P4"]);
export const TaskSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable().default(null),
    status: TaskStatus.default("pending"),
    priority: Priority.default("P4"),
    dependencies: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    project: z.string().nullable().default(null),
    created_at: z.string(),
    started_at: z.string().nullable().default(null),
    completed_at: z.string().nullable().default(null),
    assignee: z.string().nullable().default(null),
    result: z.string().nullable().default(null),
    failure_reason: z.string().nullable().default(null),
});
export const ProjectSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string(),
});
export const TaskStoreSchema = z.object({
    tasks: z.array(TaskSchema),
    projects: z.array(ProjectSchema),
});
export const ok = (value) => ({ ok: true, value });
export const err = (error) => ({ ok: false, error });
//# sourceMappingURL=types.js.map