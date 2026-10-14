import { createServer } from "node:http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { createRealtimeServer } from "./realtime/socket.js";

export const httpServer = createServer(app);
export const io = createRealtimeServer(httpServer);

httpServer.listen(env.port, () => {
  console.log(`Menu backend listening on port ${env.port}`);
});
