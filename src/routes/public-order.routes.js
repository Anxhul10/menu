import { Router } from "express";
import { createOrder, getOrder, getOrderSession } from "../controllers/public-order.controller.js";

const publicOrderRouter = Router();

publicOrderRouter.post("/orders", createOrder);
publicOrderRouter.get("/orders/session/:orderingSessionToken", getOrderSession);
publicOrderRouter.get("/orders/:trackingToken", getOrder);

export default publicOrderRouter;
