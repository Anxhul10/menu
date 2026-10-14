import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import useOwnerOrderSocket from "../hooks/useOwnerOrderSocket";

const socket = vi.hoisted(() => ({
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  removeAllListeners: vi.fn(),
  disconnect: vi.fn()
}));

vi.mock("../realtime/socket-client", () => ({
  createMenuSocket: vi.fn(() => socket)
}));

function Probe() {
  useOwnerOrderSocket("33333333-3333-4333-8333-333333333333", {
    onEvent: vi.fn(),
    onReconnect: vi.fn()
  });
  return null;
}

describe("owner order socket hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("unsubscribes and removes listeners on unmount", () => {
    const view = render(<Probe />);

    view.unmount();

    expect(socket.emit).toHaveBeenCalledWith("restaurant:unsubscribe", {
      restaurantId: "33333333-3333-4333-8333-333333333333"
    });
    expect(socket.disconnect).toHaveBeenCalled();
    expect(socket.removeAllListeners).toHaveBeenCalledWith("order:created");
    expect(socket.removeAllListeners).toHaveBeenCalledWith("order:updated");
    expect(socket.removeAllListeners).toHaveBeenCalledWith("order:eta_updated");
  });
});
