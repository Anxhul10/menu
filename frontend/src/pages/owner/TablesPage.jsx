import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../api/client";
import OwnerHeader from "../../components/OwnerHeader";
import Modal from "../../components/Modal";
import {
  EmptyState,
  ErrorMessage,
  Loading,
} from "../../components/StateMessage";

export default function TablesPage() {
  const { restaurantId } = useParams();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState(null);
  const [number, setNumber] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    api
      .tables(restaurantId)
      .then((data) => {
        setTables(data.tables);
        setError("");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [restaurantId]);

  async function create(event) {
    event.preventDefault();
    const normalizedNumber = number.trim();
    setError("");
    if (tables.some((table) => table.tableNumber.trim() === normalizedNumber)) {
      setError("That table number already exists in this restaurant.");
      return;
    }

    setBusy(true);
    try {
      await api.createTable(restaurantId, { tableNumber: normalizedNumber });
      setNumber("");
      setOpen(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function showQr(table) {
    try {
      setQr(await api.tableQr(restaurantId, table.id));
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(table) {
    if (
      !window.confirm(
        `Delete table ${table.tableNumber}? Tables with order history must be deactivated instead.`,
      )
    )
      return;
    try {
      await api.deleteTable(restaurantId, table.id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function reset(table) {
    if (
      !window.confirm(
        `Reset table ${table.tableNumber}? This ends the current dining session.`,
      )
    )
      return;
    try {
      await api.resetTable(restaurantId, table.id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <Loading label="Loading tables…" />;
  if (error && !tables.length)
    return <ErrorMessage error={{ message: error }} onRetry={load} />;

  return (
    <>
      <OwnerHeader
        eyebrow="Guest access"
        title="Tables & QR codes"
        description="Give every table a clear doorway into the right menu."
        action={
          <button
            className="button primary"
            onClick={() => {
              setError("");
              setOpen(true);
            }}
          >
            + Add table
          </button>
        }
      />
      {error && <div className="inline-error">{error}</div>}
      {tables.length ? (
        <div className="table-grid">
          {tables.map((table) => (
            <article
              className={`table-card ${!table.isActive ? "inactive" : ""}`}
              key={table.id}
            >
              <div className="table-number">{table.tableNumber}</div>
              <div className="table-info">
                <span
                  className={`badge ${table.isOccupied ? "warning" : "success"}`}
                >
                  {table.isOccupied ? "Occupied" : "Unoccupied"}
                </span>
                <p>
                  {table.isOccupied
                    ? "Active dining session"
                    : "Ready for guests"}
                </p>
              </div>
              <div className="table-actions">
                <button
                  className="button small secondary"
                  onClick={() => showQr(table)}
                >
                  View QR
                </button>
                {table.isOccupied && (
                  <button
                    className="button small ghost"
                    onClick={() => reset(table)}
                  >
                    Reset table
                  </button>
                )}
                <button
                  className="button small ghost"
                  onClick={async () => {
                    try {
                      await api.updateTableAvailability(
                        restaurantId,
                        table.id,
                        !table.isActive,
                      );
                      load();
                    } catch (err) {
                      setError(err.message);
                    }
                  }}
                >
                  {table.isActive ? "Pause" : "Activate"}
                </button>
                <button
                  className="button small danger-button"
                  onClick={() => remove(table)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No tables yet">
          Add a table and print its QR code for guests.
        </EmptyState>
      )}
      {open && (
        <Modal title="Add table" onClose={() => setOpen(false)}>
          <form className="stack-form" onSubmit={create}>
            <label className="field">
              <span>Table number or label</span>
              <input
                autoFocus
                required
                maxLength="50"
                placeholder="e.g. 12 or Patio A"
                value={number}
                onChange={(event) => setNumber(event.target.value)}
              />
            </label>
            <p className="form-hint">
              Table numbers must be unique within this restaurant. The QR token
              is generated securely by the backend.
            </p>
            <button className="button primary full" disabled={busy}>
              {busy ? "Creating…" : "Create table"}
            </button>
          </form>
        </Modal>
      )}
      {qr && (
        <Modal title="Print table QR" onClose={() => setQr(null)}>
          <div className="qr-preview">
            <img src={qr.imageDataUrl} alt="QR code for this table" />
            <p className="muted">
              Print this code and place it at the table. It opens the public
              customer menu.
            </p>
            <a
              className="button secondary full"
              href={qr.imageDataUrl}
              download="menu-table-qr.png"
            >
              Download PNG
            </a>
            <button
              className="button primary full"
              onClick={() => window.print()}
            >
              Print QR
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
