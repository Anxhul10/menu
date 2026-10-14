import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  prisma: {
    restaurant: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    }
  }
}));

vi.mock("../src/database/prisma.js", () => database);

const { app } = await import("../src/app.js");

const ownerId = "11111111-1111-4111-8111-111111111111";
const otherOwnerId = "33333333-3333-4333-8333-333333333333";
const restaurantId = "22222222-2222-4222-8222-222222222222";

function tokenFor(userId = ownerId) {
  return jwt.sign(
    { type: "access" },
    process.env.JWT_SECRET,
    { subject: userId, issuer: "menu-api", audience: "menu-client", expiresIn: "1h" }
  );
}

function restaurant(overrides = {}) {
  return {
    id: restaurantId,
    name: "Spice Garden",
    slug: "spice-garden",
    description: "Indian food",
    address: "1 Market Street",
    isActive: true,
    ownerId,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  database.prisma.restaurant.findUnique.mockResolvedValue(null);
  database.prisma.restaurant.findMany.mockResolvedValue([]);
  database.prisma.restaurant.findFirst.mockResolvedValue(restaurant());
  database.prisma.restaurant.create.mockResolvedValue(restaurant());
  database.prisma.restaurant.update.mockResolvedValue(restaurant());
});

describe("POST /api/restaurants", () => {
  it("creates a restaurant for the authenticated owner", async () => {
    const response = await request(app)
      .post("/api/restaurants")
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({
        name: "Spice Garden",
        description: "Indian food",
        address: "1 Market Street",
        ownerId: otherOwnerId
      });

    expect(response.status).toBe(201);
    expect(response.body.restaurant.slug).toBe("spice-garden");
    expect(database.prisma.restaurant.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ ownerId })
    }));
    expect(database.prisma.restaurant.create.mock.calls[0][0].data.ownerId).not.toBe(otherOwnerId);
  });

  it("rejects missing or invalid required fields", async () => {
    const response = await request(app)
      .post("/api/restaurants")
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ description: "Missing name" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: { message: "name must be between 2 and 120 characters" } });
    expect(database.prisma.restaurant.create).not.toHaveBeenCalled();
  });

  it("generates a suffix when the base slug is already used", async () => {
    database.prisma.restaurant.findUnique
      .mockResolvedValueOnce({ id: "44444444-4444-4444-8444-444444444444" })
      .mockResolvedValueOnce(null);
    database.prisma.restaurant.create.mockResolvedValue(restaurant({ slug: "spice-garden-2" }));

    const response = await request(app)
      .post("/api/restaurants")
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ name: "Spice Garden" });

    expect(response.status).toBe(201);
    expect(database.prisma.restaurant.create.mock.calls[0][0].data.slug).toBe("spice-garden-2");
  });
});

describe("restaurant authentication and tenant isolation", () => {
  it("rejects unauthenticated requests", async () => {
    const response = await request(app).get("/api/restaurants");

    expect(response.status).toBe(401);
    expect(database.prisma.restaurant.findMany).not.toHaveBeenCalled();
  });

  it("lists only active restaurants owned by the authenticated user", async () => {
    database.prisma.restaurant.findMany.mockResolvedValue([
      restaurant(),
      restaurant({ id: "55555555-5555-4555-8555-555555555555", slug: "second-place" })
    ]);

    const response = await request(app)
      .get("/api/restaurants")
      .set("Authorization", `Bearer ${tokenFor()}`);

    expect(response.status).toBe(200);
    expect(response.body.restaurants).toHaveLength(2);
    expect(database.prisma.restaurant.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { ownerId, isActive: true }
    }));
  });

  it("retrieves an owned restaurant", async () => {
    const response = await request(app)
      .get(`/api/restaurants/${restaurantId}`)
      .set("Authorization", `Bearer ${tokenFor()}`);

    expect(response.status).toBe(200);
    expect(response.body.restaurant.id).toBe(restaurantId);
    expect(database.prisma.restaurant.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: restaurantId, ownerId, isActive: true }
    }));
  });

  it("does not reveal another owner's restaurant", async () => {
    database.prisma.restaurant.findFirst.mockResolvedValue(null);

    const response = await request(app)
      .get(`/api/restaurants/${restaurantId}`)
      .set("Authorization", `Bearer ${tokenFor()}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { message: "Restaurant not found" } });
  });
});

describe("PATCH and DELETE /api/restaurants/:id", () => {
  it("updates permitted fields while preserving the slug", async () => {
    database.prisma.restaurant.update.mockResolvedValue(restaurant({ name: "New Spice Garden" }));

    const response = await request(app)
      .patch(`/api/restaurants/${restaurantId}`)
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ name: "New Spice Garden", address: "2 Market Street" });

    expect(response.status).toBe(200);
    expect(database.prisma.restaurant.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: restaurantId },
      data: { name: "New Spice Garden", address: "2 Market Street" }
    }));
    expect(database.prisma.restaurant.update.mock.calls[0][0].data.slug).toBeUndefined();
  });

  it("rejects update and archive attempts for another owner's restaurant", async () => {
    database.prisma.restaurant.findFirst.mockResolvedValue(null);

    const updateResponse = await request(app)
      .patch(`/api/restaurants/${restaurantId}`)
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ name: "Hijacked" });
    const deleteResponse = await request(app)
      .delete(`/api/restaurants/${restaurantId}`)
      .set("Authorization", `Bearer ${tokenFor()}`);

    expect(updateResponse.status).toBe(404);
    expect(deleteResponse.status).toBe(404);
    expect(database.prisma.restaurant.update).not.toHaveBeenCalled();
  });

  it("archives instead of deleting restaurant data", async () => {
    database.prisma.restaurant.update.mockResolvedValue(restaurant({ isActive: false }));

    const response = await request(app)
      .delete(`/api/restaurants/${restaurantId}`)
      .set("Authorization", `Bearer ${tokenFor()}`);

    expect(response.status).toBe(200);
    expect(response.body.restaurant.isActive).toBe(false);
    expect(database.prisma.restaurant.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: restaurantId },
      data: { isActive: false }
    }));
  });
});
