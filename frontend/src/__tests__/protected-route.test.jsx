import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AuthProvider } from "../context/AuthContext";
import ProtectedRoute from "../components/ProtectedRoute";

describe("protected routes", () => {
  it("redirects unauthenticated visitors to login", async () => {
    render(
      <MemoryRouter initialEntries={["/app"]}>
        <AuthProvider>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/app" element={<div>Owner dashboard</div>} />
            </Route>
            <Route path="/admin/login" element={<div>Login screen</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByText("Login screen")).toBeInTheDocument(),
    );
    expect(screen.queryByText("Owner dashboard")).not.toBeInTheDocument();
  });
});
