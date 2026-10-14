import { io } from "socket.io-client";
import { getToken } from "../api/client";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api").replace(/\/$/, "");
const socketUrl = (import.meta.env.VITE_SOCKET_URL || apiBaseUrl.replace(/\/api$/, "")).replace(/\/$/, "");

export function createMenuSocket({ authenticated = false } = {}) {
  const options = {
    autoConnect: true,
    transports: ["websocket", "polling"]
  };
  if (authenticated) options.auth = (callback) => callback({ token: getToken() });
  return io(socketUrl, options);
}
