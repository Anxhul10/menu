import { createContext, useContext, useMemo, useState } from "react";
import { addToCart, cartTotal, updateQuantity } from "../utils/cart";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [context, setContext] = useState(null);
  const value = useMemo(() => ({
    cart,
    addItem: (item) => setCart((current) => addToCart(current, item)),
    setQuantity: (id, quantity) => setCart((current) => updateQuantity(current, id, quantity)),
    clear: () => setCart([]),
    context,
    setContext,
    total: cartTotal(cart),
    count: cart.reduce((sum, item) => sum + item.quantity, 0)
  }), [cart]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
