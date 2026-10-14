export function addToCart(cart, item) {
  const existing = cart.find((entry) => entry.id === item.id);
  if (existing) return cart.map((entry) => entry.id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry);
  return [...cart, { ...item, quantity: 1 }];
}

export function updateQuantity(cart, itemId, quantity) {
  if (quantity <= 0) return cart.filter((item) => item.id !== itemId);
  return cart.map((item) => item.id === itemId ? { ...item, quantity } : item);
}

export function cartTotal(cart) {
  return cart.reduce((total, item) => total + Number(item.price) * item.quantity, 0).toFixed(2);
}
