import { useEffect, useState } from "react";
import { api } from "../../api/client";
import OwnerHeader from "../../components/OwnerHeader";
import Modal from "../../components/Modal";
import {
  EmptyState,
  ErrorMessage,
  Loading,
} from "../../components/StateMessage";
import { useParams } from "react-router-dom";

const blankItem = {
  categoryId: "",
  name: "",
  description: "",
  price: "",
  imageUrl: "",
};
export default function MenuPage() {
  const { restaurantId } = useParams();
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const load = () => {
    setLoading(true);
    Promise.all([api.categories(restaurantId), api.items(restaurantId)])
      .then(([c, i]) => {
        setCategories(c.categories);
        setItems(i.items);
        setError("");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, [restaurantId]);
  if (loading) return <Loading label="Loading your menu…" />;
  if (error) return <ErrorMessage error={{ message: error }} onRetry={load} />;
  async function removeCategory(category) {
    if (
      !window.confirm(
        `Delete ${category.name}? Categories with items cannot be deleted.`,
      )
    )
      return;
    try {
      await api.deleteCategory(restaurantId, category.id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }
  async function removeItem(item) {
    if (!window.confirm(`Delete ${item.name}?`)) return;
    try {
      await api.deleteItem(restaurantId, item.id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <>
      <OwnerHeader
        eyebrow="Menu management"
        title="The menu"
        description="Keep categories, dishes, and availability current."
        action={
          <button
            className="button primary"
            onClick={() => setModal({ type: "item", item: blankItem })}
          >
            + Add dish
          </button>
        }
      />
      {error && <div className="inline-error">{error}</div>}
      <section className="section-block">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Structure</div>
            <h2>Categories</h2>
          </div>
          <button
            className="button secondary"
            onClick={() =>
              setModal({
                type: "category",
                category: { name: "", description: "", sortOrder: 0 },
              })
            }
          >
            + Category
          </button>
        </div>
        {categories.length ? (
          <div className="category-list">
            {categories.map((category) => (
              <div className="category-row" key={category.id}>
                <div>
                  <strong>{category.name}</strong>
                  <p>{category.description || "No description"}</p>
                </div>
                <div className="row-actions">
                  <button
                    className="text-button"
                    onClick={() => setModal({ type: "category", category })}
                  >
                    Edit
                  </button>
                  <button
                    className="text-button danger"
                    onClick={() => removeCategory(category)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No categories yet">
            Create a category before adding dishes.
          </EmptyState>
        )}
      </section>
      <section className="section-block">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Inventory</div>
            <h2>
              Dishes <span className="count-pill">{items.length}</span>
            </h2>
          </div>
        </div>
        {items.length ? (
          <div className="item-grid">
            {items.map((item) => (
              <article
                className={`item-card ${!item.isAvailable ? "unavailable" : ""}`}
                key={item.id}
              >
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="" />
                ) : (
                  <div className="image-placeholder">✦</div>
                )}
                <div className="item-card-body">
                  <div className="item-card-top">
                    <span className="status-dot" />
                    {item.isAvailable ? "Available" : "Unavailable"}
                    <span className="price">₹{item.price}</span>
                  </div>
                  <h3>{item.name}</h3>
                  <p>{item.description || "No description"}</p>
                  <div className="item-actions">
                    <button
                      className="button small secondary"
                      onClick={() => setModal({ type: "item", item })}
                    >
                      Edit
                    </button>
                    <button
                      className="button small ghost"
                      onClick={async () => {
                        try {
                          await api.availability(
                            restaurantId,
                            item.id,
                            !item.isAvailable,
                          );
                          load();
                        } catch (err) {
                          setError(err.message);
                        }
                      }}
                    >
                      {item.isAvailable ? "Pause" : "Enable"}
                    </button>
                    <button
                      className="icon-button danger"
                      aria-label={`Delete ${item.name}`}
                      onClick={() => removeItem(item)}
                    >
                      ×
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="Your menu is waiting">
            Add your first dish after creating a category.
          </EmptyState>
        )}
      </section>
      {modal?.type === "category" && (
        <CategoryModal
          restaurantId={restaurantId}
          category={modal.category}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
          }}
        />
      )}
      {modal?.type === "item" && (
        <ItemModal
          restaurantId={restaurantId}
          item={modal.item}
          categories={categories}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
          }}
        />
      )}
    </>
  );
}

function CategoryModal({ restaurantId, category, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: category.name || "",
    description: category.description || "",
    sortOrder: category.sortOrder || 0,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      if (category.id)
        await api.updateCategory(restaurantId, category.id, form);
      else await api.createCategory(restaurantId, form);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={category.id ? "Edit category" : "New category"}
      onClose={onClose}
    >
      <form className="stack-form" onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}
        <label className="field">
          <span>Name</span>
          <input
            required
            maxLength="100"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label className="field">
          <span>Description</span>
          <textarea
            maxLength="500"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
        <label className="field">
          <span>Sort order</span>
          <input
            type="number"
            min="0"
            value={form.sortOrder}
            onChange={(e) =>
              setForm({ ...form, sortOrder: Number(e.target.value) })
            }
          />
        </label>
        <button className="button primary full" disabled={busy}>
          {busy ? "Saving…" : "Save category"}
        </button>
      </form>
    </Modal>
  );
}

function ItemModal({ restaurantId, item, categories, onClose, onSaved }) {
  const [form, setForm] = useState({
    ...blankItem,
    ...item,
    categoryId: item.categoryId || categories[0]?.id || "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      if (item.id) await api.updateItem(restaurantId, item.id, form);
      else await api.createItem(restaurantId, form);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={item.id ? "Edit dish" : "New dish"} onClose={onClose}>
      <form className="stack-form" onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}
        <label className="field">
          <span>Category</span>
          <select
            required
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          >
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Dish name</span>
          <input
            required
            maxLength="150"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label className="field">
          <span>Description</span>
          <textarea
            value={form.description || ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
        <label className="field">
          <span>
            Price <small>Use 12.50 format</small>
          </span>
          <input
            required
            inputMode="decimal"
            pattern="(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
        </label>
        <label className="field">
          <span>
            Image URL <small>Optional</small>
          </span>
          <input
            type="url"
            value={form.imageUrl || ""}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
          />
        </label>
        <button
          className="button primary full"
          disabled={busy || !categories.length}
        >
          {busy ? "Saving…" : "Save dish"}
        </button>
      </form>
    </Modal>
  );
}
