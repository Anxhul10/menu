import { Router } from "express";
import { publicMenu } from "../controllers/public-menu.controller.js";

const publicMenuRouter = Router();

publicMenuRouter.get("/restaurants/:slug/menu", publicMenu);

export default publicMenuRouter;
