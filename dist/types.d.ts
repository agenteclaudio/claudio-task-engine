import { z } from "zod";
export declare const TaskStatus: z.ZodEnum<{
    pending: "pending";
    ready: "ready";
    in_progress: "in_progress";
    completed: "completed";
    failed: "failed";
    blocked: "blocked";
}>;
export type TaskStatus = z.infer<typeof TaskStatus>;
export declare const Priority: z.ZodEnum<{
    P1: "P1";
    P2: "P2";
    P3: "P3";
    P4: "P4";
}>;
export type Priority = z.infer<typeof Priority>;
export declare const TaskSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    status: z.ZodDefault<z.ZodEnum<{
        pending: "pending";
        ready: "ready";
        in_progress: "in_progress";
        completed: "completed";
        failed: "failed";
        blocked: "blocked";
    }>>;
    priority: z.ZodDefault<z.ZodEnum<{
        P1: "P1";
        P2: "P2";
        P3: "P3";
        P4: "P4";
    }>>;
    dependencies: z.ZodDefault<z.ZodArray<z.ZodString>>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString>>;
    project: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    created_at: z.ZodString;
    started_at: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    completed_at: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    assignee: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    result: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    failure_reason: z.ZodDefault<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type Task = z.infer<typeof TaskSchema>;
export declare const ProjectSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    color: z.ZodString;
}, z.core.$strip>;
export type Project = z.infer<typeof ProjectSchema>;
export declare const TaskStoreSchema: z.ZodObject<{
    tasks: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        description: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        status: z.ZodDefault<z.ZodEnum<{
            pending: "pending";
            ready: "ready";
            in_progress: "in_progress";
            completed: "completed";
            failed: "failed";
            blocked: "blocked";
        }>>;
        priority: z.ZodDefault<z.ZodEnum<{
            P1: "P1";
            P2: "P2";
            P3: "P3";
            P4: "P4";
        }>>;
        dependencies: z.ZodDefault<z.ZodArray<z.ZodString>>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString>>;
        project: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        created_at: z.ZodString;
        started_at: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        completed_at: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        assignee: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        result: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        failure_reason: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    projects: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        color: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type TaskStore = z.infer<typeof TaskStoreSchema>;
export type Wave = {
    waveNumber: number;
    tasks: Task[];
};
export type ExecutionPlan = {
    waves: Wave[];
    summary: string;
};
export type Result<T, E = string> = {
    ok: true;
    value: T;
} | {
    ok: false;
    error: E;
};
export declare const ok: <T>(value: T) => Result<T, never>;
export declare const err: <E>(error: E) => Result<never, E>;
