import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  prisma: {
    restaurant: { findFirst: vi.fn() },
    restaurantTable: { findFirst: vi.fn() },
    menuItem: { findMany: vi.fn() },
    order: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn()
    },
    orderItem: { create: vi.fn() },
    $transaction: vi.fn()
  }
}));

vi.mock("../src/database/prisma.js", () => database);

const { app } = await import("../src/app.js");
const { orderEvents } = await import("../src/realtime/order-events.js");

const ownerId = "11111111-1111-4111-8111-111111111111";
const otherOwnerId = "33333333-3333-4333-8333-333333333333";
const restaurantId = "22222222-2222-4222-8222-222222222222";
const tableId = "44444444-4444-4444-8444-444444444444";
const itemId = "66666666-6666-4666-8666-666666666666";
const secondItemId = "77777777-7777-4777-8777-777777777777";
const orderId = "88888888-8888-4888-8888-888888888888";
const tableQrToken = "abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG";
const trackingToken = "ZYXWVUTSRQPONMLKJIHGFEDCBA0987654321";

function ownerToken(userId = ownerId) {
  return jwt.sign(
    { type: "access" },
    process.env.JWT_SECRET,
    { subject: userId, issuer: "menu-api", audience: "menu-client", expiresIn: "1h" }
  );
}

function menuItem(overrides = {}) {
  return {
    id: itemId,
    restaurantId,
    name: "Paneer Tikka",
    price: "12.50",
    isAvailable: true,
    ...overrides
  };
}

function order(overrides = {}) {
  return {
    id: orderId,
    restaurantId,
    restaurantTableId: tableId,
    status: "PENDING",
    paymentMethod: "CASH",
    paymentStatus: "PAYMENT_DUE",
    totalAmount: "12.50",
    trackingToken,
    customerName: "Sam",
    customerContact: null,
    estimatedReadyAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    items: [],
    restaurantTable: { tableNumber: "12" },
    ...overrides
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  database.prisma.$transaction.mockImplementation((callback) => callback(database.prisma));
  database.prisma.restaurant.findFirst.mockResolvedValue({ id: restaurantId, isActive: true });
  database.prisma.restaurantTable.findFirst.mockResolvedValue({ id: tableId, restaurantId });
  database.prisma.menuItem.findMany.mockResolvedValue([menuItem()]);
  database.prisma.order.create.mockResolvedValue(order());
  database.prisma.orderItem.create.mockImplementation(async ({ data }) => ({
    id: "99999999-9999-4999-8999-999999999999",
    ...data
  }));
  database.prisma.order.findUnique.mockResolvedValue(order());
  database.prisma.order.findFirst.mockResolvedValue(order());
  database.prisma.order.findMany.mockResolvedValue([order()]);
  database.prisma.order.count.mockResolvedValue(1);
  database.prisma.order.update.mockResolvedValue(order({ status: "ACCEPTED" }));
  database.prisma.order.updateMany.mockResolvedValue({ count: 1 });
});

const validOrder = () => ({
  tableQrToken,
  paymentMethod: "CASH",
  customerName: "Sam",
  items: [{ menuItemId: itemId, quantity: 1 }]
});

describe("POST /api/public/orders", () => {
  it("creates a guest cash order without authentication", async () => {
    const response = await request(app).post("/api/public/orders").send(validOrder());

    expect(response.status).toBe(201);
    expect(response.body.order.status).toBe("PENDING");
    expect(response.body.order.paymentMethod).toBe("CASH");
    expect(response.body.order.paymentStatus).toBe("PAYMENT_DUE");
    expect(response.body.order.trackingToken).toBe(trackingToken);
    expect(database.prisma.$transaction).toHaveBeenCalled();
    expect(database.prisma.order.create.mock.calls[0][0].data).not.toHaveProperty("total");
  });

  it("calculates totals and snapshots current item data on the server", async () => {
    database.prisma.menuItem.findMany.mockResolvedValue([
      menuItem(),
      menuItem({ id: secondItemId, name: "Naan", price: "3.25" })
    ]);
    database.prisma.order.create.mockResolvedValue(order({ totalAmount: "19.00" }));

    const response = await request(app).post("/api/public/orders").send({
      ...validOrder(),
      items: [
        { menuItemId: itemId, quantity: 1 },
        { menuItemId: secondItemId, quantity: 2 }
      ]
    });

    expect(response.status).toBe(201);
    const orderData = database.prisma.order.create.mock.calls[0][0].data;
    expect(orderData.totalAmount.toString()).toBe("19");
    const lineItems = database.prisma.orderItem.create.mock.calls.map(([call]) => call.data);
    expect(lineItems[0]).toEqual(expect.objectContaining({ itemName: "Paneer Tikka", unitPrice: expect.objectContaining({ d: expect.anything() }), quantity: 1 }));
    expect(lineItems[1]).toEqual(expect.objectContaining({ itemName: "Naan", quantity: 2 }));
  });

  it("rejects invalid tokens, unavailable items, unsupported payments, and bad quantities", async () => {
    const invalidToken = await request(app).post("/api/public/orders").send({ ...validOrder(), tableQrToken: "invalid" });
    database.prisma.restaurantTable.findFirst.mockResolvedValue(null);
    const inactiveTable = await request(app).post("/api/public/orders").send(validOrder());
    database.prisma.restaurantTable.findFirst.mockResolvedValue({ id: tableId, restaurantId });
    database.prisma.menuItem.findMany.mockResolvedValue([]);
    const unavailableItem = await request(app).post("/api/public/orders").send(validOrder());
    const unsupportedPayment = await request(app).post("/api/public/orders").send({ ...validOrder(), paymentMethod: "UPI" });
    const invalidQuantity = await request(app).post("/api/public/orders").send({
      ...validOrder(),
      items: [{ menuItemId: itemId, quantity: 0 }]
    });

    expect(invalidToken.status).toBe(400);
    expect(inactiveTable.status).toBe(400);
    expect(unavailableItem.status).toBe(400);
    expect(unsupportedPayment.status).toBe(400);
    expect(invalidQuantity.status).toBe(400);
  });

  it("rejects duplicate items and items from another restaurant", async () => {
    const duplicateItems = await request(app).post("/api/public/orders").send({
      ...validOrder(),
      items: [{ menuItemId: itemId, quantity: 1 }, { menuItemId: itemId, quantity: 2 }]
    });
    database.prisma.menuItem.findMany.mockResolvedValue([]);
    const foreignItem = await request(app).post("/api/public/orders").send(validOrder());

    expect(duplicateItems.status).toBe(400);
    expect(foreignItem.status).toBe(400);
  });

  it("rolls back when an order item cannot be created", async () => {
    database.prisma.orderItem.create.mockRejectedValue(new Error("write failed"));
    const eventSpy = vi.spyOn(orderEvents, "emit");

    const response = await request(app).post("/api/public/orders").send(validOrder());

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: { message: "Internal server error" } });
    expect(database.prisma.$transaction).toHaveBeenCalled();
    expect(eventSpy).not.toHaveBeenCalledWith("order:created", expect.anything());
  });
});

describe("public order tracking", () => {
  it("uses the tracking token instead of treating an order ID as authorization", async () => {
    const response = await request(app).get(`/api/public/orders/${trackingToken}`);

    expect(response.status).toBe(200);
    expect(response.body.order.orderId).toBe(orderId);
    expect(response.body.order.paymentStatus).toBe("PAYMENT_DUE");
    expect(response.body.order).not.toHaveProperty("restaurantId");
    expect(response.body.order).not.toHaveProperty("customerContact");
  });

  it("does not expose an order for an invalid tracking token", async () => {
    database.prisma.order.findUnique.mockResolvedValue(null);

    const response = await request(app).get(`/api/public/orders/${trackingToken}`);

    expect(response.status).toBe(404);
  });
});

describe("owner order management", () => {
  it("lists orders with pagination and retrieves an owned order", async () => {
    const listResponse = await request(app)
      .get(`/api/restaurants/${restaurantId}/orders?page=2&pageSize=10`)
      .set("Authorization", `Bearer ${ownerToken()}`);
    const getResponse = await request(app)
      .get(`/api/restaurants/${restaurantId}/orders/${orderId}`)
      .set("Authorization", `Bearer ${ownerToken()}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.pagination).toEqual({ page: 2, pageSize: 10, total: 1, totalPages: 1 });
    expect(getResponse.status).toBe(200);
    expect(database.prisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { restaurantId },
      skip: 10,
      take: 10
    }));
  });

  it("filters order listings by status", async () => {
    const response = await request(app)
      .get(`/api/restaurants/${restaurantId}/orders?status=PREPARING`)
      .set("Authorization", `Bearer ${ownerToken()}`);

    expect(response.status).toBe(200);
    expect(database.prisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { restaurantId, status: "PREPARING" }
    }));
  });

  it("rejects an invalid status filter", async () => {
    const response = await request(app)
      .get(`/api/restaurants/${restaurantId}/orders?status=UNKNOWN`)
      .set("Authorization", `Bearer ${ownerToken()}`);

    expect(response.status).toBe(400);
  });

  it("enforces valid status transitions and keeps cash unpaid", async () => {
    const acceptedResponse = await request(app)
      .patch(`/api/restaurants/${restaurantId}/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${ownerToken()}`)
      .send({ status: "ACCEPTED" });
    database.prisma.order.findFirst.mockResolvedValue(order({ status: "COMPLETED" }));
    const invalidResponse = await request(app)
      .patch(`/api/restaurants/${restaurantId}/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${ownerToken()}`)
      .send({ status: "PREPARING" });

    expect(acceptedResponse.status).toBe(200);
    expect(acceptedResponse.body.order.paymentStatus).toBe("PAYMENT_DUE");
    expect(invalidResponse.status).toBe(409);
    expect(database.prisma.order.updateMany.mock.calls[0][0].data).toEqual({ status: "ACCEPTED" });
  });

  it("rejects a concurrent status update when the stored status changed", async () => {
    database.prisma.order.updateMany.mockResolvedValue({ count: 0 });

    const response = await request(app)
      .patch(`/api/restaurants/${restaurantId}/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${ownerToken()}`)
      .send({ status: "ACCEPTED" });

    expect(response.status).toBe(409);
    expect(response.body.error.message).toContain("changed");
  });

  it("updates estimated ready time and blocks cross-tenant access", async () => {
    const etaResponse = await request(app)
      .patch(`/api/restaurants/${restaurantId}/orders/${orderId}/eta`)
      .set("Authorization", `Bearer ${ownerToken()}`)
      .send({ estimatedReadyAt: "2026-01-01T12:00:00.000Z" });
    database.prisma.restaurant.findFirst.mockResolvedValue(null);
    const crossTenantResponse = await request(app)
      .get(`/api/restaurants/${restaurantId}/orders/${orderId}`)
      .set("Authorization", `Bearer ${ownerToken(otherOwnerId)}`);

    expect(etaResponse.status).toBe(200);
    expect(crossTenantResponse.status).toBe(404);
  });

  it("rejects invalid ETA timestamps and prevents unrelated fields", async () => {
    const invalidResponse = await request(app)
      .patch(`/api/restaurants/${restaurantId}/orders/${orderId}/eta`)
      .set("Authorization", `Bearer ${ownerToken()}`)
      .send({ estimatedReadyAt: "not-a-date", status: "COMPLETED" });

    expect(invalidResponse.status).toBe(400);
    expect(database.prisma.order.updateMany).not.toHaveBeenCalled();
  });

  it("records cash collection separately from order status", async () => {
    database.prisma.order.findFirst
      .mockResolvedValueOnce(order())
      .mockResolvedValueOnce(order({ paymentStatus: "PAID", paymentCollectedAt: new Date() }));

    const response = await request(app)
      .patch(`/api/restaurants/${restaurantId}/orders/${orderId}/payment`)
      .set("Authorization", `Bearer ${ownerToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.order.paymentStatus).toBe("PAID");
    expect(database.prisma.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ paymentStatus: "PAYMENT_DUE", paymentMethod: "CASH" }),
      data: expect.objectContaining({ paymentStatus: "PAID", paymentCollectedAt: expect.any(Date) })
    }));
  });

  it("rejects duplicate and non-cash collection attempts", async () => {
    database.prisma.order.findFirst.mockResolvedValueOnce(order({ paymentStatus: "PAID" }));
    const duplicateResponse = await request(app)
      .patch(`/api/restaurants/${restaurantId}/orders/${orderId}/payment`)
      .set("Authorization", `Bearer ${ownerToken()}`);
    database.prisma.order.findFirst.mockResolvedValueOnce(order({ paymentMethod: "UPI" }));
    const nonCashResponse = await request(app)
      .patch(`/api/restaurants/${restaurantId}/orders/${orderId}/payment`)
      .set("Authorization", `Bearer ${ownerToken()}`);

    expect(duplicateResponse.status).toBe(409);
    expect(nonCashResponse.status).toBe(400);
  });

  it("rejects a concurrent duplicate cash collection", async () => {
    database.prisma.order.updateMany.mockResolvedValue({ count: 0 });

    const response = await request(app)
      .patch(`/api/restaurants/${restaurantId}/orders/${orderId}/payment`)
      .set("Authorization", `Bearer ${ownerToken()}`);

    expect(response.status).toBe(409);
    expect(response.body.error.message).toContain("changed");
  });

  it("requires authentication for owner order endpoints", async () => {
    const response = await request(app).get(`/api/restaurants/${restaurantId}/orders`);

    expect(response.status).toBe(401);
    expect(database.prisma.order.findMany).not.toHaveBeenCalled();
  });
});
