import { describe, it, expect } from "vitest";
import { parseChatCommand, readInbox, writeInbox, readOutbox, writeOutbox, clearOutbox } from "../chat.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const tmpDir = path.join(os.tmpdir(), "cte-test-server");

function setup() {
  fs.mkdirSync(tmpDir, { recursive: true });
}

function cleanup() {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

describe("parseChatCommand", () => {
  it("parses move command", () => {
    const result = parseChatCommand("move task-001 in_progress");
    expect(result).toEqual({
      type: "command",
      action: "move",
      taskId: "task-001",
      value: "in_progress",
    });
  });

  it("parses priority command", () => {
    const result = parseChatCommand("priority task-001 P1");
    expect(result).toEqual({
      type: "command",
      action: "priority",
      taskId: "task-001",
      value: "P1",
    });
  });

  it("parses tag command", () => {
    const result = parseChatCommand("tag task-001 research");
    expect(result).toEqual({
      type: "command",
      action: "tag",
      taskId: "task-001",
      value: "research",
    });
  });

  it("returns message for non-command text", () => {
    const result = parseChatCommand("hello world");
    expect(result).toEqual({
      type: "message",
      text: "hello world",
    });
  });

  it("handles extra whitespace", () => {
    const result = parseChatCommand("  move   task-002   completed  ");
    expect(result.type).toBe("command");
    if (result.type === "command") {
      expect(result.action).toBe("move");
      expect(result.taskId).toBe("task-002");
      expect(result.value).toBe("completed");
    }
  });

  it("is case-insensitive for action", () => {
    const result = parseChatCommand("MOVE task-001 ready");
    expect(result.type).toBe("command");
    if (result.type === "command") {
      expect(result.action).toBe("move");
    }
  });
});

describe("chat inbox/outbox", () => {
  it("readInbox returns empty array when file doesn't exist", () => {
    setup();
    try {
      const result = readInbox(path.join(tmpDir, "nonexistent"));
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual([]);
    } finally {
      cleanup();
    }
  });

  it("writeInbox appends messages", () => {
    setup();
    try {
      writeInbox(tmpDir, "hello");
      writeInbox(tmpDir, "world");
      const result = readInbox(tmpDir);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0].message).toBe("hello");
        expect(result.value[1].message).toBe("world");
      }
    } finally {
      cleanup();
    }
  });

  it("readOutbox returns empty array when file doesn't exist", () => {
    setup();
    try {
      const result = readOutbox(path.join(tmpDir, "nonexistent"));
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual([]);
    } finally {
      cleanup();
    }
  });

  it("writeOutbox and readOutbox work together", () => {
    setup();
    try {
      writeOutbox(tmpDir, "response 1");
      writeOutbox(tmpDir, "response 2");
      const result = readOutbox(tmpDir);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0].message).toBe("response 1");
      }
    } finally {
      cleanup();
    }
  });

  it("clearOutbox resets to empty array", () => {
    setup();
    try {
      writeOutbox(tmpDir, "msg");
      clearOutbox(tmpDir);
      const result = readOutbox(tmpDir);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual([]);
    } finally {
      cleanup();
    }
  });
});

describe("parseBind", () => {
  it("CTE_BIND default parses correctly", () => {
    const bindStr = "127.0.0.1,100.70.244.126";
    const addrs = bindStr.split(",").map(s => s.trim()).filter(Boolean);
    expect(addrs).toEqual(["127.0.0.1", "100.70.244.126"]);
  });

  it("single address parses correctly", () => {
    const bindStr = "127.0.0.1";
    const addrs = bindStr.split(",").map(s => s.trim()).filter(Boolean);
    expect(addrs).toEqual(["127.0.0.1"]);
  });

  it("handles spaces in bind string", () => {
    const bindStr = " 127.0.0.1 , 10.0.0.1 ";
    const addrs = bindStr.split(",").map(s => s.trim()).filter(Boolean);
    expect(addrs).toEqual(["127.0.0.1", "10.0.0.1"]);
  });
});
