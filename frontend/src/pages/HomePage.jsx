import { lazy, Suspense, useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import {
  isValidTableCode,
  parseMenuQrValue,
  tableMenuPath,
} from "../utils/tableCode";

const QrScanner = lazy(() => import("../components/QrScanner"));

export default function HomePage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function findMenu(event) {
    event.preventDefault();
    const normalizedCode = code.trim();
    setError("");
    if (!isValidTableCode(normalizedCode)) {
      setError("Enter the table code from your Menu QR code.");
      return;
    }

    setBusy(true);
    try {
      const result = await api.publicTable(normalizedCode);
      navigate(tableMenuPath(result.restaurant.slug, normalizedCode));
    } catch {
      setError(
        "That table code is invalid or inactive. Ask your server for a current QR code.",
      );
    } finally {
      setBusy(false);
    }
  }

  const handleScan = useCallback(
    (value) => {
      const parsed = parseMenuQrValue(value);
      if (!parsed) {
        setError("That QR code is not a valid Menu table code.");
        return;
      }
      setScannerOpen(false);
      setError("");
      navigate(parsed.path);
    },
    [navigate],
  );

  return (
    <div className="home-page">
      <header className="home-header">
        <Link className="brand" to="/">
          <span className="brand-mark">M</span>
          <span>
            menu<span className="brand-dot">.</span>
          </span>
        </Link>
        <Link className="admin-link" to="/admin">
          Admin
        </Link>
      </header>
      <main className="home-main">
        <section className="home-hero">
          <div className="eyebrow">Your table, your menu</div>
          <h1>
            Good food
            <br />
            <em>starts here.</em>
          </h1>
          <p>
            Scan your table QR code or enter your table code to explore the menu
            and order directly from your table.
          </p>
        </section>
        <section className="customer-entry" aria-label="Open a restaurant menu">
          <button
            className="scan-card"
            onClick={() => {
              setError("");
              setScannerOpen(true);
            }}
          >
            <span className="scan-icon">⌗</span>
            <span>
              <strong>Scan QR Code</strong>
              <small>Use your phone camera</small>
            </span>
            <span className="entry-arrow">→</span>
          </button>
          <div className="entry-divider">
            <span>or enter code</span>
          </div>
          <form className="code-form" onSubmit={findMenu}>
            <label className="field">
              <span>Enter your table code</span>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="Paste your table code"
                autoComplete="off"
              />
            </label>
            <button className="button primary full" disabled={busy}>
              {busy ? "Finding menu…" : "Find Menu"}
            </button>
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
          </form>
        </section>
        <p className="home-note">
          No account needed. Your restaurant will take care of the rest.
        </p>
        {scannerOpen && (
          <div
            className="scanner-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="scanner-title"
          >
            <div className="scanner-modal-card">
              <div className="scanner-modal-head">
                <h2 id="scanner-title">Scan your table code</h2>
                <button
                  className="icon-button"
                  onClick={() => setScannerOpen(false)}
                  aria-label="Close scanner"
                >
                  ×
                </button>
              </div>
              <Suspense
                fallback={
                  <div className="state-card">
                    <div className="loader" />
                    Loading camera scanner…
                  </div>
                }
              >
                <QrScanner
                  onScan={handleScan}
                  onClose={() => setScannerOpen(false)}
                />
              </Suspense>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
