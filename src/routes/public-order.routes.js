import { Router } from "express";
import { createOrder, getOrder } from "../controllers/public-order.controller.js";

const publicOrderRouter = Router();

publicOrderRouter.post("/orders", createOrder);
publicOrderRouter.get("/orders/:trackingToken", getOrder);

export default publicOrderRouter;
