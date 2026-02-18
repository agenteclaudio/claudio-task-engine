#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { ok, err } from "./types.js";
import { loadStore, saveStore, addTask, updateTask, deleteTask } from "./store.js";
import { computeStatus, buildGraph } from "./dag.js";
import { planExecution } from "./executor.js";
import { generateKanban } from "./kanban.js";
import { sortByPriority } from "./priority.js";
const DEFAULT_STORE_PATH = process.env["CTE_STORE"] ?? path.join(import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname), "..", "data", "tasks.json");
function parseArgs(args) {
    const positional = [];
    const flags = {};
    let i = 0;
    while (i < args.length) {
        const arg = args[i];
        if (arg.startsWith("--")) {
            const key = arg.slice(2);
            const next = args[i + 1];
            if (next !== undefined && !next.startsWith("--")) {
                flags[key] = next;
                i += 2;
            }
            else {
                flags[key] = "true";
                i += 1;
            }
        }
        else {
            positional.push(arg);
            i += 1;
        }
    }
    return { positional, flags };
}
export function runCli(args, storePath) {
    const sp = storePath ?? DEFAULT_STORE_PATH;
    const { positional, flags } = parseArgs(args);
    const command = positional[0];
    if (!command) {
        return err("Usage: cte <command> [args]\nCommands: add, list, show, update, delete, graph, run, kanban, stats");
    }
    switch (command) {
        case "add":
            return cmdAdd(positional.slice(1), flags, sp);
        case "list":
            return cmdList(flags, sp);
        case "show":
            return cmdShow(positional[1], sp);
        case "update":
            return cmdUpdate(positional[1], flags, sp);
        case "delete":
            return cmdDelete(positional[1], sp);
        case "graph":
            return cmdGraph(sp);
        case "run":
            return cmdRun(flags, sp);
        case "kanban":
            return cmdKanban(flags, sp);
        case "stats":
            return cmdStats(sp);
        default:
            return err(`Unknown command: ${command}`);
    }
}
function cmdAdd(positional, flags, sp) {
    const title = positional[0];
    if (!title)
        return err("Usage: cte add <title> [--priority P1-P4] [--project X] [--tags a,b] [--deps id1,id2] [--description text]");
    const storeResult = loadStore(sp);
    if (!storeResult.ok)
        return storeResult;
    const input = { title };
    const priority = flags["priority"];
    if (priority)
        input.priority = priority;
    const project = flags["project"];
    if (project)
        input.project = project;
    const tags = flags["tags"];
    if (tags)
        input.tags = tags.split(",").map((s) => s.trim());
    const deps = flags["deps"];
    if (deps)
        input.dependencies = deps.split(",").map((s) => s.trim());
    const description = flags["description"];
    if (description)
        input.description = description;
    const result = addTask(storeResult.value, input);
    if (!result.ok)
        return result;
    const saveResult = saveStore(sp, result.value);
    if (!saveResult.ok)
        return saveResult;
    const newTask = result.value.tasks[result.value.tasks.length - 1];
    return ok(`Added ${newTask.id}: ${newTask.title}`);
}
function cmdList(flags, sp) {
    const storeResult = loadStore(sp);
    if (!storeResult.ok)
        return storeResult;
    let tasks = computeStatus(storeResult.value.tasks);
    const statusFilter = flags["status"];
    if (statusFilter) {
        tasks = tasks.filter((t) => t.status === statusFilter);
    }
    const projectFilter = flags["project"];
    if (projectFilter) {
        tasks = tasks.filter((t) => t.project === projectFilter);
    }
    const tagFilter = flags["tag"];
    if (tagFilter) {
        tasks = tasks.filter((t) => t.tags.includes(tagFilter));
    }
    if (tasks.length === 0)
        return ok("No tasks found.");
    const sorted = sortByPriority(tasks);
    const lines = sorted.map((t) => `${t.id}  [${t.priority}] [${t.status}]  ${t.title}${t.project ? `  (${t.project})` : ""}`);
    return ok(lines.join("\n"));
}
function cmdShow(id, sp) {
    if (!id)
        return err("Usage: cte show <id>");
    const storeResult = loadStore(sp);
    if (!storeResult.ok)
        return storeResult;
    const task = storeResult.value.tasks.find((t) => t.id === id);
    if (!task)
        return err(`Task ${id} not found`);
    const project = task.project
        ? storeResult.value.projects.find((p) => p.id === task.project)
        : null;
    const lines = [
        `ID:           ${task.id}`,
        `Title:        ${task.title}`,
        `Status:       ${task.status}`,
        `Priority:     ${task.priority}`,
        `Project:      ${project ? project.name : "none"} (${task.project ?? "none"})`,
        `Tags:         ${task.tags.length > 0 ? task.tags.join(", ") : "none"}`,
        `Dependencies: ${task.dependencies.length > 0 ? task.dependencies.join(", ") : "none"}`,
        `Created:      ${task.created_at}`,
        `Started:      ${task.started_at ?? "-"}`,
        `Completed:    ${task.completed_at ?? "-"}`,
        `Assignee:     ${task.assignee ?? "-"}`,
        `Description:  ${task.description ?? "-"}`,
        `Result:       ${task.result ?? "-"}`,
        `Failure:      ${task.failure_reason ?? "-"}`,
    ];
    return ok(lines.join("\n"));
}
function cmdUpdate(id, flags, sp) {
    if (!id)
        return err("Usage: cte update <id> [--status X] [--priority X] [--result text]");
    const storeResult = loadStore(sp);
    if (!storeResult.ok)
        return storeResult;
    const updates = {};
    const status = flags["status"];
    if (status)
        updates.status = status;
    const priority = flags["priority"];
    if (priority)
        updates.priority = priority;
    const resultFlag = flags["result"];
    if (resultFlag)
        updates.result = resultFlag;
    const failureReason = flags["failure_reason"];
    if (failureReason)
        updates.failure_reason = failureReason;
    const assignee = flags["assignee"];
    if (assignee)
        updates.assignee = assignee;
    const title = flags["title"];
    if (title)
        updates.title = title;
    const description = flags["description"];
    if (description)
        updates.description = description;
    const project = flags["project"];
    if (project)
        updates.project = project;
    const tagsStr = flags["tags"];
    if (tagsStr)
        updates.tags = tagsStr.split(",").map((s) => s.trim());
    const updateResult = updateTask(storeResult.value, id, updates);
    if (!updateResult.ok)
        return updateResult;
    const saveResult = saveStore(sp, updateResult.value);
    if (!saveResult.ok)
        return saveResult;
    return ok(`Updated ${id}`);
}
function cmdDelete(id, sp) {
    if (!id)
        return err("Usage: cte delete <id>");
    const storeResult = loadStore(sp);
    if (!storeResult.ok)
        return storeResult;
    const result = deleteTask(storeResult.value, id);
    if (!result.ok)
        return result;
    const saveResult = saveStore(sp, result.value);
    if (!saveResult.ok)
        return saveResult;
    return ok(`Deleted ${id}`);
}
function cmdGraph(sp) {
    const storeResult = loadStore(sp);
    if (!storeResult.ok)
        return storeResult;
    const tasks = storeResult.value.tasks;
    if (tasks.length === 0)
        return ok("No tasks.");
    const graph = buildGraph(tasks);
    const lines = [];
    const roots = tasks.filter((t) => t.dependencies.length === 0);
    const visited = new Set();
    function printTree(taskId, indent, isLast) {
        if (visited.has(taskId)) {
            lines.push(`${indent}${isLast ? "\u2514\u2500\u2500 " : "\u251C\u2500\u2500 "}${taskId} (circular ref)`);
            return;
        }
        visited.add(taskId);
        const task = tasks.find((t) => t.id === taskId);
        if (!task)
            return;
        const prefix = indent + (isLast ? "\u2514\u2500\u2500 " : "\u251C\u2500\u2500 ");
        const statusIcon = task.status === "completed" ? "\u2713" : task.status === "failed" ? "\u2717" : task.status === "in_progress" ? "\u2192" : "\u25CB";
        lines.push(`${prefix}${statusIcon} ${task.id}: ${task.title} [${task.priority}]`);
        const children = [...(graph.get(taskId) ?? [])];
        children.forEach((childId, i) => {
            const childIndent = indent + (isLast ? "    " : "\u2502   ");
            printTree(childId, childIndent, i === children.length - 1);
        });
    }
    roots.forEach((root, i) => {
        const isLast = i === roots.length - 1;
        const statusIcon = root.status === "completed" ? "\u2713" : root.status === "failed" ? "\u2717" : root.status === "in_progress" ? "\u2192" : "\u25CB";
        lines.push(`${isLast ? "\u2514\u2500\u2500 " : "\u251C\u2500\u2500 "}${statusIcon} ${root.id}: ${root.title} [${root.priority}]`);
        const children = [...(graph.get(root.id) ?? [])];
        children.forEach((childId, j) => {
            const childIndent = isLast ? "    " : "\u2502   ";
            printTree(childId, childIndent, j === children.length - 1);
        });
    });
    return ok(lines.join("\n"));
}
function cmdRun(flags, sp) {
    const storeResult = loadStore(sp);
    if (!storeResult.ok)
        return storeResult;
    const maxConcurrent = parseInt(flags["max-concurrent"] ?? "3", 10);
    const plan = planExecution(storeResult.value, maxConcurrent);
    if (plan.waves.length === 0)
        return ok("No tasks to execute.");
    const lines = [plan.summary, ""];
    for (const wave of plan.waves) {
        lines.push(`Wave ${wave.waveNumber}:`);
        for (const task of wave.tasks) {
            lines.push(`  [${task.priority}] ${task.id}: ${task.title}`);
        }
        lines.push("");
    }
    if (flags["dry-run"]) {
        lines.unshift("DRY RUN \u2014 execution plan:\n");
    }
    return ok(lines.join("\n").trim());
}
function cmdKanban(flags, sp) {
    const storeResult = loadStore(sp);
    if (!storeResult.ok)
        return storeResult;
    const html = generateKanban(storeResult.value);
    const outputPath = flags["output"] ?? path.join(path.dirname(sp), "..", "public", "kanban.html");
    try {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, html);
        return ok(`Kanban generated at ${outputPath}`);
    }
    catch (e) {
        return err(`Failed to write kanban: ${e.message}`);
    }
}
function cmdStats(sp) {
    const storeResult = loadStore(sp);
    if (!storeResult.ok)
        return storeResult;
    const tasks = computeStatus(storeResult.value.tasks);
    const counts = {};
    for (const t of tasks) {
        counts[t.status] = (counts[t.status] ?? 0) + 1;
    }
    const total = tasks.length;
    const lines = [
        `Total tasks: ${total}`,
        "",
        ...Object.entries(counts)
            .sort()
            .map(([status, count]) => `  ${status}: ${count}`),
        "",
        `By priority:`,
        ...["P1", "P2", "P3", "P4"].map((p) => `  ${p}: ${tasks.filter((t) => t.priority === p).length}`),
    ];
    return ok(lines.join("\n"));
}
// Run as CLI entry point
const isMainModule = process.argv[1] && (process.argv[1].endsWith("/cli.js") ||
    process.argv[1].endsWith("/cli.ts"));
if (isMainModule) {
    const result = runCli(process.argv.slice(2));
    if (result.ok) {
        console.log(result.value);
    }
    else {
        console.error(`Error: ${result.error}`);
        process.exit(1);
    }
}
//# sourceMappingURL=cli.js.map