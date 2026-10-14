import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="screen-center"><div className="loader" />Loading your workspace…</div>;
  return session ? <Outlet /> : <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
}
