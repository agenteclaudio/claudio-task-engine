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
export const ExecutionMode = z.enum(["autonomous", "review_needed", "pair"]);
export const TaskType = z.enum(["research", "coding", "writing", "ops", "mixed"]);
export const EstimatedEffort = z.enum(["small", "medium", "large"]);
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
    execution_mode: ExecutionMode.nullable().default(null),
    task_type: TaskType.nullable().default(null),
    workdir: z.string().nullable().default(null),
    needs_research: z.boolean().default(false),
    estimated_effort: EstimatedEffort.nullable().default(null),
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