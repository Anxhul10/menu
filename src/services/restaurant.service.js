import { prisma } from "../database/prisma.js";
import { AppError } from "../errors/app-error.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const slugCharacterPattern = /[^a-z0-9]+/g;
const restaurantSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  address: true,
  isActive: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true
};
const permittedUpdateFields = new Set(["name", "description", "address"]);

function requireOwnerId(ownerId) {
  if (typeof ownerId !== "string" || !uuidPattern.test(ownerId)) {
    throw new AppError("Authenticated user is invalid", 401);
  }

  return ownerId;
}

function normalizeName(value) {
  if (typeof value !== "string" || value.trim().length < 2 || value.trim().length > 120) {
    throw new AppError("name must be between 2 and 120 characters", 400);
  }

  return value.trim();
}

function normalizeOptionalText(value, field, maximumLength = 500) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string" || value.trim().length > maximumLength) {
    throw new AppError(`${field} must be a string of at most ${maximumLength} characters`, 400);
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

function slugFromName(name) {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(slugCharacterPattern, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");

  return slug || "restaurant";
}

async function nextAvailableSlug(baseSlug) {
  let candidate = baseSlug;
  let suffix = 1;

  while (await prisma.restaurant.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }

  return candidate;
}

function validateRestaurantId(restaurantId) {
  if (typeof restaurantId !== "string" || !uuidPattern.test(restaurantId)) {
    throw new AppError("Restaurant not found", 404);
  }

  return restaurantId;
}

async function findOwnedRestaurant(ownerId, restaurantId) {
  const restaurant = await prisma.restaurant.findFirst({
    where: {
      id: validateRestaurantId(restaurantId),
      ownerId,
      isActive: true
    },
    select: restaurantSelect
  });

  if (!restaurant) {
    throw new AppError("Restaurant not found", 404);
  }

  return restaurant;
}

export async function createRestaurant(ownerId, input) {
  requireOwnerId(ownerId);
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new AppError("Request body must be an object", 400);
  }

  const name = normalizeName(input.name);
  const description = normalizeOptionalText(input.description, "description");
  const address = normalizeOptionalText(input.address, "address");
  const baseSlug = slugFromName(name);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = await nextAvailableSlug(baseSlug);

    try {
      return await prisma.restaurant.create({
        data: {
          name,
          slug,
          description,
          address,
          ownerId
        },
        select: restaurantSelect
      });
    } catch (error) {
      if (error.code !== "P2002" || attempt === 4) {
        throw error;
      }
    }
  }
}

export async function listRestaurants(ownerId) {
  requireOwnerId(ownerId);
  return prisma.restaurant.findMany({
    where: { ownerId, isActive: true },
    orderBy: { createdAt: "asc" },
    select: restaurantSelect
  });
}

export async function getRestaurant(ownerId, restaurantId) {
  requireOwnerId(ownerId);
  return findOwnedRestaurant(ownerId, restaurantId);
}

export async function updateRestaurant(ownerId, restaurantId, input) {
  requireOwnerId(ownerId);
  await findOwnedRestaurant(ownerId, restaurantId);

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new AppError("Request body must be an object", 400);
  }

  const fields = Object.keys(input);
  const unsupportedField = fields.find((field) => !permittedUpdateFields.has(field));
  if (unsupportedField) {
    throw new AppError(`${unsupportedField} cannot be updated`, 400);
  }

  if (fields.length === 0) {
    throw new AppError("At least one permitted field is required", 400);
  }

  const data = {};
  if (input.name !== undefined) {
    data.name = normalizeName(input.name);
  }
  if (input.description !== undefined) {
    data.description = normalizeOptionalText(input.description, "description");
  }
  if (input.address !== undefined) {
    data.address = normalizeOptionalText(input.address, "address");
  }

  return prisma.restaurant.update({
    where: { id: restaurantId },
    data,
    select: restaurantSelect
  });
}

export async function archiveRestaurant(ownerId, restaurantId) {
  requireOwnerId(ownerId);
  await findOwnedRestaurant(ownerId, restaurantId);

  return prisma.restaurant.update({
    where: { id: restaurantId },
    data: { isActive: false },
    select: restaurantSelect
  });
}
