import { z } from "zod";

export const TaskStatus = z.enum([
  "pending",
  "ready",
  "in_progress",
  "in_review",
  "completed",
  "failed",
  "blocked",
  "waiting_for_input",
]);
export type TaskStatus = z.infer<typeof TaskStatus>;

export const Priority = z.enum(["P1", "P2", "P3", "P4"]);
export type Priority = z.infer<typeof Priority>;

export const ExecutionMode = z.enum(["autonomous", "review_needed", "pair", "collaborative"]);
export type ExecutionMode = z.infer<typeof ExecutionMode>;

export const TaskType = z.enum(["research", "coding", "writing", "ops", "mixed"]);
export type TaskType = z.infer<typeof TaskType>;

export const EstimatedEffort = z.enum(["small", "medium", "large"]);
export type EstimatedEffort = z.infer<typeof EstimatedEffort>;

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
export type Task = z.infer<typeof TaskSchema>;

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const TaskStoreSchema = z.object({
  tasks: z.array(TaskSchema),
  projects: z.array(ProjectSchema),
});
export type TaskStore = z.infer<typeof TaskStoreSchema>;

export type Wave = {
  waveNumber: number;
  tasks: Task[];
};

export type ExecutionPlan = {
  waves: Wave[];
  summary: string;
};

export type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export const TAG_CATEGORIES = {
  area: ['openclaw', 'cte', 'negocio', 'universidad', 'personal', 'infra'],
  type: ['research', 'implementation', 'fix', 'improvement', 'exploration'],
  tool: ['cc', 'browser', 'night-worker', 'mem0', 'tts'],
} as const;

export type TagCategory = keyof typeof TAG_CATEGORIES | "other";

export const ALL_TAGS = new Set(
  Object.values(TAG_CATEGORIES).flatMap((tags) => [...tags])
);

export function categorizeTag(tag: string): TagCategory {
  for (const [category, tags] of Object.entries(TAG_CATEGORIES)) {
    if ((tags as readonly string[]).includes(tag)) {
      return category as keyof typeof TAG_CATEGORIES;
    }
  }
  return "other";
}
