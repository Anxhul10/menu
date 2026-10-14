import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="not-found-page">
      <div className="eyebrow">404 · Page not found</div>
      <h1>That table is not here.</h1>
      <p>Use a restaurant QR code or return to the Menu homepage.</p>
      <Link className="button primary" to="/">
        Back to Menu
      </Link>
    </div>
  );
}
