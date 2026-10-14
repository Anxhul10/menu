import { createPublicOrder, getPublicOrder } from "../services/order.service.js";

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
