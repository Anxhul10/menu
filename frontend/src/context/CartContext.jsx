import { createContext, useContext, useMemo, useState } from "react";
import { addToCart, cartTotal, updateQuantity } from "../utils/cart";
import {
  readOrderingSessionToken,
  readTableContext,
  writeOrderingSessionToken,
  writeTableContext,
} from "../utils/order-session";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [context, setContextState] = useState(readTableContext);
  const [orderingSessionToken, setOrderingSessionTokenState] = useState(() =>
    readOrderingSessionToken(readTableContext()?.qrToken),
  );
  const setContext = (value) => {
    setContextState(value);
    writeTableContext(value);
    setOrderingSessionTokenState(readOrderingSessionToken(value?.qrToken));
  };
  const setOrderingSessionToken = (value) => {
    setOrderingSessionTokenState(value);
    writeOrderingSessionToken(context?.qrToken, value);
  };
  const value = useMemo(
    () => ({
      cart,
      addItem: (item) => setCart((current) => addToCart(current, item)),
      setQuantity: (id, quantity) =>
        setCart((current) => updateQuantity(current, id, quantity)),
      clear: () => setCart([]),
      context,
      setContext,
      orderingSessionToken,
      setOrderingSessionToken,
      total: cartTotal(cart),
      count: cart.reduce((sum, item) => sum + item.quantity, 0),
    }),
    [cart, context, orderingSessionToken],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
