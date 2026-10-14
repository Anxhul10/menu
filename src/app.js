import express from "express";
import authRouter from "./routes/auth.routes.js";
import healthRouter from "./routes/health.routes.js";
import restaurantRouter from "./routes/restaurant.routes.js";
import menuRouter from "./routes/menu.routes.js";
import publicMenuRouter from "./routes/public-menu.routes.js";
import tableRouter from "./routes/table.routes.js";
import publicTableRouter from "./routes/public-table.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { notFoundHandler } from "./middleware/not-found.middleware.js";

export const app = express();

app.use(express.json());
app.use("/api", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/restaurants", restaurantRouter);
app.use("/api/restaurants", menuRouter);
app.use("/api/restaurants", tableRouter);
app.use("/api/public", publicMenuRouter);
app.use("/api/public", publicTableRouter);
app.use(notFoundHandler);
app.use(errorHandler);
