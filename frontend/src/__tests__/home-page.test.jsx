import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "../pages/HomePage";

const publicTableMock = vi.fn();

vi.mock("../api/client", () => ({
  api: { publicTable: (...args) => publicTableMock(...args) }
}));

describe("customer-first homepage", () => {
  beforeEach(() => {
    publicTableMock.mockReset();
  });

  it("renders without authentication and exposes the admin entry point", () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: /good food/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute("href", "/admin");
    expect(screen.getByRole("button", { name: /scan qr code/i })).toBeInTheDocument();
  });

  it("resolves a valid manual table code and navigates to its menu", async () => {
    const tableCode = "a".repeat(43);
    publicTableMock.mockResolvedValue({ restaurant: { slug: "green-leaf" } });
    render(<MemoryRouter initialEntries={["/"]}><Routes><Route path="/" element={<HomePage />} /><Route path="/r/:slug/t/:token" element={<div>Table menu opened</div>} /></Routes></MemoryRouter>);

    fireEvent.change(screen.getByLabelText("Enter your table code"), { target: { value: tableCode } });
    fireEvent.click(screen.getByRole("button", { name: "Find Menu" }));

    await waitFor(() => expect(screen.getByText("Table menu opened")).toBeInTheDocument());
    expect(publicTableMock).toHaveBeenCalledWith(tableCode);
  });

  it("rejects malformed table codes before calling the API", async () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText("Enter your table code"), { target: { value: "table-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Find Menu" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Enter the table code");
    expect(publicTableMock).not.toHaveBeenCalled();
  });
});
