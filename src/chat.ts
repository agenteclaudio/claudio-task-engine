import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Result } from "./types.js";
import { ok, err } from "./types.js";

// --- Types ---

export type ChatCommand = {
  type: "command";
  action: "move" | "priority" | "tag";
  taskId: string;
  value: string;
};

export type ChatMessage = {
  type: "message";
  text: string;
};

export type ChatResult = ChatCommand | ChatMessage;

export type InboxEntry = {
  timestamp: string;
  message: string;
};

export type OutboxEntry = {
  timestamp: string;
  message: string;
};

// --- Command parsing ---

const COMMAND_ACTIONS = new Set(["move", "priority", "tag"]);

export function parseChatCommand(text: string): ChatResult {
  const trimmed = text.trim();
  const parts = trimmed.split(/\s+/);

  if (parts.length >= 3) {
    const action = parts[0]?.toLowerCase();
    const taskId = parts[1];
    const value = parts.slice(2).join(" ");

    if (action && taskId && value && COMMAND_ACTIONS.has(action)) {
      return {
        type: "command",
        action: action as ChatCommand["action"],
        taskId,
        value,
      };
    }
  }

  return { type: "message", text: trimmed };
}

// --- File helpers ---

const INBOX_FILE = "chat-inbox.json";
const OUTBOX_FILE = "chat-outbox.json";

function readJsonArray<T>(filePath: string): Result<T[]> {
  if (!existsSync(filePath)) {
    return ok([]);
  }
  try {
    const raw = readFileSync(filePath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return err(`Expected array in ${filePath}, got ${typeof parsed}`);
    }
    return ok(parsed as T[]);
  } catch (e) {
    return err(`Failed to read ${filePath}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function appendToJsonArray<T>(filePath: string, entry: T): Result<void> {
  const result = readJsonArray<T>(filePath);
  if (!result.ok) {
    return result;
  }
  const entries = result.value;
  entries.push(entry);
  try {
    const dir = filePath.substring(0, filePath.lastIndexOf("/"));
    if (dir && !existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(filePath, JSON.stringify(entries, null, 2), "utf-8");
    return ok(undefined);
  } catch (e) {
    return err(`Failed to write ${filePath}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// --- Inbox ---

export function readInbox(dataDir: string): Result<InboxEntry[]> {
  return readJsonArray<InboxEntry>(join(dataDir, INBOX_FILE));
}

export function writeInbox(dataDir: string, message: string): Result<void> {
  const entry: InboxEntry = {
    timestamp: new Date().toISOString(),
    message,
  };
  return appendToJsonArray<InboxEntry>(join(dataDir, INBOX_FILE), entry);
}

// --- Outbox ---

export function readOutbox(dataDir: string): Result<OutboxEntry[]> {
  return readJsonArray<OutboxEntry>(join(dataDir, OUTBOX_FILE));
}

export function writeOutbox(dataDir: string, message: string): Result<void> {
  const entry: OutboxEntry = {
    timestamp: new Date().toISOString(),
    message,
  };
  return appendToJsonArray<OutboxEntry>(join(dataDir, OUTBOX_FILE), entry);
}

export function clearOutbox(dataDir: string): Result<void> {
  const filePath = join(dataDir, OUTBOX_FILE);
  try {
    writeFileSync(filePath, "[]", "utf-8");
    return ok(undefined);
  } catch (e) {
    return err(`Failed to clear outbox: ${e instanceof Error ? e.message : String(e)}`);
  }
}
