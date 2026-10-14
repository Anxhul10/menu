import { createPublicOrder, getPublicOrder, getPublicOrderSession } from "../services/order.service.js";

export async function createOrder(request, response, next) {
  try {
    response.status(201).json({ order: await createPublicOrder(request.body) });
  } catch (error) {
    next(error);
  }
}

export async function getOrder(request, response, next) {
  try {
    response.status(200).json({ order: await getPublicOrder(request.params.trackingToken) });
  } catch (error) {
    next(error);
  }
}

export async function getOrderSession(request, response, next) {
  try {
    response.status(200).json({
      ...await getPublicOrderSession(request.query.tableQrToken, request.params.orderingSessionToken)
    });
  } catch (error) {
    next(error);
  }
}
