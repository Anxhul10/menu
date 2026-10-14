import { NavLink, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function OwnerLayout() {
  const { session, logout } = useAuth();
  const { restaurantId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/admin") ? "/admin" : "/app";
  const dashboardPath = basePath === "/admin" ? "/admin/dashboard" : "/app";
  const activeRestaurant = session?.restaurants?.find((restaurant) => restaurant.id === restaurantId);

  return <div className="owner-app">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">M</span><span>menu<span className="brand-dot">.</span></span></div>
      <div className="sidebar-label">Workspace</div>
      <NavLink end to={dashboardPath} className="side-link">⌂ <span>Restaurants</span></NavLink>
      {activeRestaurant && <>
        <div className="sidebar-label restaurant-label">{activeRestaurant.name}</div>
        <NavLink to={`${basePath}/restaurants/${restaurantId}/menu`} className="side-link">▦ <span>Menu</span></NavLink>
        <NavLink to={`${basePath}/restaurants/${restaurantId}/tables`} className="side-link">⌗ <span>Tables & QR</span></NavLink>
        <NavLink to={`${basePath}/restaurants/${restaurantId}/orders`} className="side-link">◷ <span>Orders</span></NavLink>
      </>}
      <div className="sidebar-spacer" />
      <div className="user-chip"><span className="avatar">{session?.user?.name?.slice(0, 1).toUpperCase()}</span><span className="user-name">{session?.user?.name}</span><button aria-label="Log out" onClick={() => { logout(); navigate("/admin/login"); }}>↪</button></div>
    </aside>
    <main className="owner-main">
      <header className="mobile-header"><div className="brand"><span className="brand-mark">M</span><span>menu<span className="brand-dot">.</span></span></div><button className="icon-button" onClick={() => { logout(); navigate("/admin/login"); }}>↪</button></header>
      <div className="page-content"><Outlet /></div>
    </main>
  </div>;
}
