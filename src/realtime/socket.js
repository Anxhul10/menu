import { Server } from "socket.io";
import { env } from "../config/env.js";
import { verifyAccessToken } from "../services/auth.service.js";
import { getRestaurant } from "../services/restaurant.service.js";
import { getPublicOrder } from "../services/order.service.js";
import {
  ORDER_CREATED,
  ORDER_ETA_UPDATED,
  ORDER_UPDATED,
  orderEvents
} from "./order-events.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const trackingTokenPattern = /^[A-Za-z0-9_-]{32,100}$/;

function restaurantRoom(restaurantId) {
  return `restaurant:${restaurantId}`;
}

function orderRoom(trackingToken) {
  return `order:${trackingToken}`;
}

function readSocketToken(socket) {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === "string" && authToken.length > 0) return authToken;

  const authorization = socket.handshake.headers.authorization;
  if (typeof authorization === "string" && authorization.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  return null;
}

function acknowledge(acknowledgement, result) {
  if (typeof acknowledgement === "function") acknowledgement(result);
}

function validationError(message) {
  return { ok: false, error: message };
}

async function authorizeRestaurantSubscription(socket, input, acknowledgement) {
  if (!socket.data.userId) {
    acknowledge(acknowledgement, validationError("Authentication required"));
    return;
  }

  if (!input || typeof input.restaurantId !== "string" || !uuidPattern.test(input.restaurantId)) {
    acknowledge(acknowledgement, validationError("Restaurant not found"));
    return;
  }

  try {
    await getRestaurant(socket.data.userId, input.restaurantId);
    const room = restaurantRoom(input.restaurantId);
    await socket.join(room);
    socket.data.restaurantRooms ??= new Set();
    socket.data.restaurantRooms.add(room);
    acknowledge(acknowledgement, { ok: true, restaurantId: input.restaurantId });
  } catch (error) {
    acknowledge(acknowledgement, validationError(error.statusCode === 404 ? "Restaurant not found" : "Unable to subscribe"));
  }
}

async function subscribeToPublicOrder(socket, input, acknowledgement) {
  const trackingToken = input?.trackingToken;
  if (typeof trackingToken !== "string" || !trackingTokenPattern.test(trackingToken)) {
    acknowledge(acknowledgement, validationError("Order not found"));
    return;
  }

  try {
    await getPublicOrder(trackingToken);
    const room = orderRoom(trackingToken);
    await socket.join(room);
    socket.data.orderRooms ??= new Set();
    socket.data.orderRooms.add(room);
    acknowledge(acknowledgement, { ok: true });
  } catch {
    acknowledge(acknowledgement, validationError("Order not found"));
  }
}

function registerEventForwarders(io) {
  const forward = (eventName, payload) => {
    io.to(restaurantRoom(payload.restaurantId)).emit(eventName, payload.ownerOrder);
    io.to(orderRoom(payload.trackingToken)).emit(eventName, payload.publicOrder);
  };

  const handlers = new Map([
    [ORDER_CREATED, (payload) => forward(ORDER_CREATED, payload)],
    [ORDER_UPDATED, (payload) => forward(ORDER_UPDATED, payload)],
    [ORDER_ETA_UPDATED, (payload) => forward(ORDER_ETA_UPDATED, payload)]
  ]);

  for (const [eventName, handler] of handlers) orderEvents.on(eventName, handler);
  return () => {
    for (const [eventName, handler] of handlers) orderEvents.off(eventName, handler);
  };
}

export function createRealtimeServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.corsOrigins,
      methods: ["GET", "POST"]
    }
  });

  io.use((socket, next) => {
    const token = readSocketToken(socket);
    if (!token) return next();

    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      return next();
    } catch {
      return next(new Error("Invalid or expired authentication token"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("restaurant:subscribe", (input, acknowledgement) => {
      authorizeRestaurantSubscription(socket, input, acknowledgement);
    });

    socket.on("restaurant:unsubscribe", async (input, acknowledgement) => {
      if (typeof input?.restaurantId === "string" && uuidPattern.test(input.restaurantId)) {
        const room = restaurantRoom(input.restaurantId);
        await socket.leave(room);
        socket.data.restaurantRooms?.delete(room);
      }
      acknowledge(acknowledgement, { ok: true });
    });

    socket.on("order:subscribe", (input, acknowledgement) => {
      subscribeToPublicOrder(socket, input, acknowledgement);
    });
  });

  const removeEventForwarders = registerEventForwarders(io);
  io.once("close", removeEventForwarders);
  return io;
}
