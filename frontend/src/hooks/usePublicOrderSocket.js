import { useEffect, useRef, useState } from "react";
import { createMenuSocket } from "../realtime/socket-client";

export default function usePublicOrderSocket(trackingToken, { onEvent, onReconnect }) {
  const eventRef = useRef(onEvent);
  const reconnectRef = useRef(onReconnect);
  const [status, setStatus] = useState("offline");

  useEffect(() => {
    eventRef.current = onEvent;
    reconnectRef.current = onReconnect;
  }, [onEvent, onReconnect]);

  useEffect(() => {
    if (!trackingToken) return undefined;

    const socket = createMenuSocket();
    const subscribe = () => {
      setStatus("connecting");
      socket.emit("order:subscribe", { trackingToken }, (result) => {
        if (result?.ok) {
          setStatus("connected");
          reconnectRef.current?.();
        } else {
          setStatus("unavailable");
        }
      });
    };
    const handleConnect = () => subscribe();
    const handleDisconnect = () => setStatus("offline");
    const handleConnectError = () => setStatus("error");
    const handleOrder = (order) => eventRef.current?.(order);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("order:created", handleOrder);
    socket.on("order:updated", handleOrder);
    socket.on("order:eta_updated", handleOrder);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("order:created", handleOrder);
      socket.off("order:updated", handleOrder);
      socket.off("order:eta_updated", handleOrder);
      socket.disconnect();
    };
  }, [trackingToken]);

  return status;
}
