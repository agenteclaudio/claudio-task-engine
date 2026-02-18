import { describe, it, expect } from "vitest";
import { generateKanban } from "../kanban.js";
function makeTask(overrides) {
    return {
        title: overrides.id,
        description: null,
        status: "pending",
        priority: "P4",
        dependencies: [],
        tags: [],
        project: null,
        created_at: "2026-02-16T00:00:00Z",
        started_at: null,
        completed_at: null,
        assignee: null,
        result: null,
        failure_reason: null,
        ...overrides,
    };
}
const projects = [
    { id: "personal", name: "Personal", color: "#4A90D9" },
    { id: "negocio", name: "Negocio IA", color: "#D94A4A" },
];
describe("generateKanban", () => {
    it("returns valid HTML", () => {
        const store = { tasks: [], projects };
        const html = generateKanban(store);
        expect(html).toContain("<!DOCTYPE html>");
        expect(html).toContain("</html>");
    });
    it("includes column headers", () => {
        const store = { tasks: [], projects };
        const html = generateKanban(store);
        expect(html).toContain("Backlog");
        expect(html).toContain("Ready");
        expect(html).toContain("In Progress");
        expect(html).toContain("Done");
        expect(html).toContain("Failed");
    });
    it("renders task cards in correct columns", () => {
        const store = {
            tasks: [
                makeTask({ id: "task-001", title: "Pending task", status: "pending", priority: "P4" }),
                makeTask({ id: "task-002", title: "Ready task", status: "ready", priority: "P1" }),
                makeTask({ id: "task-003", title: "Active task", status: "in_progress", priority: "P2" }),
                makeTask({ id: "task-004", title: "Done task", status: "completed", priority: "P3" }),
                makeTask({ id: "task-005", title: "Failed task", status: "failed", priority: "P1" }),
            ],
            projects,
        };
        const html = generateKanban(store);
        expect(html).toContain("Pending task");
        expect(html).toContain("Ready task");
        expect(html).toContain("Active task");
        expect(html).toContain("Done task");
        expect(html).toContain("Failed task");
    });
    it("shows priority badges", () => {
        const store = {
            tasks: [makeTask({ id: "task-001", title: "Urgent", priority: "P1" })],
            projects,
        };
        const html = generateKanban(store);
        expect(html).toContain("P1");
    });
    it("shows project info", () => {
        const store = {
            tasks: [makeTask({ id: "task-001", title: "My task", project: "personal" })],
            projects,
        };
        const html = generateKanban(store);
        expect(html).toContain("Personal");
        expect(html).toContain("#4A90D9");
    });
    it("shows tags", () => {
        const store = {
            tasks: [makeTask({ id: "task-001", title: "Tagged", tags: ["research", "health"] })],
            projects,
        };
        const html = generateKanban(store);
        expect(html).toContain("research");
        expect(html).toContain("health");
    });
    it("shows dependency count", () => {
        const store = {
            tasks: [
                makeTask({ id: "task-001", title: "A" }),
                makeTask({ id: "task-002", title: "B", dependencies: ["task-001"] }),
            ],
            projects,
        };
        const html = generateKanban(store);
        expect(html).toContain("1 dep");
    });
    it("includes filter buttons for projects", () => {
        const store = { tasks: [], projects };
        const html = generateKanban(store);
        expect(html).toContain("Personal");
        expect(html).toContain("Negocio IA");
    });
    it("has dark mode styles", () => {
        const store = { tasks: [], projects };
        const html = generateKanban(store);
        // Dark mode should have dark background colors
        expect(html).toContain("background");
        expect(html).toContain("#");
    });
});
//# sourceMappingURL=kanban.test.js.map