const contextKey = "menu_table_context";
const tokenPrefix = "menu_order_session:";

function storage() {
  return typeof window === "undefined" ? null : window.sessionStorage;
}
export function readTableContext() {
  try {
    return JSON.parse(storage()?.getItem(contextKey) || "null");
  } catch {
    return null;
  }
}
export function writeTableContext(value) {
  storage()?.setItem(contextKey, JSON.stringify(value));
}
export function readOrderingSessionToken(qrToken) {
  return qrToken
    ? storage()?.getItem(`${tokenPrefix}${qrToken}`) || null
    : null;
}
export function writeOrderingSessionToken(qrToken, value) {
  if (qrToken && value) storage()?.setItem(`${tokenPrefix}${qrToken}`, value);
}
