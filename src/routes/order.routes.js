import { Router } from "express";
import { requireAuthentication } from "../middleware/auth.middleware.js";
import { etaController, getOrderController, listOrdersController, statusController } from "../controllers/order.controller.js";

const orderRouter = Router();

orderRouter.use(requireAuthentication);
orderRouter.get("/:restaurantId/orders", listOrdersController);
orderRouter.get("/:restaurantId/orders/:orderId", getOrderController);
orderRouter.patch("/:restaurantId/orders/:orderId/status", statusController);
orderRouter.patch("/:restaurantId/orders/:orderId/eta", etaController);

export default orderRouter;
