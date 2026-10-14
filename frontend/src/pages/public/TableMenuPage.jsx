import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../api/client";
import PublicMenuPage from "./PublicMenuPage";
import { ErrorMessage, Loading } from "../../components/StateMessage";
import { useCart } from "../../context/CartContext";

export default function TableMenuPage() {
  const { qrToken } = useParams();
  const { setContext } = useCart();
  const [table, setTable] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .publicTable(qrToken)
      .then((data) => {
        setTable(data);
        setContext({ qrToken, restaurant: data.restaurant, table: data.table });
      })
      .catch((err) => setError(err.message));
  }, [qrToken]);
  if (error)
    return (
      <ErrorMessage
        error={{
          message:
            "This table is not available. Please ask the restaurant for help.",
        }}
      />
    );
  if (!table) return <Loading label="Checking your table…" />;
  return <PublicMenuPage tableToken={qrToken} />;
}
