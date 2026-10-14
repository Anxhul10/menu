import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const next = new URLSearchParams(location.search).get("next") || "/app";
  async function submit(event) { event.preventDefault(); setError(""); setBusy(true); try { await login(form); navigate(next); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  return <AuthShell title="Welcome back" subtitle="Sign in to keep your service moving.">
    <form onSubmit={submit} className="stack-form">
      {error && <div className="form-error">{error}</div>}
      <label className="field"><span>Email</span><input type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
      <label className="field"><span>Password</span><input type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
      <button className="button primary full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>
    <p className="auth-switch">New to Menu? <Link to="/register">Create an account</Link></p>
  </AuthShell>;
}

export function AuthShell({ title, subtitle, children }) {
  return <div className="auth-page"><div className="auth-art"><div className="art-orb orb-one" /><div className="art-orb orb-two" /><div className="brand light"><span className="brand-mark">M</span><span>menu<span className="brand-dot">.</span></span></div><div className="art-copy"><div className="eyebrow">Your table, your rhythm</div><h2>A calmer way to run a restaurant.</h2><p>Menus, tables, orders — all in one clear workspace.</p></div><div className="art-note">EST. 2026 <span>✦</span> HOSPITALITY OPERATIONS</div></div><div className="auth-panel"><div className="auth-form"><div className="eyebrow">Owner access</div><h1>{title}</h1><p className="auth-subtitle">{subtitle}</p>{children}</div></div></div>;
}
