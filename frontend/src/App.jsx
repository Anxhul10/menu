import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import ProtectedRoute from "./components/ProtectedRoute";
import OwnerLayout from "./layouts/OwnerLayout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/owner/DashboardPage";
import MenuPage from "./pages/owner/MenuPage";
import TablesPage from "./pages/owner/TablesPage";
import OrdersPage from "./pages/owner/OrdersPage";
import PublicMenuPage from "./pages/public/PublicMenuPage";
import TableMenuPage from "./pages/public/TableMenuPage";
import CartPage from "./pages/public/CartPage";
import OrderTrackingPage from "./pages/public/OrderTrackingPage";

export default function App() {
  return <BrowserRouter><AuthProvider><CartProvider><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route element={<ProtectedRoute />}><Route element={<OwnerLayout />}><Route path="/app" element={<DashboardPage />} /><Route path="/app/restaurants/:restaurantId/menu" element={<MenuPage />} /><Route path="/app/restaurants/:restaurantId/tables" element={<TablesPage />} /><Route path="/app/restaurants/:restaurantId/orders" element={<OrdersPage />} /></Route></Route>
    <Route path="/r/:slug/menu" element={<PublicMenuPage />} />
    <Route path="/r/:slug/t/:qrToken" element={<TableMenuPage />} />
    <Route path="/cart" element={<CartPage />} />
    <Route path="/order/:trackingToken" element={<OrderTrackingPage />} />
    <Route path="/" element={<Navigate to="/login" replace />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></CartProvider></AuthProvider></BrowserRouter>;
}
