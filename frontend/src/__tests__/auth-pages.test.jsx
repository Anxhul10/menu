import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../context/AuthContext";
import LoginPage from "../pages/LoginPage";

const loginMock = vi.fn();

vi.mock("../api/client", () => ({
  api: {
    login: (...args) => loginMock(...args),
    me: vi.fn(),
  },
  getToken: () => null,
  setToken: vi.fn(),
  clearToken: vi.fn(),
}));

describe("login page", () => {
  beforeEach(() => {
    loginMock.mockReset();
    loginMock.mockResolvedValue({
      token: "token",
      user: { id: "user-1", name: "Owner", email: "owner@example.com" },
      restaurants: [],
    });
  });

  it("submits credentials through the authentication context", async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "owner@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        email: "owner@example.com",
        password: "password123",
      });
    });
  });
});
