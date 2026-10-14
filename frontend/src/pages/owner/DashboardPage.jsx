import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import OwnerHeader from "../../components/OwnerHeader";
import Modal from "../../components/Modal";
import { EmptyState } from "../../components/StateMessage";
import { useAuth } from "../../context/AuthContext";

export default function DashboardPage() {
  const { session } = useAuth(); const [open, setOpen] = useState(false); const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", description: "", address: "" }); const [busy, setBusy] = useState(false);
  async function create(event) { event.preventDefault(); setError(""); setBusy(true); try { await api.createRestaurant(form); window.location.reload(); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  return <><OwnerHeader eyebrow="Owner workspace" title="Your restaurants" description="Choose a restaurant to manage its day-to-day details." action={<button className="button primary" onClick={() => setOpen(true)}>+ New restaurant</button>} />
    {session?.restaurants?.length ? <div className="restaurant-grid">{session.restaurants.map((restaurant) => <Link className="restaurant-card" key={restaurant.id} to={`/app/restaurants/${restaurant.id}/menu`}><div className="restaurant-card-top"><span className="card-kicker">ACTIVE RESTAURANT</span><span className="arrow">↗</span></div><h2>{restaurant.name}</h2><p className="muted">/{restaurant.slug}</p><div className="card-footer"><span>Open workspace</span><span>→</span></div></Link>)}</div> : <EmptyState title="Your first restaurant starts here">Create a restaurant to begin building its menu and table experience.</EmptyState>}
    {open && <Modal title="Create restaurant" onClose={() => setOpen(false)}><form onSubmit={create} className="stack-form">{error && <div className="form-error">{error}</div>}<label className="field"><span>Name</span><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label className="field"><span>Description</span><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><label className="field"><span>Address</span><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label><p className="form-hint">A public URL slug will be generated automatically by the server.</p><button className="button primary full" disabled={busy}>{busy ? "Creating…" : "Create restaurant"}</button></form></Modal>}
  </>;
}
