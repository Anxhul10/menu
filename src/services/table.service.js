import { randomBytes } from "node:crypto";
import QRCode from "qrcode";
import { env } from "../config/env.js";
import { prisma } from "../database/prisma.js";
import { AppError } from "../errors/app-error.js";
import { getRestaurant } from "./restaurant.service.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const tableFields = {
  id: true,
  restaurantId: true,
  tableNumber: true,
  qrToken: true,
  isActive: true,
  createdAt: true,
  updatedAt: true
};

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

function normalizeTableNumber(value) {
  if (typeof value !== "string" || value.trim().length < 1 || value.trim().length > 50) {
    throw new AppError("tableNumber must be a non-empty string of at most 50 characters", 400);
  }

  return value.trim();
}

function requirePublicAppUrl() {
  if (!env.publicAppUrl) {
    throw new AppError("Public application URL is not configured", 500);
  }

  try {
    const url = new URL(env.publicAppUrl);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error("unsupported protocol");
    return url.toString().replace(/\/$/, "");
  } catch {
    throw new AppError("Public application URL is not configured correctly", 500);
  }
}

function tableUrl(restaurantSlug, qrToken) {
  return `${requirePublicAppUrl()}/r/${encodeURIComponent(restaurantSlug)}/t/${encodeURIComponent(qrToken)}`;
}

function presentTable(table) {
  return {
    id: table.id,
    restaurantId: table.restaurantId,
    tableNumber: table.tableNumber,
    qrToken: table.qrToken,
    isActive: table.isActive,
    createdAt: table.createdAt,
    updatedAt: table.updatedAt
  };
}

async function ownedRestaurant(ownerId, restaurantId) {
  return getRestaurant(ownerId, validateId(restaurantId, "Restaurant"));
}

async function ownedTable(ownerId, restaurantId, tableId) {
  await ownedRestaurant(ownerId, restaurantId);
  const table = await prisma.restaurantTable.findFirst({
    where: {
      id: validateId(tableId, "Table"),
      restaurantId
    },
    select: tableFields
  });

  if (!table) {
    throw new AppError("Table not found", 404);
  }

  return table;
}

function duplicateTableError(error) {
  if (error.code === "P2002") {
    throw new AppError("Table number already exists for this restaurant", 409);
  }

  throw error;
}

export async function createTable(ownerId, restaurantId, input) {
  await ownedRestaurant(ownerId, restaurantId);
  requireObject(input);
  const tableNumber = normalizeTableNumber(input.tableNumber);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const table = await prisma.restaurantTable.create({
        data: {
          restaurantId,
          tableNumber,
          qrToken: randomBytes(32).toString("base64url")
        },
        select: tableFields
      });
      return presentTable(table);
    } catch (error) {
      if (error.code !== "P2002" || attempt === 2) duplicateTableError(error);
    }
  }
}

export async function listTables(ownerId, restaurantId) {
  await ownedRestaurant(ownerId, restaurantId);
  const tables = await prisma.restaurantTable.findMany({
    where: { restaurantId },
    orderBy: [{ tableNumber: "asc" }, { createdAt: "asc" }],
    select: tableFields
  });

  return tables.map(presentTable);
}

export async function getTable(ownerId, restaurantId, tableId) {
  return presentTable(await ownedTable(ownerId, restaurantId, tableId));
}

export async function updateTable(ownerId, restaurantId, tableId, input) {
  await ownedTable(ownerId, restaurantId, tableId);
  requireObject(input);
  const fields = Object.keys(input);
  const unsupportedField = fields.find((field) => field !== "tableNumber");
  if (unsupportedField) {
    throw new AppError(`${unsupportedField} cannot be updated`, 400);
  }
  if (fields.length === 0) {
    throw new AppError("At least one permitted field is required", 400);
  }

  try {
    const table = await prisma.restaurantTable.update({
      where: { id: tableId },
      data: { tableNumber: normalizeTableNumber(input.tableNumber) },
      select: tableFields
    });
    return presentTable(table);
  } catch (error) {
    duplicateTableError(error);
  }
}

export async function setTableAvailability(ownerId, restaurantId, tableId, input) {
  await ownedTable(ownerId, restaurantId, tableId);
  requireObject(input);
  if (typeof input.isActive !== "boolean") {
    throw new AppError("isActive must be a boolean", 400);
  }

  const table = await prisma.restaurantTable.update({
    where: { id: tableId },
    data: { isActive: input.isActive },
    select: tableFields
  });
  return presentTable(table);
}

export async function generateTableQr(ownerId, restaurantId, tableId) {
  const restaurant = await ownedRestaurant(ownerId, restaurantId);
  const table = await ownedTable(ownerId, restaurantId, tableId);
  const url = tableUrl(restaurant.slug, table.qrToken);

  try {
    const imageDataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: "M",
      type: "image/png"
    });
    return { url, imageDataUrl };
  } catch {
    throw new AppError("Unable to generate QR code", 500);
  }
}

export async function resolvePublicTable(qrToken) {
  if (typeof qrToken !== "string" || qrToken.length < 32 || qrToken.length > 100) {
    throw new AppError("Table not found", 404);
  }

  const table = await prisma.restaurantTable.findFirst({
    where: {
      qrToken,
      isActive: true,
      restaurant: { isActive: true }
    },
    select: {
      tableNumber: true,
      isActive: true,
      restaurant: {
        select: {
          name: true,
          slug: true,
          isActive: true
        }
      }
    }
  });

  if (!table) {
    throw new AppError("Table not found", 404);
  }

  return {
    restaurant: {
      name: table.restaurant.name,
      slug: table.restaurant.slug
    },
    table: {
      tableNumber: table.tableNumber,
      isActive: table.isActive
    }
  };
}
