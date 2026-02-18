import { computeWaves } from "./dag.js";
export function planExecution(store, maxConcurrent) {
    const rawWaves = computeWaves(store.tasks);
    // Split waves that exceed maxConcurrent
    const waves = [];
    let waveNum = 1;
    for (const raw of rawWaves) {
        for (let i = 0; i < raw.tasks.length; i += maxConcurrent) {
            const chunk = raw.tasks.slice(i, i + maxConcurrent);
            waves.push({ waveNumber: waveNum++, tasks: chunk });
        }
    }
    const totalTasks = waves.reduce((sum, w) => sum + w.tasks.length, 0);
    const summary = `${totalTasks} tasks in ${waves.length} waves (max ${maxConcurrent} concurrent)`;
    return { waves, summary };
}
//# sourceMappingURL=executor.js.map