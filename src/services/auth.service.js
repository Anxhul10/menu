import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../database/prisma.js";
import { AppError } from "../errors/app-error.js";

const passwordRounds = 12;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
  updatedAt: true
};
const restaurantSelect = {
  id: true,
  name: true,
  slug: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true
};

function requiredText(value, field, minimumLength = 1) {
  if (typeof value !== "string") {
    throw new AppError(`${field} is required`, 400);
  }

  const normalizedValue = value.trim();
  if (normalizedValue.length < minimumLength) {
    throw new AppError(`${field} is invalid`, 400);
  }

  return normalizedValue;
}

function normalizeRegistrationInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new AppError("Request body must be an object", 400);
  }

  const name = requiredText(input.name, "name", 2);
  const email = requiredText(input.email, "email").toLowerCase();
  const password = input.password;
  const restaurantName = requiredText(input.restaurantName, "restaurantName", 2);
  const restaurantSlug = requiredText(input.restaurantSlug, "restaurantSlug").toLowerCase();

  if (!emailPattern.test(email)) {
    throw new AppError("email is invalid", 400);
  }

  if (typeof password !== "string" || password.length < 8) {
    throw new AppError("password must be at least 8 characters", 400);
  }

  if (!slugPattern.test(restaurantSlug)) {
    throw new AppError("restaurantSlug is invalid", 400);
  }

  return { name, email, password, restaurantName, restaurantSlug };
}

function normalizeLoginInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new AppError("Invalid email or password", 401);
  }

  const email = requiredText(input.email, "email").toLowerCase();
  const password = input.password;

  if (!emailPattern.test(email) || typeof password !== "string" || password.length === 0) {
    throw new AppError("Invalid email or password", 401);
  }

  return { email, password };
}

function getJwtSecret() {
  if (!env.jwtSecret) {
    throw new AppError("Authentication is not configured", 500);
  }

  return env.jwtSecret;
}

function createAccessToken(userId) {
  return jwt.sign(
    { type: "access" },
    getJwtSecret(),
    {
      subject: userId,
      issuer: "menu-api",
      audience: "menu-client",
      expiresIn: env.jwtExpiresIn
    }
  );
}

function presentUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function presentRestaurant(restaurant) {
  return {
    id: restaurant.id,
    name: restaurant.name,
    slug: restaurant.slug,
    ownerId: restaurant.ownerId,
    createdAt: restaurant.createdAt,
    updatedAt: restaurant.updatedAt
  };
}

function presentSession(user, restaurants) {
  return {
    user: presentUser(user),
    restaurants: restaurants.map(presentRestaurant)
  };
}

export async function registerUser(input) {
  const data = normalizeRegistrationInput(input);
  getJwtSecret();
  const passwordHash = await bcrypt.hash(data.password, passwordRounds);

  const result = await prisma.$transaction(async (transaction) => {
    const user = await transaction.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: passwordHash
      },
      select: {
        ...safeUserSelect
      }
    });

    const restaurant = await transaction.restaurant.create({
      data: {
        name: data.restaurantName,
        slug: data.restaurantSlug,
        ownerId: user.id
      },
      select: restaurantSelect
    });
    return { user, restaurant };
  });

  return {
    ...presentSession(result.user, [result.restaurant]),
    token: createAccessToken(result.user.id)
  };
}

export async function loginUser(input) {
  const data = normalizeLoginInput(input);
  getJwtSecret();
  const user = await prisma.user.findUnique({
    where: { email: data.email },
    include: {
      ownedRestaurants: {
        select: restaurantSelect,
        orderBy: { createdAt: "asc" }
      }
    }
  });

  const passwordMatches = user ? await bcrypt.compare(data.password, user.passwordHash) : false;
  if (!passwordMatches) {
    throw new AppError("Invalid email or password", 401);
  }

  return {
    ...presentSession(user, user.ownedRestaurants),
    token: createAccessToken(user.id)
  };
}

export async function getAuthenticatedProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      ownedRestaurants: {
        select: restaurantSelect,
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!user) {
    throw new AppError("Authentication required", 401);
  }

  return presentSession(user, user.ownedRestaurants);
}

export function verifyAccessToken(token) {
  try {
    const payload = jwt.verify(token, getJwtSecret(), {
      issuer: "menu-api",
      audience: "menu-client"
    });

    if (typeof payload !== "object" || payload.type !== "access" || typeof payload.sub !== "string") {
      throw new AppError("Invalid authentication token", 401);
    }

    return payload;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("Invalid or expired authentication token", 401);
  }
}
