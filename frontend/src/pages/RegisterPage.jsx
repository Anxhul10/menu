import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AuthShell } from "./LoginPage";

export default function RegisterPage() {
  const { register } = useAuth(); const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", restaurantName: "", restaurantSlug: "" });
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event) { event.preventDefault(); setError(""); if (form.password.length < 8) return setError("Password must be at least 8 characters."); setBusy(true); try { await register(form); navigate("/app"); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  return <AuthShell title="Start your workspace" subtitle="Set up your owner account and first restaurant.">
    <form onSubmit={submit} className="stack-form">
      {error && <div className="form-error">{error}</div>}
      <div className="form-grid"><label className="field"><span>Your name</span><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label className="field"><span>Email</span><input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label></div>
      <label className="field"><span>Password</span><input type="password" minLength="8" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /><small>At least 8 characters.</small></label>
      <div className="form-divider">Your first restaurant</div>
      <label className="field"><span>Restaurant name</span><input required value={form.restaurantName} onChange={(e) => setForm({ ...form, restaurantName: e.target.value })} /></label>
      <label className="field"><span>Public slug</span><input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="your-restaurant" value={form.restaurantSlug} onChange={(e) => setForm({ ...form, restaurantSlug: e.target.value.toLowerCase() })} /></label>
      <button className="button primary full" disabled={busy}>{busy ? "Creating workspace…" : "Create workspace"}</button>
    </form>
    <p className="auth-switch">Already have an account? <Link to="/admin/login">Sign in</Link></p>
  </AuthShell>;
}
