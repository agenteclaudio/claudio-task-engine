const PRIORITY_ORDER = {
    P1: 0,
    P2: 1,
    P3: 2,
    P4: 3,
};
export function sortByPriority(tasks) {
    return [...tasks].sort((a, b) => {
        const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        if (pDiff !== 0)
            return pDiff;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
}
export function eisenhowerLabel(priority) {
    switch (priority) {
        case "P1":
            return "Urgent + Important";
        case "P2":
            return "Important";
        case "P3":
            return "Urgent";
        case "P4":
            return "Backlog";
    }
}
//# sourceMappingURL=priority.js.map