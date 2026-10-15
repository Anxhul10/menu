import { createServer } from "node:http";
import jwt from "jsonwebtoken";
import { io as createClient } from "socket.io-client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../src/app.js";
import { env } from "../src/config/env.js";
import { createRealtimeServer } from "../src/realtime/socket.js";
import {
  ORDER_CREATED,
  publishOrderEvent,
} from "../src/realtime/order-events.js";

const mocks = vi.hoisted(() => ({
  restaurantFindFirst: vi.fn(),
  orderFindUnique: vi.fn(),
}));

vi.mock("../src/database/prisma.js", () => ({
  prisma: {
    restaurant: { findFirst: mocks.restaurantFindFirst },
    order: { findUnique: mocks.orderFindUnique },
  },
}));

const userId = "11111111-1111-4111-8111-111111111111";
const otherUserId = "22222222-2222-4222-8222-222222222222";
const restaurantId = "33333333-3333-4333-8333-333333333333";
const trackingToken = "a".repeat(43);

function tokenFor(subject) {
  return jwt.sign({ type: "access" }, env.jwtSecret, {
    subject,
    issuer: "menu-api",
    audience: "menu-client",
    expiresIn: "1h",
  });
}

function ownerRestaurant() {
  return {
    id: restaurantId,
    name: "Test Restaurant",
    slug: "test-restaurant",
    description: null,
    address: null,
    isActive: true,
    ownerId: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function publicOrder() {
  return {
    id: "44444444-4444-4444-8444-444444444444",
    restaurantId,
    restaurantTableId: "55555555-5555-4555-8555-555555555555",
    status: "PENDING",
    paymentMethod: "CASH",
    paymentStatus: "PAYMENT_DUE",
    paymentCollectedAt: null,
    totalAmount: "12.50",
    trackingToken,
    customerName: null,
    customerContact: null,
    estimatedReadyAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [],
    restaurant: { name: "Test Restaurant", slug: "test-restaurant" },
    restaurantTable: { tableNumber: "1" },
  };
}

function listen(server) {
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve(server.address().port)),
  );
}

function closeServer(server, io) {
  return new Promise((resolve) => io.close(() => server.close(resolve)));
}

describe("Socket.IO realtime authorization", () => {
  let server;
  let io;
  let url;
  const clients = [];

  beforeEach(async () => {
    mocks.restaurantFindFirst.mockReset();
    mocks.orderFindUnique.mockReset();
    server = createServer(app);
    io = createRealtimeServer(server);
    const port = await listen(server);
    url = `http://127.0.0.1:${port}`;
  });

  afterEach(async () => {
    for (const client of clients.splice(0)) client.close();
    await closeServer(server, io);
  });

  it("rejects an invalid owner token during the socket handshake", async () => {
    const client = createClient(url, {
      auth: { token: "invalid-token" },
      reconnection: false,
    });
    clients.push(client);

    const error = await new Promise((resolve) =>
      client.once("connect_error", resolve),
    );

    expect(error.message).toBe("Invalid or expired authentication token");
  });

  it("authorizes an owner room and forwards only the persisted owner payload", async () => {
    mocks.restaurantFindFirst.mockResolvedValue(ownerRestaurant());
    const client = createClient(url, {
      auth: { token: tokenFor(userId) },
      reconnection: false,
    });
    clients.push(client);
    await new Promise((resolve) => client.once("connect", resolve));

    const subscription = await new Promise((resolve) => {
      client.emit("restaurant:subscribe", { restaurantId }, resolve);
    });
    expect(subscription).toEqual({ ok: true, restaurantId });

    const ownerOrder = {
      orderId: "order-1",
      status: "PENDING",
      totalAmount: "12.50",
    };
    const publicOrderPayload = {
      orderId: "order-1",
      status: "PENDING",
      totalAmount: "12.50",
    };
    const received = new Promise((resolve) =>
      client.once(ORDER_CREATED, resolve),
    );
    publishOrderEvent(ORDER_CREATED, {
      restaurantId,
      trackingToken,
      ownerOrder,
      publicOrder: publicOrderPayload,
    });

    await expect(received).resolves.toEqual(ownerOrder);
  });

  it("rejects a cross-tenant restaurant subscription", async () => {
    mocks.restaurantFindFirst.mockResolvedValue(null);
    const client = createClient(url, {
      auth: { token: tokenFor(otherUserId) },
      reconnection: false,
    });
    clients.push(client);
    await new Promise((resolve) => client.once("connect", resolve));

    const subscription = await new Promise((resolve) => {
      client.emit("restaurant:subscribe", { restaurantId }, resolve);
    });

    expect(subscription).toEqual({ ok: false, error: "Restaurant not found" });
  });

  it("allows a tracking-token subscriber and sends the public payload", async () => {
    mocks.orderFindUnique.mockResolvedValue(publicOrder());
    const client = createClient(url, { reconnection: false });
    clients.push(client);
    await new Promise((resolve) => client.once("connect", resolve));

    const subscription = await new Promise((resolve) => {
      client.emit("order:subscribe", { trackingToken }, resolve);
    });
    expect(subscription).toEqual({ ok: true });

    const publicPayload = { orderId: "order-1", status: "READY" };
    const received = new Promise((resolve) =>
      client.once("order:updated", resolve),
    );
    publishOrderEvent("order:updated", {
      restaurantId,
      trackingToken,
      ownerOrder: { ...publicPayload, customerContact: "private" },
      publicOrder: publicPayload,
    });

    await expect(received).resolves.toEqual(publicPayload);
  });
});
