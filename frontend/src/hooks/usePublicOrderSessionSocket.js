import { useEffect, useRef, useState } from "react";
import { createMenuSocket } from "../realtime/socket-client";
export default function usePublicOrderSessionSocket(
  tableQrToken,
  orderingSessionToken,
  { onEvent, onReconnect },
) {
  const eventRef = useRef(onEvent);
  const reconnectRef = useRef(onReconnect);
  const [status, setStatus] = useState("offline");
  useEffect(() => {
    eventRef.current = onEvent;
    reconnectRef.current = onReconnect;
  }, [onEvent, onReconnect]);
  useEffect(() => {
    if (!tableQrToken || !orderingSessionToken) return undefined;
    const socket = createMenuSocket();
    const subscribe = () => {
      setStatus("connecting");
      socket.emit(
        "order-session:subscribe",
        { tableQrToken, orderingSessionToken },
        (result) => {
          if (result?.ok) {
            setStatus("connected");
            reconnectRef.current?.();
          } else setStatus("unavailable");
        },
      );
    };
    const handleEvent = (order) => eventRef.current?.(order);
    socket.on("connect", subscribe);
    socket.on("disconnect", () => setStatus("offline"));
    socket.on("connect_error", () => setStatus("error"));
    socket.on("order:created", handleEvent);
    socket.on("order:updated", handleEvent);
    socket.on("order:eta_updated", handleEvent);
    return () => {
      socket.off("connect", subscribe);
      socket.off("order:created", handleEvent);
      socket.off("order:updated", handleEvent);
      socket.off("order:eta_updated", handleEvent);
      socket.disconnect();
    };
  }, [tableQrToken, orderingSessionToken]);
  return status;
}
