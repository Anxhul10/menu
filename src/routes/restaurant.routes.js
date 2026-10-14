import { Router } from "express";
import { requireAuthentication } from "../middleware/auth.middleware.js";
import { create, get, list, remove, update } from "../controllers/restaurant.controller.js";

const restaurantRouter = Router();

restaurantRouter.use(requireAuthentication);
restaurantRouter.post("/", create);
restaurantRouter.get("/", list);
restaurantRouter.get("/:id", get);
restaurantRouter.patch("/:id", update);
restaurantRouter.delete("/:id", remove);

export default restaurantRouter;
