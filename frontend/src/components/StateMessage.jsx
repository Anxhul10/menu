export function Loading({ label = "Loading…" }) {
  return <div className="state-card"><div className="loader" />{label}</div>;
}

export function ErrorMessage({ error, onRetry }) {
  return <div className="state-card error-state"><strong>Something went wrong</strong><span>{error?.message || "Please try again."}</span>{onRetry && <button className="button secondary" onClick={onRetry}>Try again</button>}</div>;
}

export function EmptyState({ title, children }) {
  return <div className="state-card"><div className="empty-icon">✦</div><strong>{title}</strong><span>{children}</span></div>;
}
