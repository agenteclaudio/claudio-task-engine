#!/usr/bin/env node
import http from "node:http";
import path from "node:path";
import { loadStore, saveStore, addTask, updateTask, deleteTask } from "./store.js";
import { generateKanban } from "./kanban.js";
import { computeStatus } from "./dag.js";
import { parseChatCommand, readOutbox, writeInbox, writeOutbox, clearOutbox } from "./chat.js";

const PORT = parseInt(process.env["CTE_PORT"] ?? "8099", 10);
const BIND_ADDRS = (process.env["CTE_BIND"] ?? "127.0.0.1,100.70.244.126")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const STORE_PATH = process.env["CTE_STORE"] ?? path.join(
  import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname),
  "..",
  "data",
  "tasks.json"
);

const DATA_DIR = path.dirname(STORE_PATH);
const CHAT_WEBHOOK_URL = process.env["CTE_CHAT_WEBHOOK_URL"] ?? "";
const CHAT_WEBHOOK_TOKEN = process.env["CTE_CHAT_WEBHOOK_TOKEN"] ?? "";

// --- Helpers ---

async function fireWebhook(message: string): Promise<void> {
  if (!CHAT_WEBHOOK_URL) return;
  try {
    const payload = JSON.stringify({
      message: `CTE Chat message from Pablo: "${message}"\n\nRespond via POST to http://127.0.0.1:8099/api/chat/reply with {"message": "your reply"}. Keep it conversational.`,
      name: "CTE-Chat",
      sessionKey: "hook:cte-chat",
      deliver: false,
    });
    const url = new URL(CHAT_WEBHOOK_URL);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Content-Length": String(Buffer.byteLength(payload)),
    };
    if (CHAT_WEBHOOK_TOKEN) {
      headers["Authorization"] = `Bearer ${CHAT_WEBHOOK_TOKEN}`;
    }
    const options = {
      method: "POST",
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname + url.search,
      headers,
    };
    const lib = url.protocol === "https:" ? await import("node:https") : await import("node:http");
    await new Promise<void>((resolve) => {
      const r = lib.request(options, (res) => { res.resume(); resolve(); });
      r.on("error", (e) => { console.error("Webhook error:", e.message); resolve(); });
      r.write(payload);
      r.end();
    });
  } catch (e) {
    console.error("Webhook fire error:", e);
  }
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}

function jsonResponse(res: http.ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(body);
}

function errorResponse(res: http.ServerResponse, status: number, message: string): void {
  jsonResponse(res, status, { error: message });
}

function setCorsHeaders(res: http.ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// --- Request handler ---

async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const method = req.method ?? "GET";
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const pathname = url.pathname;

  setCorsHeaders(res);

  // Handle CORS preflight
  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // GET / — HTML kanban
    if (method === "GET" && pathname === "/") {
      const result = loadStore(STORE_PATH);
      if (!result.ok) throw new Error(result.error);
      const html = generateKanban(result.value);
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(html);
      return;
    }

    // GET /api/tasks — list tasks and projects
    if (method === "GET" && pathname === "/api/tasks") {
      const result = loadStore(STORE_PATH);
      if (!result.ok) throw new Error(result.error);
      const store = result.value;
      jsonResponse(res, 200, { tasks: store.tasks, projects: store.projects });
      return;
    }

    // POST /api/tasks — create task
    if (method === "POST" && pathname === "/api/tasks") {
      const body = await readBody(req);
      const input = JSON.parse(body);

      const storeResult = loadStore(STORE_PATH);
      if (!storeResult.ok) throw new Error(storeResult.error);

      const addResult = addTask(storeResult.value, input);
      if (!addResult.ok) {
        errorResponse(res, 400, addResult.error);
        return;
      }

      const saveResult = saveStore(STORE_PATH, addResult.value);
      if (!saveResult.ok) throw new Error(saveResult.error);

      // The new task is the last one in the array
      const newTask = addResult.value.tasks[addResult.value.tasks.length - 1]!;
      jsonResponse(res, 201, newTask);
      return;
    }

    // PUT /api/tasks/:id — update task
    const putMatch = method === "PUT" && pathname.match(/^\/api\/tasks\/(.+)$/);
    if (putMatch) {
      const taskId = decodeURIComponent(putMatch[1]!);
      const body = await readBody(req);
      const updates = JSON.parse(body);

      const storeResult = loadStore(STORE_PATH);
      if (!storeResult.ok) throw new Error(storeResult.error);

      const updateResult = updateTask(storeResult.value, taskId, updates);
      if (!updateResult.ok) {
        errorResponse(res, 404, updateResult.error);
        return;
      }

      const saveResult = saveStore(STORE_PATH, updateResult.value);
      if (!saveResult.ok) throw new Error(saveResult.error);

      const updated = updateResult.value.tasks.find((t) => t.id === taskId)!;
      jsonResponse(res, 200, updated);
      return;
    }

    // DELETE /api/tasks/:id — delete task
    const deleteMatch = method === "DELETE" && pathname.match(/^\/api\/tasks\/(.+)$/);
    if (deleteMatch) {
      const taskId = decodeURIComponent(deleteMatch[1]!);

      const storeResult = loadStore(STORE_PATH);
      if (!storeResult.ok) throw new Error(storeResult.error);

      const deleteResult = deleteTask(storeResult.value, taskId);
      if (!deleteResult.ok) {
        errorResponse(res, 404, deleteResult.error);
        return;
      }

      const saveResult = saveStore(STORE_PATH, deleteResult.value);
      if (!saveResult.ok) throw new Error(saveResult.error);

      jsonResponse(res, 200, { deleted: taskId });
      return;
    }

    // POST /api/chat — receive chat message / command
    if (method === "POST" && pathname === "/api/chat") {
      const body = await readBody(req);
      const { message } = JSON.parse(body) as { message: string };

      if (!message || typeof message !== "string") {
        errorResponse(res, 400, "Missing 'message' field");
        return;
      }

      const parsed = parseChatCommand(message);

      if (parsed.type === "command") {
        const storeResult = loadStore(STORE_PATH);
        if (!storeResult.ok) throw new Error(storeResult.error);

        let result;
        if (parsed.action === "move") {
          result = updateTask(storeResult.value, parsed.taskId, { status: parsed.value as any });
        } else if (parsed.action === "priority") {
          result = updateTask(storeResult.value, parsed.taskId, { priority: parsed.value as any });
        } else if (parsed.action === "tag") {
          const task = storeResult.value.tasks.find((t) => t.id === parsed.taskId);
          if (!task) {
            errorResponse(res, 404, `Task ${parsed.taskId} not found`);
            return;
          }
          const newTags = task.tags.includes(parsed.value)
            ? task.tags
            : [...task.tags, parsed.value];
          result = updateTask(storeResult.value, parsed.taskId, { tags: newTags });
        } else {
          errorResponse(res, 400, `Unknown action: ${parsed.action}`);
          return;
        }

        if (!result!.ok) {
          errorResponse(res, 400, result!.error);
          return;
        }

        const saveResult = saveStore(STORE_PATH, result!.value);
        if (!saveResult.ok) throw new Error(saveResult.error);

        jsonResponse(res, 200, { type: "command", action: parsed.action, taskId: parsed.taskId, value: parsed.value, applied: true });
        return;
      }

      // It's a plain message — write to inbox and fire webhook
      const inboxResult = writeInbox(DATA_DIR, parsed.text);
      if (!inboxResult.ok) throw new Error(inboxResult.error);

      // Fire webhook asynchronously (don't block response)
      fireWebhook(parsed.text);

      jsonResponse(res, 200, { type: "message", text: parsed.text, queued: true });
      return;
    }

    // GET /api/chat — read outbox and clear
    if (method === "GET" && pathname === "/api/chat") {
      const outboxResult = readOutbox(DATA_DIR);
      if (!outboxResult.ok) throw new Error(outboxResult.error);

      const messages = outboxResult.value;
      const clearResult = clearOutbox(DATA_DIR);
      if (!clearResult.ok) throw new Error(clearResult.error);

      jsonResponse(res, 200, { messages });
      return;
    }

    // POST /api/chat/reply — OpenClaw posts a reply to show in UI
    if (method === "POST" && pathname === "/api/chat/reply") {
      const body = await readBody(req);
      const { message } = JSON.parse(body) as { message: string };

      if (!message || typeof message !== "string") {
        errorResponse(res, 400, "Missing 'message' field");
        return;
      }

      const outboxResult = writeOutbox(DATA_DIR, message);
      if (!outboxResult.ok) throw new Error(outboxResult.error);

      jsonResponse(res, 200, { type: "reply", text: message, queued: true });
      return;
    }

    // 404 — not found
    errorResponse(res, 404, "Not found");
  } catch (err) {
    console.error("Request error:", err);
    errorResponse(res, 500, err instanceof Error ? err.message : String(err));
  }
}

// --- Dual-bind startup ---

const servers: http.Server[] = [];

for (const addr of BIND_ADDRS) {
  const server = http.createServer(handleRequest);

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRNOTAVAIL") {
      console.warn(`Warning: cannot bind to ${addr}:${PORT} (EADDRNOTAVAIL) — skipping`);
    } else {
      console.error(`Error binding to ${addr}:${PORT}:`, err.message);
    }
  });

  server.listen(PORT, addr, () => {
    console.log(`CTE listening on http://${addr}:${PORT}`);
  });

  servers.push(server);
}

if (BIND_ADDRS.length === 0) {
  console.error("No bind addresses configured. Set CTE_BIND or use defaults.");
  process.exit(1);
}
