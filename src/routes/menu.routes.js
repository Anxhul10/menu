import { Router } from "express";
import { requireAuthentication } from "../middleware/auth.middleware.js";
import {
  availabilityController,
  createCategoryController,
  createItemController,
  deleteCategoryController,
  deleteItemController,
  getItemController,
  listCategoriesController,
  listItemsController,
  updateCategoryController,
  updateItemController,
} from "../controllers/menu.controller.js";

const menuRouter = Router();

menuRouter.use(requireAuthentication);
menuRouter.post("/:restaurantId/categories", createCategoryController);
menuRouter.get("/:restaurantId/categories", listCategoriesController);
menuRouter.patch(
  "/:restaurantId/categories/:categoryId",
  updateCategoryController,
);
menuRouter.delete(
  "/:restaurantId/categories/:categoryId",
  deleteCategoryController,
);
menuRouter.post("/:restaurantId/items", createItemController);
menuRouter.get("/:restaurantId/items", listItemsController);
menuRouter.get("/:restaurantId/items/:itemId", getItemController);
menuRouter.patch("/:restaurantId/items/:itemId", updateItemController);
menuRouter.delete("/:restaurantId/items/:itemId", deleteItemController);
menuRouter.patch(
  "/:restaurantId/items/:itemId/availability",
  availabilityController,
);

export default menuRouter;
