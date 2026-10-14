import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { useCart } from "../../context/CartContext";
import { Field } from "../../components/Field";

export default function CartPage() {
  const {
    cart,
    setQuantity,
    total,
    clear,
    context,
    orderingSessionToken,
    setOrderingSessionToken,
  } = useCart();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const menuUrl = context?.restaurant
    ? `/r/${context.restaurant.slug}/t/${context.qrToken}`
    : "/";

  async function submit(event) {
    event.preventDefault();
    if (!context?.qrToken)
      return setError(
        "Open this menu from a table QR code before placing an order.",
      );
    setBusy(true);
    setError("");
    try {
      const result = await api.placeOrder({
        tableQrToken: context.qrToken,
        orderingSessionToken: orderingSessionToken || undefined,
        paymentMethod: "CASH",
        customerName: name || undefined,
        customerContact: contact || undefined,
        items: cart.map((item) => ({
          menuItemId: item.id,
          quantity: item.quantity,
        })),
      });
      setOrderingSessionToken(result.order.orderingSessionToken);
      clear();
      navigate("/orders");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="public-page">
      <header className="public-header">
        <Link to={menuUrl} className="brand">
          <span className="brand-mark">M</span>
          <span>
            menu<span className="brand-dot">.</span>
          </span>
        </Link>
        <Link className="back-link" to={menuUrl}>
          ← Menu
        </Link>
      </header>
      <main className="checkout-main">
        <div className="eyebrow">
          {context?.restaurant?.name || "Your order"}
        </div>
        <h1>Review your order</h1>
        {cart.length ? (
          <div className="checkout-grid">
            <section className="checkout-card">
              <div className="checkout-items">
                {cart.map((item) => (
                  <div className="checkout-item" key={item.id}>
                    <div>
                      <strong>{item.name}</strong>
                      <span>₹{item.price} each</span>
                    </div>
                    <div className="quantity-control">
                      <button
                        onClick={() => setQuantity(item.id, item.quantity - 1)}
                        aria-label={`Decrease ${item.name}`}
                      >
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        onClick={() => setQuantity(item.id, item.quantity + 1)}
                        aria-label={`Increase ${item.name}`}
                      >
                        +
                      </button>
                    </div>
                    <strong>
                      ₹{(Number(item.price) * item.quantity).toFixed(2)}
                    </strong>
                  </div>
                ))}
              </div>
              <div className="checkout-total">
                <span>Estimated total</span>
                <strong>₹{total}</strong>
              </div>
              <p className="form-hint">
                Final price and availability are confirmed by the restaurant
                server.
              </p>
            </section>
            <form className="checkout-card stack-form" onSubmit={submit}>
              <h2>Order details</h2>
              {error && <div className="form-error">{error}</div>}
              <Field
                label="Name (optional)"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <Field
                label="Contact (optional)"
                value={contact}
                onChange={(event) => setContact(event.target.value)}
              />
              <div className="payment-choice">
                <span className="payment-icon">₹</span>
                <div>
                  <strong>Cash at table</strong>
                  <p>Pay when your order is served.</p>
                </div>
                <span className="check">✓</span>
              </div>
              <button className="button primary full" disabled={busy}>
                {busy ? "Placing order…" : `Place order · ₹${total}`}
              </button>
            </form>
          </div>
        ) : (
          <div className="checkout-card">
            <h2>Your basket is empty</h2>
            <p className="muted">
              Add something delicious from the menu first.
            </p>
            <Link className="button primary" to={menuUrl}>
              Back to menu
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
