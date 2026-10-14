const baseUrl = (import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api").replace(/\/$/, "");
const tokenKey = "menu_access_token";

export function getToken() {
  return window.sessionStorage.getItem(tokenKey);
}

export function setToken(token) {
  window.sessionStorage.setItem(tokenKey, token);
}

export function clearToken() {
  window.sessionStorage.removeItem(tokenKey);
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  } catch {
    throw new ApiError("Unable to reach the Menu server.", 0);
  }

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    if (response.status === 401) clearToken();
    throw new ApiError(payload?.error?.message || "Something went wrong.", response.status);
  }
  return payload;
}

const json = (method, path, body) => request(path, { method, body: JSON.stringify(body) });

export const api = {
  register: (body) => json("POST", "/auth/register", body),
  login: (body) => json("POST", "/auth/login", body),
  me: () => request("/auth/me"),
  restaurants: () => request("/restaurants"),
  createRestaurant: (body) => json("POST", "/restaurants", body),
  categories: (restaurantId) => request(`/restaurants/${restaurantId}/categories`),
  createCategory: (restaurantId, body) => json("POST", `/restaurants/${restaurantId}/categories`, body),
  updateCategory: (restaurantId, categoryId, body) => json("PATCH", `/restaurants/${restaurantId}/categories/${categoryId}`, body),
  deleteCategory: (restaurantId, categoryId) => request(`/restaurants/${restaurantId}/categories/${categoryId}`, { method: "DELETE" }),
  items: (restaurantId) => request(`/restaurants/${restaurantId}/items`),
  createItem: (restaurantId, body) => json("POST", `/restaurants/${restaurantId}/items`, body),
  updateItem: (restaurantId, itemId, body) => json("PATCH", `/restaurants/${restaurantId}/items/${itemId}`, body),
  deleteItem: (restaurantId, itemId) => request(`/restaurants/${restaurantId}/items/${itemId}`, { method: "DELETE" }),
  availability: (restaurantId, itemId, isAvailable) => json("PATCH", `/restaurants/${restaurantId}/items/${itemId}/availability`, { isAvailable }),
  tables: (restaurantId) => request(`/restaurants/${restaurantId}/tables`),
  createTable: (restaurantId, body) => json("POST", `/restaurants/${restaurantId}/tables`, body),
  updateTableAvailability: (restaurantId, tableId, isActive) => json("PATCH", `/restaurants/${restaurantId}/tables/${tableId}/availability`, { isActive }),
  tableQr: (restaurantId, tableId) => request(`/restaurants/${restaurantId}/tables/${tableId}/qr`),
  orders: (restaurantId, params = {}) => request(`/restaurants/${restaurantId}/orders?${new URLSearchParams(params)}`),
  updateOrderStatus: (restaurantId, orderId, status) => json("PATCH", `/restaurants/${restaurantId}/orders/${orderId}/status`, { status }),
  updateOrderEta: (restaurantId, orderId, estimatedReadyAt) => json("PATCH", `/restaurants/${restaurantId}/orders/${orderId}/eta`, { estimatedReadyAt }),
  collectPayment: (restaurantId, orderId) => request(`/restaurants/${restaurantId}/orders/${orderId}/payment`, { method: "PATCH" }),
  publicTable: (token) => request(`/public/tables/${encodeURIComponent(token)}`),
  publicMenu: (slug) => request(`/public/restaurants/${encodeURIComponent(slug)}/menu`),
  placeOrder: (body) => json("POST", "/public/orders", body),
  trackOrder: (trackingToken) => request(`/public/orders/${encodeURIComponent(trackingToken)}`)
};
