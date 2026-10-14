import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api/client";
import { useCart } from "../../context/CartContext";
import { ErrorMessage, Loading } from "../../components/StateMessage";

export default function PublicMenuPage({ tableToken }) {
  const { slug } = useParams();
  const { addItem, count, total, orderingSessionToken } = useCart();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .publicMenu(slug)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [slug]);
  if (error) return <ErrorMessage error={{ message: error }} />;
  if (!data) return <Loading label="Opening the menu…" />;
  const menuUrl = tableToken ? `/r/${slug}/t/${tableToken}` : `/r/${slug}/menu`;
  return (
    <div className="public-page">
      <header className="public-header">
        <div className="brand">
          <span className="brand-mark">M</span>
          <span>
            menu<span className="brand-dot">.</span>
          </span>
        </div>
        {tableToken && <span className="table-badge">Table menu</span>}
        {tableToken && orderingSessionToken && (
          <Link className="back-link" to="/orders">
            View orders
          </Link>
        )}
      </header>
      <main className="public-main">
        <div className="public-hero">
          <div className="eyebrow">
            {tableToken ? "Welcome to your table" : "Today at"}
          </div>
          <h1>{data.restaurant.name}</h1>
          <p>Good food, thoughtfully served.</p>
        </div>
        <div className="category-menu">
          {data.categories.map((category) => (
            <section key={category.id} className="public-category">
              <div className="category-title">
                <h2>{category.name}</h2>
                {category.description && <p>{category.description}</p>}
              </div>
              <div className="public-item-list">
                {category.items.map((item) => (
                  <article className="public-item" key={item.id}>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" />
                    ) : (
                      <div className="public-item-image">✦</div>
                    )}
                    <div className="public-item-copy">
                      <h3>{item.name}</h3>
                      <p>{item.description}</p>
                      <div className="public-item-bottom">
                        <strong>₹{item.price}</strong>
                        <button
                          className="add-button"
                          onClick={() => addItem(item)}
                          aria-label={`Add ${item.name} to cart`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
        {!data.categories.length && (
          <div className="public-empty">
            The menu is being prepared. Please check back soon.
          </div>
        )}
      </main>
      {tableToken && (
        <Link className="cart-bar" to="/cart">
          <span>
            <strong>{count}</strong> items in your order
          </span>
          <strong>
            ₹{total} <span className="cart-arrow">→</span>
          </strong>
        </Link>
      )}
      {tableToken && orderingSessionToken && (
        <Link className="cart-bar secondary-cart-bar" to="/orders">
          View your existing orders →
        </Link>
      )}
    </div>
  );
}
