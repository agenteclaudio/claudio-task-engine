import type { Task, Wave } from "./types.js";
/** Build adjacency list: taskId -> set of task IDs that depend on it */
export declare function buildGraph(tasks: Task[]): Map<string, Set<string>>;
/** Detect cycles using Kahn's algorithm. Returns true if cycle exists. */
export declare function detectCycle(tasks: Task[]): boolean;
/** Compute effective status for pending/blocked tasks based on dependencies */
export declare function computeStatus(tasks: Task[]): Task[];
/** Compute execution waves using topological sort (Kahn's). Skips completed tasks. */
export declare function computeWaves(tasks: Task[]): Wave[];
/** Get tasks ready to execute now: pending with all deps completed, sorted by priority */
export declare function getReadyTasks(tasks: Task[]): Task[];
