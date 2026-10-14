import { Router } from "express";
import { requireAuthentication } from "../middleware/auth.middleware.js";
import {
  createTableController,
  deleteTableController,
  getTableController,
  listTablesController,
  tableAvailabilityController,
  resetTableController,
  tableQrController,
  updateTableController,
} from "../controllers/table.controller.js";

const tableRouter = Router();

tableRouter.use(requireAuthentication);
tableRouter.post("/:restaurantId/tables", createTableController);
tableRouter.get("/:restaurantId/tables", listTablesController);
tableRouter.get("/:restaurantId/tables/:tableId", getTableController);
tableRouter.delete("/:restaurantId/tables/:tableId", deleteTableController);
tableRouter.patch("/:restaurantId/tables/:tableId", updateTableController);
tableRouter.patch(
  "/:restaurantId/tables/:tableId/availability",
  tableAvailabilityController,
);
tableRouter.patch("/:restaurantId/tables/:tableId/reset", resetTableController);
tableRouter.get("/:restaurantId/tables/:tableId/qr", tableQrController);

export default tableRouter;
