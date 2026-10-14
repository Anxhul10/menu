import { describe, expect, it } from "vitest";
import { addToCart, cartTotal, updateQuantity } from "../utils/cart";

describe("cart utilities", () => {
  it("adds items and combines repeated items", () => {
    const item = { id: "item-1", name: "Pizza", price: "12.50" };

    expect(addToCart([], item)).toEqual([{ ...item, quantity: 1 }]);
    expect(addToCart(addToCart([], item), item)).toEqual([{ ...item, quantity: 2 }]);
  });

  it("updates quantities and removes zero-quantity items", () => {
    const cart = [{ id: "item-1", name: "Pizza", price: "12.50", quantity: 2 }];

    expect(updateQuantity(cart, "item-1", 3)[0].quantity).toBe(3);
    expect(updateQuantity(cart, "item-1", 0)).toEqual([]);
  });

  it("calculates a display total from decimal price strings", () => {
    const cart = [
      { id: "item-1", price: "12.50", quantity: 2 },
      { id: "item-2", price: "3.25", quantity: 1 },
    ];

    expect(cartTotal(cart)).toBe("28.25");
  });
});
