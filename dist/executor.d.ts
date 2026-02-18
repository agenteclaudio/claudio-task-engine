import type { TaskStore, ExecutionPlan } from "./types.js";
export declare function planExecution(store: TaskStore, maxConcurrent: number): ExecutionPlan;
