import { Router } from "express";
import { requireAuthentication } from "../middleware/auth.middleware.js";
import {
  createTableController,
  getTableController,
  listTablesController,
  tableAvailabilityController,
  tableQrController,
  updateTableController
} from "../controllers/table.controller.js";

const tableRouter = Router();

tableRouter.use(requireAuthentication);
tableRouter.post("/:restaurantId/tables", createTableController);
tableRouter.get("/:restaurantId/tables", listTablesController);
tableRouter.get("/:restaurantId/tables/:tableId", getTableController);
tableRouter.patch("/:restaurantId/tables/:tableId", updateTableController);
tableRouter.patch("/:restaurantId/tables/:tableId/availability", tableAvailabilityController);
tableRouter.get("/:restaurantId/tables/:tableId/qr", tableQrController);

export default tableRouter;
