import { Prisma } from "@prisma/client";
import { prisma } from "../database/prisma.js";
import { AppError } from "../errors/app-error.js";
import { getRestaurant } from "./restaurant.service.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const pricePattern = /^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/;
const categoryFields = {
  id: true,
  restaurantId: true,
  name: true,
  description: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true
};
const itemFields = {
  id: true,
  restaurantId: true,
  categoryId: true,
  name: true,
  description: true,
  price: true,
  imageUrl: true,
  isAvailable: true,
  createdAt: true,
  updatedAt: true
};
const categoryUpdateFields = new Set(["name", "description", "sortOrder"]);
const itemUpdateFields = new Set(["categoryId", "name", "description", "price", "imageUrl", "isAvailable"]);

function validateId(value, resourceName) {
  if (typeof value !== "string" || !uuidPattern.test(value)) {
    throw new AppError(`${resourceName} not found`, 404);
  }

  return value;
}

function requireObject(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new AppError("Request body must be an object", 400);
  }
}

function text(value, field, { required = false, maximumLength = 500 } = {}) {
  if (value === undefined || value === null) {
    if (required) {
      throw new AppError(`${field} is required`, 400);
    }
    return null;
  }

  if (typeof value !== "string" || value.trim().length === 0 || value.trim().length > maximumLength) {
    throw new AppError(`${field} must be a non-empty string of at most ${maximumLength} characters`, 400);
  }

  return value.trim();
}

function optionalText(value, field, maximumLength = 500) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string" || value.trim().length > maximumLength) {
    throw new AppError(`${field} must be a string of at most ${maximumLength} characters`, 400);
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

function sortOrder(value) {
  if (value === undefined) {
    return 0;
  }

  if (!Number.isInteger(value) || value < 0 || value > 1000000) {
    throw new AppError("sortOrder must be a non-negative integer", 400);
  }

  return value;
}

function price(value) {
  if (typeof value !== "string" || !pricePattern.test(value.trim())) {
    throw new AppError("price must be a non-negative decimal with at most 2 decimal places", 400);
  }

  return new Prisma.Decimal(value).toFixed(2);
}

function imageUrl(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string" || value.trim().length > 2048) {
    throw new AppError("imageUrl must be a URL of at most 2048 characters", 400);
  }

  try {
    const parsedUrl = new URL(value.trim());
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error("unsupported protocol");
    }
  } catch {
    throw new AppError("imageUrl must be a valid HTTP or HTTPS URL", 400);
  }

  return value.trim();
}

function formatPrice(value) {
  return new Prisma.Decimal(value).toFixed(2);
}

function presentCategory(category) {
  return {
    ...category,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt
  };
}

function presentItem(item) {
  return {
    ...item,
    price: formatPrice(item.price),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
}

async function ownedRestaurant(ownerId, restaurantId) {
  return getRestaurant(ownerId, validateId(restaurantId, "Restaurant"));
}

async function ownedCategory(ownerId, restaurantId, categoryId) {
  await ownedRestaurant(ownerId, restaurantId);
  const category = await prisma.menuCategory.findFirst({
    where: {
      id: validateId(categoryId, "Category"),
      restaurantId
    },
    select: categoryFields
  });

  if (!category) {
    throw new AppError("Category not found", 404);
  }

  return category;
}

async function ownedItem(ownerId, restaurantId, itemId) {
  await ownedRestaurant(ownerId, restaurantId);
  const item = await prisma.menuItem.findFirst({
    where: {
      id: validateId(itemId, "Menu item"),
      restaurantId
    },
    select: itemFields
  });

  if (!item) {
    throw new AppError("Menu item not found", 404);
  }

  return item;
}

export async function createCategory(ownerId, restaurantId, input) {
  requireObject(input);
  await ownedRestaurant(ownerId, restaurantId);

  return prisma.menuCategory.create({
    data: {
      restaurantId,
      name: text(input.name, "name", { required: true, maximumLength: 100 }),
      description: optionalText(input.description, "description"),
      sortOrder: sortOrder(input.sortOrder)
    },
    select: categoryFields
  }).then(presentCategory);
}

export async function listCategories(ownerId, restaurantId) {
  await ownedRestaurant(ownerId, restaurantId);
  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: categoryFields
  });

  return categories.map(presentCategory);
}

export async function updateCategory(ownerId, restaurantId, categoryId, input) {
  await ownedCategory(ownerId, restaurantId, categoryId);
  requireObject(input);
  const fields = Object.keys(input);
  const unsupportedField = fields.find((field) => !categoryUpdateFields.has(field));
  if (unsupportedField) {
    throw new AppError(`${unsupportedField} cannot be updated`, 400);
  }
  if (fields.length === 0) {
    throw new AppError("At least one permitted field is required", 400);
  }

  const data = {};
  if (input.name !== undefined) data.name = text(input.name, "name", { required: true, maximumLength: 100 });
  if (input.description !== undefined) data.description = optionalText(input.description, "description");
  if (input.sortOrder !== undefined) data.sortOrder = sortOrder(input.sortOrder);

  const category = await prisma.menuCategory.update({
    where: { id: categoryId },
    data,
    select: categoryFields
  });
  return presentCategory(category);
}

export async function deleteCategory(ownerId, restaurantId, categoryId) {
  await ownedCategory(ownerId, restaurantId, categoryId);
  const itemCount = await prisma.menuItem.count({ where: { categoryId, restaurantId } });
  if (itemCount > 0) {
    throw new AppError("Category cannot be deleted while it contains menu items", 409);
  }

  await prisma.menuCategory.delete({ where: { id: categoryId } });
}

export async function createItem(ownerId, restaurantId, input) {
  requireObject(input);
  await ownedRestaurant(ownerId, restaurantId);
  const categoryId = validateId(input.categoryId, "Category");
  const category = await prisma.menuCategory.findFirst({ where: { id: categoryId, restaurantId }, select: { id: true } });
  if (!category) {
    throw new AppError("Category not found for this restaurant", 400);
  }

  const isAvailable = input.isAvailable === undefined ? true : input.isAvailable;
  if (typeof isAvailable !== "boolean") {
    throw new AppError("isAvailable must be a boolean", 400);
  }

  const item = await prisma.menuItem.create({
    data: {
      restaurantId,
      categoryId,
      name: text(input.name, "name", { required: true, maximumLength: 150 }),
      description: optionalText(input.description, "description"),
      price: price(input.price),
      imageUrl: imageUrl(input.imageUrl),
      isAvailable
    },
    select: itemFields
  });

  return presentItem(item);
}

export async function listItems(ownerId, restaurantId) {
  await ownedRestaurant(ownerId, restaurantId);
  const items = await prisma.menuItem.findMany({
    where: { restaurantId },
    orderBy: [{ categoryId: "asc" }, { createdAt: "asc" }],
    select: itemFields
  });
  return items.map(presentItem);
}

export async function getItem(ownerId, restaurantId, itemId) {
  return presentItem(await ownedItem(ownerId, restaurantId, itemId));
}

export async function updateItem(ownerId, restaurantId, itemId, input) {
  await ownedItem(ownerId, restaurantId, itemId);
  requireObject(input);
  const fields = Object.keys(input);
  const unsupportedField = fields.find((field) => !itemUpdateFields.has(field));
  if (unsupportedField) {
    throw new AppError(`${unsupportedField} cannot be updated`, 400);
  }
  if (fields.length === 0) {
    throw new AppError("At least one permitted field is required", 400);
  }

  const data = {};
  if (input.categoryId !== undefined) {
    const categoryId = validateId(input.categoryId, "Category");
    const category = await prisma.menuCategory.findFirst({ where: { id: categoryId, restaurantId }, select: { id: true } });
    if (!category) throw new AppError("Category not found for this restaurant", 400);
    data.categoryId = categoryId;
  }
  if (input.name !== undefined) data.name = text(input.name, "name", { required: true, maximumLength: 150 });
  if (input.description !== undefined) data.description = optionalText(input.description, "description");
  if (input.price !== undefined) data.price = price(input.price);
  if (input.imageUrl !== undefined) data.imageUrl = imageUrl(input.imageUrl);
  if (input.isAvailable !== undefined) {
    if (typeof input.isAvailable !== "boolean") throw new AppError("isAvailable must be a boolean", 400);
    data.isAvailable = input.isAvailable;
  }

  const item = await prisma.menuItem.update({ where: { id: itemId }, data, select: itemFields });
  return presentItem(item);
}

export async function deleteItem(ownerId, restaurantId, itemId) {
  await ownedItem(ownerId, restaurantId, itemId);
  await prisma.menuItem.delete({ where: { id: itemId } });
}

export async function setItemAvailability(ownerId, restaurantId, itemId, input) {
  await ownedItem(ownerId, restaurantId, itemId);
  requireObject(input);
  if (typeof input.isAvailable !== "boolean") {
    throw new AppError("isAvailable must be a boolean", 400);
  }

  const item = await prisma.menuItem.update({
    where: { id: itemId },
    data: { isAvailable: input.isAvailable },
    select: itemFields
  });
  return presentItem(item);
}

export async function getPublicMenu(slug) {
  if (typeof slug !== "string" || slug.length === 0) {
    throw new AppError("Restaurant not found", 404);
  }

  const restaurant = await prisma.restaurant.findFirst({
    where: { slug, isActive: true },
    select: {
      name: true,
      slug: true,
      categories: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          name: true,
          description: true,
          sortOrder: true,
          items: {
            where: { isAvailable: true },
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              categoryId: true,
              name: true,
              description: true,
              price: true,
              imageUrl: true,
              isAvailable: true
            }
          }
        }
      }
    }
  });

  if (!restaurant) {
    throw new AppError("Restaurant not found", 404);
  }

  return {
    restaurant: {
      name: restaurant.name,
      slug: restaurant.slug
    },
    categories: restaurant.categories.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      sortOrder: category.sortOrder,
      items: category.items.map((item) => ({
        id: item.id,
        categoryId: item.categoryId,
        name: item.name,
        description: item.description,
        price: formatPrice(item.price),
        imageUrl: item.imageUrl,
        isAvailable: item.isAvailable
      }))
    }))
  };
}
