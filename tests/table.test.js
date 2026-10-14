import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  prisma: {
    restaurant: { findFirst: vi.fn() },
    restaurantTable: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn()
    }
  }
}));

vi.mock("../src/database/prisma.js", () => database);

const { app } = await import("../src/app.js");

const ownerId = "11111111-1111-4111-8111-111111111111";
const otherOwnerId = "33333333-3333-4333-8333-333333333333";
const restaurantId = "22222222-2222-4222-8222-222222222222";
const otherRestaurantId = "77777777-7777-4777-8777-777777777777";
const tableId = "44444444-4444-4444-8444-444444444444";
const qrToken = "abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG";

function tokenFor(userId = ownerId) {
  return jwt.sign(
    { type: "access" },
    process.env.JWT_SECRET,
    { subject: userId, issuer: "menu-api", audience: "menu-client", expiresIn: "1h" }
  );
}

function table(overrides = {}) {
  return {
    id: tableId,
    restaurantId,
    tableNumber: "12",
    qrToken,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  database.prisma.restaurant.findFirst.mockResolvedValue({
    id: restaurantId,
    slug: "spice-garden",
    name: "Spice Garden",
    isActive: true
  });
  database.prisma.restaurantTable.create.mockImplementation(async ({ data }) => table(data));
  database.prisma.restaurantTable.findMany.mockResolvedValue([table()]);
  database.prisma.restaurantTable.findFirst.mockResolvedValue(table());
  database.prisma.restaurantTable.update.mockImplementation(async ({ data }) => table(data));
});

describe("table management", () => {
  it("creates a table with a secure server-generated unique token", async () => {
    const firstResponse = await request(app)
      .post(`/api/restaurants/${restaurantId}/tables`)
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ tableNumber: "12" });
    const secondResponse = await request(app)
      .post(`/api/restaurants/${otherRestaurantId}/tables`)
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ tableNumber: "12" });

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(201);
    const firstToken = database.prisma.restaurantTable.create.mock.calls[0][0].data.qrToken;
    const secondToken = database.prisma.restaurantTable.create.mock.calls[1][0].data.qrToken;
    expect(firstToken).toEqual(expect.any(String));
    expect(firstToken.length).toBeGreaterThanOrEqual(40);
    expect(firstToken).not.toBe(secondToken);
    expect(database.prisma.restaurantTable.create.mock.calls[0][0].data).not.toHaveProperty("id");
  });

  it("rejects duplicate table numbers within a restaurant", async () => {
    database.prisma.restaurantTable.create.mockRejectedValue({ code: "P2002" });

    const response = await request(app)
      .post(`/api/restaurants/${restaurantId}/tables`)
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ tableNumber: "12" });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: { message: "Table number already exists for this restaurant" } });
  });

  it("allows the same table number in another restaurant", async () => {
    const response = await request(app)
      .post(`/api/restaurants/${otherRestaurantId}/tables`)
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ tableNumber: "12" });

    expect(response.status).toBe(201);
    expect(database.prisma.restaurantTable.create.mock.calls[0][0].data.restaurantId).toBe(otherRestaurantId);
  });

  it("lists, retrieves, and updates owned tables", async () => {
    const listResponse = await request(app)
      .get(`/api/restaurants/${restaurantId}/tables`)
      .set("Authorization", `Bearer ${tokenFor()}`);
    const getResponse = await request(app)
      .get(`/api/restaurants/${restaurantId}/tables/${tableId}`)
      .set("Authorization", `Bearer ${tokenFor()}`);
    const updateResponse = await request(app)
      .patch(`/api/restaurants/${restaurantId}/tables/${tableId}`)
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ tableNumber: "13" });

    expect(listResponse.status).toBe(200);
    expect(getResponse.status).toBe(200);
    expect(updateResponse.status).toBe(200);
    expect(database.prisma.restaurantTable.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { restaurantId }
    }));
  });

  it("activates and deactivates a table", async () => {
    const response = await request(app)
      .patch(`/api/restaurants/${restaurantId}/tables/${tableId}/availability`)
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ isActive: false });

    expect(response.status).toBe(200);
    expect(database.prisma.restaurantTable.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: tableId },
      data: { isActive: false }
    }));
  });
});

describe("table authorization and QR codes", () => {
  it("rejects unauthenticated management requests", async () => {
    const response = await request(app).get(`/api/restaurants/${restaurantId}/tables`);

    expect(response.status).toBe(401);
    expect(database.prisma.restaurantTable.findMany).not.toHaveBeenCalled();
  });

  it("prevents another owner from accessing or changing tables", async () => {
    database.prisma.restaurant.findFirst.mockResolvedValue(null);

    const getResponse = await request(app)
      .get(`/api/restaurants/${restaurantId}/tables/${tableId}`)
      .set("Authorization", `Bearer ${tokenFor(otherOwnerId)}`);
    const updateResponse = await request(app)
      .patch(`/api/restaurants/${restaurantId}/tables/${tableId}`)
      .set("Authorization", `Bearer ${tokenFor(otherOwnerId)}`)
      .send({ tableNumber: "99" });

    expect(getResponse.status).toBe(404);
    expect(updateResponse.status).toBe(404);
    expect(database.prisma.restaurantTable.update).not.toHaveBeenCalled();
  });

  it("generates a QR data URL with the configured customer URL", async () => {
    const response = await request(app)
      .get(`/api/restaurants/${restaurantId}/tables/${tableId}/qr`)
      .set("Authorization", `Bearer ${tokenFor()}`);

    expect(response.status).toBe(200);
    expect(response.body.url).toBe(`https://menu.example.test/r/spice-garden/t/${qrToken}`);
    expect(response.body.imageDataUrl).toMatch(/^data:image\/png;base64,/);
  });
});

describe("public table resolution", () => {
  it("resolves an active QR token without authentication or internal IDs", async () => {
    database.prisma.restaurantTable.findFirst.mockResolvedValue({
      tableNumber: "12",
      isActive: true,
      restaurant: { name: "Spice Garden", slug: "spice-garden", isActive: true }
    });

    const response = await request(app).get(`/api/public/tables/${qrToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      restaurant: { name: "Spice Garden", slug: "spice-garden" },
      table: { tableNumber: "12", isActive: true }
    });
    expect(response.body).not.toHaveProperty("id");
  });

  it("rejects invalid and inactive QR tokens", async () => {
    const invalidResponse = await request(app).get("/api/public/tables/short-token");
    database.prisma.restaurantTable.findFirst.mockResolvedValue(null);
    const inactiveResponse = await request(app).get(`/api/public/tables/${qrToken}`);

    expect(invalidResponse.status).toBe(404);
    expect(inactiveResponse.status).toBe(404);
    expect(inactiveResponse.body).toEqual({ error: { message: "Table not found" } });
  });
});
