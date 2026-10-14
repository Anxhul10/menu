import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../api/client";
import OwnerHeader from "../../components/OwnerHeader";
import {
  ErrorMessage,
  Loading,
  EmptyState,
} from "../../components/StateMessage";
import useOwnerOrderSocket from "../../hooks/useOwnerOrderSocket";
import BatchCountdown from "../../components/BatchCountdown";

const nextStatuses = {
  PENDING: ["ACCEPTED", "REJECTED", "CANCELLED"],
  ACCEPTED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["COMPLETED"],
};
export default function OrdersPage() {
  const { restaurantId } = useParams();
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    api
      .orders(restaurantId, {
        page: 1,
        pageSize: 50,
        ...(filter ? { status: filter } : {}),
      })
      .then((data) => {
        setOrders(data.orders);
        setPagination(data.pagination);
        setError("");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  const socketStatus = useOwnerOrderSocket(restaurantId, {
    onEvent: load,
    onReconnect: load,
  });

  useEffect(load, [restaurantId, filter]);
  useEffect(() => {
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [restaurantId, filter]);

  async function changeStatus(order, status) {
    try {
      await api.updateOrderStatus(restaurantId, order.orderId, status);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function collect(order) {
    try {
      await api.collectPayment(restaurantId, order.orderId);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function setEta(order) {
    const value = window.prompt(
      "Estimated preparation time in minutes (1–240)",
      "10",
    );
    if (value === null) return;
    const minutes = Number(value);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 240)
      return setError("ETA must be a whole number from 1 to 240 minutes.");
    try {
      await api.updateOrderEta(restaurantId, order.orderId, minutes);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading && !orders.length) return <Loading label="Loading orders…" />;
  return (
    <>
      <OwnerHeader
        eyebrow="Service flow"
        title="Orders"
        description="A calm queue for every order that needs your attention."
        action={
          <div className="filter-row">
            <span className={`live-status ${socketStatus}`}>
              ● {socketStatus === "connected" ? "Live" : socketStatus}
            </span>
            <label className="filter-label">
              Show{" "}
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="">All orders</option>
                {[
                  "PENDING",
                  "ACCEPTED",
                  "PREPARING",
                  "READY",
                  "COMPLETED",
                  "REJECTED",
                  "CANCELLED",
                ].map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <button className="button secondary" onClick={load}>
              Refresh
            </button>
          </div>
        }
      />
      {error && <div className="inline-error">{error}</div>}
      {orders.length ? (
        <div className="order-list">
          {orders.map((order) => (
            <OrderCard
              key={order.orderId}
              order={order}
              onStatus={changeStatus}
              onCollect={collect}
              onEta={setEta}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="No orders in this view">
          New guest orders will appear here as they arrive.
        </EmptyState>
      )}
      {pagination && (
        <p className="list-meta">
          Showing {orders.length} of {pagination.total} orders · live updates
          with polling fallback
        </p>
      )}
    </>
  );
}

function OrderCard({ order, onStatus, onCollect, onEta }) {
  const actions = nextStatuses[order.status] || [];
  return (
    <article className="order-card">
      <div className="order-head">
        <div>
          <span className="order-ref">#{order.orderId.slice(0, 8)}</span>
          <span className={`badge status-${order.status.toLowerCase()}`}>
            {order.status}
          </span>
        </div>
        <span className="muted">
          {new Date(order.createdAt).toLocaleString()}
        </span>
      </div>
      <div className="order-meta">
        <span>
          Table{" "}
          <strong>
            {order.tableNumber || order.restaurantTableId?.slice(0, 6)}
          </strong>
        </span>
        <span>
          {order.paymentMethod} ·{" "}
          <strong className={order.paymentStatus === "PAID" ? "paid" : "due"}>
            {order.paymentStatus === "PAID" ? "Collected" : "Payment due"}
          </strong>
        </span>
      </div>
      <div className="order-items">
        {order.items.map((item) => (
          <div key={item.id}>
            <span>
              {item.quantity} × {item.itemName}
            </span>
            <span>₹{item.lineSubtotal}</span>
          </div>
        ))}
      </div>
      <div className="order-foot">
        <strong className="order-total">₹{order.totalAmount}</strong>
        <BatchCountdown deadline={order.estimatedReadyAt} />
        <div className="order-actions">
          {actions.map((status) => (
            <button
              className={`button small ${status === "REJECTED" || status === "CANCELLED" ? "danger-button" : "primary"}`}
              key={status}
              onClick={() => onStatus(order, status)}
            >
              {status === "ACCEPTED"
                ? "Accept"
                : status === "PREPARING"
                  ? "Start prep"
                  : status === "READY"
                    ? "Mark ready"
                    : status === "COMPLETED"
                      ? "Complete"
                      : status[0] + status.slice(1).toLowerCase()}
            </button>
          ))}
          {order.status !== "COMPLETED" &&
            order.status !== "CANCELLED" &&
            order.status !== "REJECTED" && (
              <button
                className="button small ghost"
                onClick={() => onEta(order)}
              >
                Set ETA
              </button>
            )}
          {order.paymentStatus === "PAYMENT_DUE" && (
            <button
              className="button small secondary"
              onClick={() => onCollect(order)}
            >
              Collect cash
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
