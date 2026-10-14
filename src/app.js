import express from "express";
import authRouter from "./routes/auth.routes.js";
import healthRouter from "./routes/health.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { notFoundHandler } from "./middleware/not-found.middleware.js";

export const app = express();

app.use(express.json());
app.use("/api", healthRouter);
app.use("/api/auth", authRouter);
app.use(notFoundHandler);
app.use(errorHandler);
