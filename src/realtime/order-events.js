import { EventEmitter } from "node:events";

export const orderEvents = new EventEmitter();

export const ORDER_CREATED = "order:created";
export const ORDER_UPDATED = "order:updated";
export const ORDER_ETA_UPDATED = "order:eta_updated";

export function publishOrderEvent(eventName, payload) {
  orderEvents.emit(eventName, payload);
}
