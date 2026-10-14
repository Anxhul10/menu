import {
  collectCashPayment,
  getOwnerOrder,
  listOwnerOrders,
  updateOrderEta,
  updateOrderStatus,
} from "../services/order.service.js";

function handle(operation, statusCode = 200) {
  return async (request, response, next) => {
    try {
      return response.status(statusCode).json(await operation(request));
    } catch (error) {
      return next(error);
    }
  };
}

export const listOrdersController = handle(async (request) => ({
  ...(await listOwnerOrders(
    request.auth.userId,
    request.params.restaurantId,
    request.query,
  )),
}));

export const getOrderController = handle(async (request) => ({
  order: await getOwnerOrder(
    request.auth.userId,
    request.params.restaurantId,
    request.params.orderId,
  ),
}));

export const statusController = handle(async (request) => ({
  order: await updateOrderStatus(
    request.auth.userId,
    request.params.restaurantId,
    request.params.orderId,
    request.body,
  ),
}));

export const etaController = handle(async (request) => ({
  order: await updateOrderEta(
    request.auth.userId,
    request.params.restaurantId,
    request.params.orderId,
    request.body,
  ),
}));

export const paymentController = handle(async (request) => ({
  order: await collectCashPayment(
    request.auth.userId,
    request.params.restaurantId,
    request.params.orderId,
  ),
}));
