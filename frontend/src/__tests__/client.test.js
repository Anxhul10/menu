import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api, getToken, setToken } from "../api/client";

describe("API client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.sessionStorage.clear();
  });

  it("sends JSON and bearer authentication headers", async () => {
    setToken("test-token");
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ user: { id: "user-1" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await api.me();

    const [url, options] = fetch.mock.calls[0];

    expect(url).toContain("/auth/me");
    expect(options.headers.get("Authorization")).toBe("Bearer test-token");

    global.fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ token: "new-token" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    await api.login({ email: "owner@example.com", password: "password123" });

    const [, loginOptions] = fetch.mock.calls[1];
    expect(loginOptions.headers.get("Content-Type")).toBe("application/json");
    expect(loginOptions.body).toBe(JSON.stringify({
      email: "owner@example.com",
      password: "password123",
    }));
  });

  it("clears expired tokens and exposes consistent API errors", async () => {
    setToken("expired-token");
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "Token expired" } }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(api.me()).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      message: "Token expired",
    });
    expect(getToken()).toBeNull();
    expect(ApiError).toBeTypeOf("function");
  });

  it("reports an unavailable backend without claiming success", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("Network unavailable"));

    await expect(api.restaurants()).rejects.toMatchObject({
      name: "ApiError",
      status: 0,
      message: "Unable to reach the Menu server."
    });
  });
});
