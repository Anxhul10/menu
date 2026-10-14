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
import OrderSummaryPage from "./pages/public/OrderSummaryPage";
import HomePage from "./pages/HomePage";
import AdminEntryPage from "./pages/AdminEntryPage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/admin" element={<AdminEntryPage />} />
            <Route path="/admin/login" element={<LoginPage />} />
            <Route path="/admin/signup" element={<RegisterPage />} />
            <Route
              path="/login"
              element={<Navigate to="/admin/login" replace />}
            />
            <Route
              path="/register"
              element={<Navigate to="/admin/signup" replace />}
            />
            <Route element={<ProtectedRoute />}>
              <Route element={<OwnerLayout />}>
                <Route path="/admin/dashboard" element={<DashboardPage />} />
                <Route
                  path="/admin/restaurants/:restaurantId/menu"
                  element={<MenuPage />}
                />
                <Route
                  path="/admin/restaurants/:restaurantId/tables"
                  element={<TablesPage />}
                />
                <Route
                  path="/admin/restaurants/:restaurantId/orders"
                  element={<OrdersPage />}
                />
                <Route path="/app" element={<DashboardPage />} />
                <Route
                  path="/app/restaurants/:restaurantId/menu"
                  element={<MenuPage />}
                />
                <Route
                  path="/app/restaurants/:restaurantId/tables"
                  element={<TablesPage />}
                />
                <Route
                  path="/app/restaurants/:restaurantId/orders"
                  element={<OrdersPage />}
                />
              </Route>
            </Route>
            <Route path="/r/:slug/menu" element={<PublicMenuPage />} />
            <Route path="/r/:slug/t/:qrToken" element={<TableMenuPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route
              path="/order/:trackingToken"
              element={<OrderTrackingPage />}
            />
            <Route path="/orders" element={<OrderSummaryPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
