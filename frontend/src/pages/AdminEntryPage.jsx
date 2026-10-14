import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminEntryPage() {
  const { session, loading } = useAuth();
  if (loading)
    return (
      <div className="screen-center">
        <div className="loader" />
        Loading admin access…
      </div>
    );
  if (session) return <Navigate to="/admin/dashboard" replace />;

  return (
    <div className="admin-entry">
      <Link className="brand" to="/">
        <span className="brand-mark">M</span>
        <span>
          menu<span className="brand-dot">.</span>
        </span>
      </Link>
      <main className="admin-entry-card">
        <div className="eyebrow">Restaurant workspace</div>
        <h1>Run your service with clarity.</h1>
        <p>
          Manage your restaurants, menus, tables, and incoming orders from one
          workspace.
        </p>
        <div className="admin-entry-actions">
          <Link className="button primary full" to="/admin/login">
            Admin login
          </Link>
          <Link className="button secondary full" to="/admin/signup">
            Create an owner account
          </Link>
        </div>
        <Link className="back-link centered" to="/">
          ← Back to customer ordering
        </Link>
      </main>
    </div>
  );
}
