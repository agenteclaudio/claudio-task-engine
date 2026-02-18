#!/usr/bin/env node
import http from "node:http";
import { loadStore } from "./store.js";
import { generateKanban } from "./kanban.js";
import path from "node:path";
const PORT = parseInt(process.env["CTE_PORT"] ?? "8099", 10);
const BIND = process.env["CTE_BIND"] ?? "127.0.0.1";
const STORE_PATH = process.env["CTE_STORE"] ?? path.join(import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname), "..", "data", "tasks.json");
const server = http.createServer((_req, res) => {
    try {
        const result = loadStore(STORE_PATH);
        if (!result.ok)
            throw new Error(result.error);
        let html = generateKanban(result.value);
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(html);
    }
    catch (err) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
});
server.listen(PORT, BIND, () => {
    console.log(`CTE Kanban live at http://${BIND}:${PORT}`);
});
//# sourceMappingURL=server.js.map