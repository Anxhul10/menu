import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../database/prisma.js";
import { AppError } from "../errors/app-error.js";
import { getRestaurant } from "./restaurant.service.js";
import { ORDER_CREATED, ORDER_ETA_UPDATED, ORDER_UPDATED, publishOrderEvent } from "../realtime/order-events.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const orderStatuses = new Set(["PENDING", "ACCEPTED", "REJECTED", "PREPARING", "READY", "COMPLETED", "CANCELLED"]);
const transitions = {
  PENDING: new Set(["ACCEPTED", "REJECTED", "CANCELLED"]),
  ACCEPTED: new Set(["PREPARING", "CANCELLED"]),
  PREPARING: new Set(["READY", "CANCELLED"]),
  READY: new Set(["COMPLETED"]),
  REJECTED: new Set(),
  COMPLETED: new Set(),
  CANCELLED: new Set()
};
const menuItemSelect = {
  id: true,
  restaurantId: true,
  name: true,
  price: true,
  isAvailable: true
};
const orderItemSelect = {
  id: true,
  menuItemId: true,
  itemName: true,
  unitPrice: true,
  quantity: true,
  lineSubtotal: true
};
const orderSelect = {
  id: true,
  restaurantId: true,
  restaurantTableId: true,
  status: true,
  paymentMethod: true,
  paymentStatus: true,
  paymentCollectedAt: true,
  totalAmount: true,
  trackingToken: true,
  customerName: true,
  customerContact: true,
  estimatedReadyAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  items: { select: orderItemSelect, orderBy: { id: "asc" } }
};
const ownerOrderSelect = {
  ...orderSelect,
  restaurantTable: { select: { tableNumber: true } }
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

function optionalCustomerText(value, field) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value.trim().length === 0 || value.trim().length > 200) {
    throw new AppError(`${field} must be a non-empty string of at most 200 characters`, 400);
  }
  return value.trim();
}

function normalizeOrderInput(input) {
  requireObject(input);
  const paymentMethod = input.paymentMethod ?? "CASH";
  if (paymentMethod !== "CASH") {
    throw new AppError("Only CASH payment is supported", 400);
  }
  if (!Array.isArray(input.items) || input.items.length === 0 || input.items.length > 50) {
    throw new AppError("items must contain between 1 and 50 entries", 400);
  }

  const items = input.items.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry) || !uuidPattern.test(entry.menuItemId ?? "")) {
      throw new AppError("Each item must contain a valid menuItemId", 400);
    }
    if (!Number.isInteger(entry.quantity) || entry.quantity < 1 || entry.quantity > 99) {
      throw new AppError("Each item quantity must be an integer between 1 and 99", 400);
    }
    return { menuItemId: entry.menuItemId, quantity: entry.quantity };
  });

  if (new Set(items.map((entry) => entry.menuItemId)).size !== items.length) {
    throw new AppError("Duplicate menu items are not allowed", 400);
  }

  return {
    items,
    customerName: optionalCustomerText(input.customerName, "customerName"),
    customerContact: optionalCustomerText(input.customerContact, "customerContact")
  };
}

function money(value) {
  return new Prisma.Decimal(value);
}

function moneyString(value) {
  return money(value).toFixed(2);
}

function presentOrder(order, { includeTrackingToken = false } = {}) {
  const result = {
    orderId: order.id,
    restaurantId: order.restaurantId,
    restaurantTableId: order.restaurantTableId,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    paymentCollectedAt: order.paymentCollectedAt,
    totalAmount: moneyString(order.totalAmount),
    customerName: order.customerName,
    customerContact: order.customerContact,
    estimatedReadyAt: order.estimatedReadyAt,
    completedAt: order.completedAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: (order.items ?? []).map((item) => ({
      id: item.id,
      menuItemId: item.menuItemId,
      itemName: item.itemName,
      unitPrice: moneyString(item.unitPrice),
      quantity: item.quantity,
      lineSubtotal: moneyString(item.lineSubtotal)
    }))
  };

  if (includeTrackingToken) result.trackingToken = order.trackingToken;
  if (order.restaurantTable?.tableNumber) result.tableNumber = order.restaurantTable.tableNumber;
  return result;
}

async function publishPersistedOrder(orderId, eventName) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: ownerOrderSelect
    });
    if (!order) return;

    const ownerOrder = presentOrder(order);
    const publicOrder = await getPublicOrder(order.trackingToken);
    publishOrderEvent(eventName, {
      restaurantId: order.restaurantId,
      trackingToken: order.trackingToken,
      ownerOrder,
      publicOrder
    });
  } catch (error) {
    console.error("Unable to publish order update", error.message);
  }
}

async function activeTableByToken(transaction, tableQrToken) {
  if (typeof tableQrToken !== "string" || tableQrToken.length < 32 || tableQrToken.length > 100) {
    throw new AppError("Invalid or inactive table QR token", 400);
  }

  const table = await transaction.restaurantTable.findFirst({
    where: {
      qrToken: tableQrToken,
      isActive: true,
      restaurant: { isActive: true }
    },
    select: {
      id: true,
      restaurantId: true
    }
  });

  if (!table) {
    throw new AppError("Invalid or inactive table QR token", 400);
  }

  return table;
}

async function createOrderTransaction(transaction, input) {
  const table = await activeTableByToken(transaction, input.tableQrToken);
  const menuItems = await transaction.menuItem.findMany({
    where: {
      id: { in: input.order.items.map((entry) => entry.menuItemId) },
      restaurantId: table.restaurantId,
      isAvailable: true
    },
    select: menuItemSelect
  });

  if (menuItems.length !== input.order.items.length) {
    throw new AppError("One or more menu items are unavailable or invalid", 400);
  }

  const menuItemsById = new Map(menuItems.map((item) => [item.id, item]));
  let totalAmount = money(0);
  const snapshots = input.order.items.map((requestedItem) => {
    const menuItem = menuItemsById.get(requestedItem.menuItemId);
    const unitPrice = money(menuItem.price);
    const lineSubtotal = unitPrice.mul(requestedItem.quantity);
    totalAmount = totalAmount.add(lineSubtotal);
    return {
      menuItemId: menuItem.id,
      itemName: menuItem.name,
      unitPrice,
      quantity: requestedItem.quantity,
      lineSubtotal
    };
  });

  const order = await transaction.order.create({
    data: {
      restaurantId: table.restaurantId,
      restaurantTableId: table.id,
      status: "PENDING",
      paymentMethod: "CASH",
      paymentStatus: "PAYMENT_DUE",
      totalAmount,
      trackingToken: randomBytes(32).toString("base64url"),
      customerName: input.order.customerName,
      customerContact: input.order.customerContact
    },
    select: { ...orderSelect, items: false }
  });

  const items = [];
  for (const snapshot of snapshots) {
    items.push(await transaction.orderItem.create({
      data: { orderId: order.id, ...snapshot },
      select: orderItemSelect
    }));
  }

  return { ...order, items };
}

export async function createPublicOrder(input) {
  const orderInput = normalizeOrderInput(input);
  if (typeof input.tableQrToken !== "string") {
    throw new AppError("tableQrToken is required", 400);
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const order = await prisma.$transaction(
        (transaction) => createOrderTransaction(transaction, { tableQrToken: input.tableQrToken, order: orderInput }),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
      await publishPersistedOrder(order.id, ORDER_CREATED);
      return presentOrder(order, { includeTrackingToken: true });
    } catch (error) {
      if (error.code !== "P2034" || attempt === 2) throw error;
    }
  }
}

export async function getPublicOrder(trackingToken) {
  if (typeof trackingToken !== "string" || trackingToken.length < 32 || trackingToken.length > 100) {
    throw new AppError("Order not found", 404);
  }

  const order = await prisma.order.findUnique({
    where: { trackingToken },
    select: {
      ...orderSelect,
      restaurant: { select: { name: true, slug: true } },
      restaurantTable: { select: { tableNumber: true } }
    }
  });
  if (!order) throw new AppError("Order not found", 404);

  const result = presentOrder(order);
  result.restaurant = order.restaurant;
  result.tableNumber = order.restaurantTable.tableNumber;
  delete result.restaurantId;
  delete result.restaurantTableId;
  delete result.customerContact;
  return result;
}

async function ownedRestaurant(ownerId, restaurantId) {
  return getRestaurant(ownerId, validateId(restaurantId, "Restaurant"));
}

async function ownedOrder(ownerId, restaurantId, orderId, select = ownerOrderSelect) {
  await ownedRestaurant(ownerId, restaurantId);
  const order = await prisma.order.findFirst({
    where: { id: validateId(orderId, "Order"), restaurantId },
    select
  });
  if (!order) throw new AppError("Order not found", 404);
  return order;
}

export async function listOwnerOrders(ownerId, restaurantId, query) {
  await ownedRestaurant(ownerId, restaurantId);
  const page = Number.parseInt(query.page ?? "1", 10);
  const pageSize = Number.parseInt(query.pageSize ?? "20", 10);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new AppError("page must be positive and pageSize must be between 1 and 100", 400);
  }

  const where = { restaurantId };
  if (query.status !== undefined) {
    if (!orderStatuses.has(query.status)) {
      throw new AppError("Invalid order status filter", 400);
    }
    where.status = query.status;
  }
  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: ownerOrderSelect
    })
  ]);

  return {
    orders: orders.map((order) => presentOrder(order)),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
  };
}

export async function getOwnerOrder(ownerId, restaurantId, orderId) {
  return presentOrder(await ownedOrder(ownerId, restaurantId, orderId));
}

export async function updateOrderStatus(ownerId, restaurantId, orderId, input) {
  const order = await ownedOrder(ownerId, restaurantId, orderId, { id: true, status: true });
  requireObject(input);
  if (!orderStatuses.has(input.status)) throw new AppError("Invalid order status", 400);
  if (!transitions[order.status].has(input.status)) {
    throw new AppError(`Cannot change order status from ${order.status} to ${input.status}`, 409);
  }

  const result = await prisma.order.updateMany({
    where: { id: orderId, restaurantId, status: order.status },
    data: {
      status: input.status,
      ...(input.status === "COMPLETED" ? { completedAt: new Date() } : {})
    }
  });
  if (result.count !== 1) {
    throw new AppError("Order changed before this update could be applied", 409);
  }

  const updatedOrder = await ownedOrder(ownerId, restaurantId, orderId);
  await publishPersistedOrder(updatedOrder.id, ORDER_UPDATED);
  return presentOrder(updatedOrder);
}

export async function updateOrderEta(ownerId, restaurantId, orderId, input) {
  await ownedOrder(ownerId, restaurantId, orderId, { id: true });
  requireObject(input);
  if (!Object.prototype.hasOwnProperty.call(input, "estimatedReadyAt")) {
    throw new AppError("estimatedReadyAt is required", 400);
  }
  let estimatedReadyAt = null;
  if (input.estimatedReadyAt !== null && input.estimatedReadyAt !== undefined) {
    if (typeof input.estimatedReadyAt !== "string") throw new AppError("estimatedReadyAt must be an ISO date or null", 400);
    estimatedReadyAt = new Date(input.estimatedReadyAt);
    if (Number.isNaN(estimatedReadyAt.getTime())) throw new AppError("estimatedReadyAt must be an ISO date or null", 400);
  }

  const result = await prisma.order.updateMany({
    where: { id: orderId, restaurantId },
    data: { estimatedReadyAt }
  });
  if (result.count !== 1) {
    throw new AppError("Order changed before this update could be applied", 409);
  }

  const updatedOrder = await ownedOrder(ownerId, restaurantId, orderId);
  await publishPersistedOrder(updatedOrder.id, ORDER_ETA_UPDATED);
  return presentOrder(updatedOrder);
}

export async function collectCashPayment(ownerId, restaurantId, orderId) {
  const order = await ownedOrder(ownerId, restaurantId, orderId, {
    id: true,
    paymentMethod: true,
    paymentStatus: true
  });

  if (order.paymentMethod !== "CASH") {
    throw new AppError("Only cash orders can be collected through this endpoint", 400);
  }
  if (order.paymentStatus === "PAID") {
    throw new AppError("Order payment has already been collected", 409);
  }

  const result = await prisma.order.updateMany({
    where: {
      id: orderId,
      restaurantId,
      paymentMethod: "CASH",
      paymentStatus: "PAYMENT_DUE"
    },
    data: {
      paymentStatus: "PAID",
      paymentCollectedAt: new Date()
    }
  });
  if (result.count !== 1) {
    throw new AppError("Order payment changed before collection could be recorded", 409);
  }

  const updatedOrder = await ownedOrder(ownerId, restaurantId, orderId);
  await publishPersistedOrder(updatedOrder.id, ORDER_UPDATED);
  return presentOrder(updatedOrder);
}
