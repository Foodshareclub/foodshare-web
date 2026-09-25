import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import type { ActionResult } from "@/lib/errors";
import type { InitialProductStateType } from "@/types/product.types";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";

const updateProduct = mock(
  async (_id: number, _form: FormData): Promise<ActionResult<undefined>> => ({
    success: true,
    data: undefined,
  })
);
const updateRoom = mock(async (_id: string, _form: FormData) => ({
  success: true,
  data: undefined,
}));
const refresh = mock(() => {});
mock.module("@/app/actions/products", () => ({ updateProduct }));
mock.module("@/app/actions/chat", () => ({ updateRoom }));
mock.module("@/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: true }) }));
mock.module("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
mock.module("next/image", () => ({ default: () => null }));
mock.module("@/components/modals/AuthenticationUser/AuthenticationUserModal", () => ({
  default: () => null,
}));
mock.module("@/components/modals/PopupNotificationModal", () => ({ default: () => null }));
mock.module("@/components/topTips/TopTips", () => ({ default: () => null }));
const { OneProduct } = await import("@/components/oneProduct/OneProduct");

const product = {
  id: 42,
  version: 7,
  post_name: "Spare apples",
  post_description: "Apples available for pickup",
  images: ["https://example.com/apples.jpg"],
  is_active: true,
} as InitialProductStateType;

beforeEach(() => {
  updateProduct.mockClear();
  updateProduct.mockImplementation(async () => ({ success: true, data: undefined }));
  updateRoom.mockClear();
  refresh.mockClear();
});
afterEach(cleanup);

describe("handover confirmation", () => {
  test("sends the loaded revision and does not arrange a room after a failed listing update", async () => {
    updateProduct.mockImplementation(async () => ({
      success: false,
      error: { code: "CONFLICT", message: "This listing changed. Reload before confirming." },
    }));
    const view = render(
      <OneProduct
        product={product}
        buttonValue="approval pending"
        roomId="room-1"
        requesterId="requester-1"
      />
    );
    fireEvent.click(view.getByRole("button", { name: "approval pending" }));
    await waitFor(() =>
      expect(view.getByRole("alert").textContent).toContain("This listing changed")
    );
    expect(updateProduct).toHaveBeenCalledTimes(1);
    const [id, form] = updateProduct.mock.calls[0];
    expect(id).toBe(42);
    expect(form.get("version")).toBe("7");
    expect(form.get("is_active")).toBe("false");
    expect(form.has("images")).toBe(false);
    expect(updateRoom).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  test("arranges the room only after the listing update succeeds", async () => {
    let completeUpdate!: (value: ActionResult<undefined>) => void;
    updateProduct.mockImplementation(
      () =>
        new Promise((resolve) => {
          completeUpdate = resolve;
        })
    );
    const view = render(
      <OneProduct
        product={product}
        buttonValue="approval pending"
        roomId="room-1"
        requesterId="requester-1"
      />
    );
    const button = view.getByRole("button", { name: "approval pending" });
    fireEvent.click(button);
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(updateRoom).not.toHaveBeenCalled();
    completeUpdate({ success: true, data: undefined });
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(updateRoom).toHaveBeenCalledTimes(1);
    const [roomId, form] = updateRoom.mock.calls[0];
    expect(roomId).toBe("room-1");
    expect(form.get("post_arranged_to")).toBe("requester-1");
  });
});
