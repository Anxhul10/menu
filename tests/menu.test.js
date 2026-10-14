import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  prisma: {
    restaurant: { findFirst: vi.fn() },
    menuCategory: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    menuItem: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }
  }
}));

vi.mock("../src/database/prisma.js", () => database);

const { app } = await import("../src/app.js");

const ownerId = "11111111-1111-4111-8111-111111111111";
const otherOwnerId = "33333333-3333-4333-8333-333333333333";
const restaurantId = "22222222-2222-4222-8222-222222222222";
const categoryId = "44444444-4444-4444-8444-444444444444";
const otherCategoryId = "55555555-5555-4555-8555-555555555555";
const itemId = "66666666-6666-4666-8666-666666666666";

function tokenFor(userId = ownerId) {
  return jwt.sign(
    { type: "access" },
    process.env.JWT_SECRET,
    { subject: userId, issuer: "menu-api", audience: "menu-client", expiresIn: "1h" }
  );
}

function category(overrides = {}) {
  return {
    id: categoryId,
    restaurantId,
    name: "Mains",
    description: "Main dishes",
    sortOrder: 1,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides
  };
}

function item(overrides = {}) {
  return {
    id: itemId,
    restaurantId,
    categoryId,
    name: "Paneer Tikka",
    description: "Char-grilled paneer",
    price: "12.50",
    imageUrl: "https://example.com/paneer.jpg",
    isAvailable: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  database.prisma.restaurant.findFirst.mockResolvedValue({ id: restaurantId, isActive: true });
  database.prisma.menuCategory.create.mockResolvedValue(category());
  database.prisma.menuCategory.findMany.mockResolvedValue([category()]);
  database.prisma.menuCategory.findFirst.mockResolvedValue(category());
  database.prisma.menuCategory.update.mockResolvedValue(category());
  database.prisma.menuCategory.delete.mockResolvedValue(category());
  database.prisma.menuItem.create.mockResolvedValue(item());
  database.prisma.menuItem.findMany.mockResolvedValue([item()]);
  database.prisma.menuItem.findFirst.mockResolvedValue(item());
  database.prisma.menuItem.count.mockResolvedValue(0);
  database.prisma.menuItem.update.mockResolvedValue(item());
  database.prisma.menuItem.delete.mockResolvedValue(item());
});

describe("category management", () => {
  it("creates, lists, and updates categories for an owned restaurant", async () => {
    const createResponse = await request(app)
      .post(`/api/restaurants/${restaurantId}/categories`)
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ name: "Mains", description: "Main dishes", sortOrder: 1 });
    const listResponse = await request(app)
      .get(`/api/restaurants/${restaurantId}/categories`)
      .set("Authorization", `Bearer ${tokenFor()}`);
    const updateResponse = await request(app)
      .patch(`/api/restaurants/${restaurantId}/categories/${categoryId}`)
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ name: "Chef's Mains", sortOrder: 2 });

    expect(createResponse.status).toBe(201);
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.categories).toHaveLength(1);
    expect(updateResponse.status).toBe(200);
    expect(database.prisma.menuCategory.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { restaurantId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
    }));
  });

  it("rejects deletion while a category contains items", async () => {
    database.prisma.menuItem.count.mockResolvedValue(1);

    const response = await request(app)
      .delete(`/api/restaurants/${restaurantId}/categories/${categoryId}`)
      .set("Authorization", `Bearer ${tokenFor()}`);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: { message: "Category cannot be deleted while it contains menu items" } });
    expect(database.prisma.menuCategory.delete).not.toHaveBeenCalled();
  });

  it("deletes an empty category", async () => {
    const response = await request(app)
      .delete(`/api/restaurants/${restaurantId}/categories/${categoryId}`)
      .set("Authorization", `Bearer ${tokenFor()}`);

    expect(response.status).toBe(204);
    expect(database.prisma.menuCategory.delete).toHaveBeenCalledWith({ where: { id: categoryId } });
  });
});

describe("menu item management", () => {
  it("creates an item with a normalized decimal price", async () => {
    const response = await request(app)
      .post(`/api/restaurants/${restaurantId}/items`)
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ categoryId, name: "Paneer Tikka", price: "12.5" });

    expect(response.status).toBe(201);
    expect(response.body.item.price).toBe("12.50");
    expect(database.prisma.menuItem.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ restaurantId, categoryId, price: "12.50" })
    }));
  });

  it("rejects malformed or negative prices before persistence", async () => {
    const response = await request(app)
      .post(`/api/restaurants/${restaurantId}/items`)
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ categoryId, name: "Invalid", price: "-1.999" });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain("price must be");
    expect(database.prisma.menuItem.create).not.toHaveBeenCalled();
  });

  it("rejects a category from a different restaurant", async () => {
    database.prisma.menuCategory.findFirst.mockResolvedValue(null);

    const response = await request(app)
      .post(`/api/restaurants/${restaurantId}/items`)
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ categoryId: otherCategoryId, name: "Wrong Tenant", price: "5.00" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: { message: "Category not found for this restaurant" } });
    expect(database.prisma.menuItem.create).not.toHaveBeenCalled();
  });

  it("lists, retrieves, updates, changes availability, and deletes items", async () => {
    const listResponse = await request(app)
      .get(`/api/restaurants/${restaurantId}/items`)
      .set("Authorization", `Bearer ${tokenFor()}`);
    const getResponse = await request(app)
      .get(`/api/restaurants/${restaurantId}/items/${itemId}`)
      .set("Authorization", `Bearer ${tokenFor()}`);
    const updateResponse = await request(app)
      .patch(`/api/restaurants/${restaurantId}/items/${itemId}`)
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ name: "Updated Paneer", price: "13.00" });
    const availabilityResponse = await request(app)
      .patch(`/api/restaurants/${restaurantId}/items/${itemId}/availability`)
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ isAvailable: false });
    const deleteResponse = await request(app)
      .delete(`/api/restaurants/${restaurantId}/items/${itemId}`)
      .set("Authorization", `Bearer ${tokenFor()}`);

    expect(listResponse.status).toBe(200);
    expect(getResponse.status).toBe(200);
    expect(updateResponse.status).toBe(200);
    expect(availabilityResponse.status).toBe(200);
    expect(deleteResponse.status).toBe(204);
    expect(database.prisma.menuItem.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { isAvailable: false }
    }));
  });
});

describe("menu tenant isolation", () => {
  it("rejects unauthenticated management requests", async () => {
    const response = await request(app).get(`/api/restaurants/${restaurantId}/items`);

    expect(response.status).toBe(401);
    expect(database.prisma.menuItem.findMany).not.toHaveBeenCalled();
  });

  it("prevents another owner from reading, creating, updating, or deleting", async () => {
    database.prisma.restaurant.findFirst.mockResolvedValue(null);

    const readResponse = await request(app)
      .get(`/api/restaurants/${restaurantId}/categories`)
      .set("Authorization", `Bearer ${tokenFor(otherOwnerId)}`);
    const createResponse = await request(app)
      .post(`/api/restaurants/${restaurantId}/items`)
      .set("Authorization", `Bearer ${tokenFor(otherOwnerId)}`)
      .send({ categoryId, name: "Intrusion", price: "5.00" });
    const updateResponse = await request(app)
      .patch(`/api/restaurants/${restaurantId}/items/${itemId}`)
      .set("Authorization", `Bearer ${tokenFor(otherOwnerId)}`)
      .send({ name: "Intrusion" });
    const deleteResponse = await request(app)
      .delete(`/api/restaurants/${restaurantId}/items/${itemId}`)
      .set("Authorization", `Bearer ${tokenFor(otherOwnerId)}`);

    expect(readResponse.status).toBe(404);
    expect(createResponse.status).toBe(404);
    expect(updateResponse.status).toBe(404);
    expect(deleteResponse.status).toBe(404);
    expect(database.prisma.menuItem.update).not.toHaveBeenCalled();
    expect(database.prisma.menuItem.delete).not.toHaveBeenCalled();
  });
});

describe("public menu", () => {
  it("returns only available items without private ownership fields", async () => {
    database.prisma.restaurant.findFirst.mockResolvedValue({
      name: "Spice Garden",
      slug: "spice-garden",
      categories: [{
        id: categoryId,
        name: "Mains",
        description: null,
        sortOrder: 1,
        items: [item({ isAvailable: true })]
      }]
    });

    const response = await request(app).get("/api/public/restaurants/spice-garden/menu");

    expect(response.status).toBe(200);
    expect(response.body.restaurant).toEqual({ name: "Spice Garden", slug: "spice-garden" });
    expect(response.body.categories[0].items[0].price).toBe("12.50");
    expect(response.body).not.toHaveProperty("ownerId");
    expect(response.body.categories[0].items).not.toContainEqual(expect.objectContaining({ ownerId }));
    expect(database.prisma.restaurant.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { slug: "spice-garden", isActive: true }
    }));
  });

  it("returns 404 for missing or inactive restaurants", async () => {
    database.prisma.restaurant.findFirst.mockResolvedValue(null);

    const response = await request(app).get("/api/public/restaurants/missing/menu");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { message: "Restaurant not found" } });
  });
});
