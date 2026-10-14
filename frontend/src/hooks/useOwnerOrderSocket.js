import { useEffect, useRef, useState } from "react";
import { createMenuSocket } from "../realtime/socket-client";

export default function useOwnerOrderSocket(
  restaurantId,
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
    if (!restaurantId) return undefined;

    const socket = createMenuSocket({ authenticated: true });
    const eventNames = ["order:created", "order:updated", "order:eta_updated"];
    const subscribe = () => {
      setStatus("connecting");
      socket.emit("restaurant:subscribe", { restaurantId }, (result) => {
        if (result?.ok) {
          setStatus("connected");
          reconnectRef.current?.();
        } else {
          setStatus("unauthorized");
        }
      });
    };
    const handleConnect = () => subscribe();
    const handleDisconnect = () => setStatus("offline");
    const handleConnectError = () => setStatus("error");

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    for (const eventName of eventNames)
      socket.on(eventName, (order) => eventRef.current?.(order));

    return () => {
      socket.emit("restaurant:unsubscribe", { restaurantId });
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      for (const eventName of eventNames) socket.removeAllListeners(eventName);
      socket.disconnect();
    };
  }, [restaurantId]);

  return status;
}
