export function remainingSeconds(deadline, now = Date.now()) { if (!deadline) return null; return Math.max(0, Math.ceil((new Date(deadline).getTime() - now) / 1000)); }
export function formatCountdown(seconds) { if (seconds === null) return ""; return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`; }
