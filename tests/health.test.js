import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app.js";

describe("GET /api/health", () => {
  it("returns the service health status", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      service: "menu-backend"
    });
  });
});

describe("unknown routes", () => {
  it("returns a structured 404 response", async () => {
    const response = await request(app).get("/api/unknown");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        message: "Route not found: GET /api/unknown"
      }
    });
  });
});
