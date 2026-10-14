import { Router } from "express";
import { publicTable } from "../controllers/public-table.controller.js";

const publicTableRouter = Router();

publicTableRouter.get("/tables/:qrToken", publicTable);

export default publicTableRouter;
