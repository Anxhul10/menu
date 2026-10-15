import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  prisma: {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    restaurant: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("../src/database/prisma.js", () => database);

const { app } = await import("../src/app.js");

const user = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Asha Rao",
  email: "asha@example.com",
  passwordHash: "",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};
const restaurant = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Asha's Kitchen",
  slug: "ashas-kitchen",
  ownerId: user.id,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

function validRegistration() {
  return {
    name: user.name,
    email: " ASHA@example.com ",
    password: "correct-horse-battery",
    restaurantName: restaurant.name,
    restaurantSlug: restaurant.slug,
  };
}

function tokenFor(userId = user.id) {
  return jwt.sign({ type: "access" }, process.env.JWT_SECRET, {
    subject: userId,
    issuer: "menu-api",
    audience: "menu-client",
    expiresIn: "1h",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  database.prisma.$transaction.mockImplementation((callback) =>
    callback(database.prisma),
  );
  database.prisma.user.create.mockResolvedValue({ ...user });
  database.prisma.restaurant.create.mockResolvedValue({ ...restaurant });
});

describe("POST /api/auth/register", () => {
  it("registers a user and creates their restaurant", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send(validRegistration());

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe("asha@example.com");
    expect(response.body.restaurants[0].slug).toBe(restaurant.slug);
    expect(response.body.token).toEqual(expect.any(String));
    expect(database.prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: "asha@example.com" }),
      }),
    );

    const createdUser = database.prisma.user.create.mock.calls[0][0];
    expect(createdUser.data.passwordHash).not.toBe(
      validRegistration().password,
    );
    await expect(
      bcrypt.compare(
        validRegistration().password,
        createdUser.data.passwordHash,
      ),
    ).resolves.toBe(true);
  });

  it("rejects invalid registration data", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        ...validRegistration(),
        password: "short",
        restaurantSlug: "Not A Slug",
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { message: "password must be at least 8 characters" },
    });
    expect(database.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects duplicate email or restaurant slug constraints safely", async () => {
    database.prisma.$transaction.mockRejectedValue({ code: "P2002" });

    const response = await request(app)
      .post("/api/auth/register")
      .send(validRegistration());

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: { message: "Email or restaurant slug already exists" },
    });
  });
});

describe("POST /api/auth/login", () => {
  it("authenticates valid credentials", async () => {
    const passwordHash = await bcrypt.hash(validRegistration().password, 4);
    database.prisma.user.findUnique.mockResolvedValue({
      ...user,
      passwordHash,
      ownedRestaurants: [restaurant],
    });

    const response = await request(app).post("/api/auth/login").send({
      email: " ASHA@example.com ",
      password: validRegistration().password,
    });

    expect(response.status).toBe(200);
    expect(response.body.user.id).toBe(user.id);
    expect(response.body.restaurants).toHaveLength(1);
    expect(response.body.token).toEqual(expect.any(String));
  });

  it("uses the same error for an unknown email and a wrong password", async () => {
    database.prisma.user.findUnique.mockResolvedValue(null);

    const response = await request(app).post("/api/auth/login").send({
      email: "unknown@example.com",
      password: "wrong-password",
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: { message: "Invalid email or password" },
    });
  });
});

describe("GET /api/auth/me", () => {
  it("returns the authenticated user's authorized restaurants", async () => {
    database.prisma.user.findUnique.mockResolvedValue({
      ...user,
      ownedRestaurants: [restaurant],
    });

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${tokenFor()}`)
      .query({ restaurantId: "another-users-restaurant" });

    expect(response.status).toBe(200);
    expect(response.body.user.id).toBe(user.id);
    expect(response.body.restaurants).toEqual([
      expect.objectContaining({ id: restaurant.id }),
    ]);
    expect(database.prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: user.id },
      }),
    );
  });

  it("rejects requests without valid authentication", async () => {
    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: { message: "Authentication required" },
    });
  });

  it("rejects expired or malformed tokens", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer not-a-valid-token");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: { message: "Invalid or expired authentication token" },
    });
  });
});
