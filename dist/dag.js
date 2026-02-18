import { sortByPriority } from "./priority.js";
/** Build adjacency list: taskId -> set of task IDs that depend on it */
export function buildGraph(tasks) {
    const graph = new Map();
    for (const t of tasks) {
        if (!graph.has(t.id))
            graph.set(t.id, new Set());
        for (const dep of t.dependencies) {
            if (!graph.has(dep))
                graph.set(dep, new Set());
            graph.get(dep).add(t.id);
        }
    }
    return graph;
}
/** Detect cycles using Kahn's algorithm. Returns true if cycle exists. */
export function detectCycle(tasks) {
    if (tasks.length === 0)
        return false;
    // Compute in-degrees
    const inDegree = new Map();
    const adj = new Map();
    for (const t of tasks) {
        inDegree.set(t.id, t.dependencies.filter((d) => tasks.some((t2) => t2.id === d)).length);
        if (!adj.has(t.id))
            adj.set(t.id, []);
    }
    for (const t of tasks) {
        for (const dep of t.dependencies) {
            if (adj.has(dep)) {
                adj.get(dep).push(t.id);
            }
        }
    }
    const queue = [];
    for (const [id, deg] of inDegree) {
        if (deg === 0)
            queue.push(id);
    }
    let processed = 0;
    while (queue.length > 0) {
        const current = queue.shift();
        processed++;
        for (const next of adj.get(current) ?? []) {
            const newDeg = inDegree.get(next) - 1;
            inDegree.set(next, newDeg);
            if (newDeg === 0)
                queue.push(next);
        }
    }
    return processed < tasks.length;
}
/** Compute effective status for pending/blocked tasks based on dependencies */
export function computeStatus(tasks) {
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    return tasks.map((t) => {
        // Don't touch completed, in_progress, or failed
        if (t.status === "completed" || t.status === "in_progress" || t.status === "failed") {
            return t;
        }
        // For pending/blocked/ready tasks, recompute
        if (t.dependencies.length === 0) {
            return { ...t, status: "ready" };
        }
        const allDepsCompleted = t.dependencies.every((depId) => {
            const dep = taskMap.get(depId);
            return dep?.status === "completed";
        });
        if (allDepsCompleted) {
            return { ...t, status: "ready" };
        }
        return { ...t, status: "blocked" };
    });
}
/** Compute execution waves using topological sort (Kahn's). Skips completed tasks. */
export function computeWaves(tasks) {
    // Only consider non-completed, non-failed tasks
    const remaining = tasks.filter((t) => t.status !== "completed" && t.status !== "failed" && t.status !== "in_progress");
    if (remaining.length === 0)
        return [];
    const completedIds = new Set(tasks.filter((t) => t.status === "completed").map((t) => t.id));
    const remainingIds = new Set(remaining.map((t) => t.id));
    // Compute in-degree counting only remaining dependencies
    const inDegree = new Map();
    const adj = new Map();
    for (const t of remaining) {
        const activeDeps = t.dependencies.filter((d) => remainingIds.has(d));
        inDegree.set(t.id, activeDeps.length);
        if (!adj.has(t.id))
            adj.set(t.id, []);
    }
    for (const t of remaining) {
        for (const dep of t.dependencies) {
            if (remainingIds.has(dep)) {
                if (!adj.has(dep))
                    adj.set(dep, []);
                adj.get(dep).push(t.id);
            }
        }
    }
    const waves = [];
    let waveNum = 1;
    const processed = new Set();
    while (processed.size < remaining.length) {
        const waveTasks = [];
        for (const t of remaining) {
            if (processed.has(t.id))
                continue;
            if (inDegree.get(t.id) === 0) {
                waveTasks.push(t);
            }
        }
        if (waveTasks.length === 0)
            break; // Remaining tasks have cycles or unmet deps
        const sorted = sortByPriority(waveTasks);
        waves.push({ waveNumber: waveNum++, tasks: sorted });
        for (const t of waveTasks) {
            processed.add(t.id);
            for (const next of adj.get(t.id) ?? []) {
                inDegree.set(next, inDegree.get(next) - 1);
            }
        }
    }
    return waves;
}
/** Get tasks ready to execute now: pending with all deps completed, sorted by priority */
export function getReadyTasks(tasks) {
    const updated = computeStatus(tasks);
    const ready = updated.filter((t) => t.status === "ready");
    return sortByPriority(ready);
}
//# sourceMappingURL=dag.js.map