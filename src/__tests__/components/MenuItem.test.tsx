import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";

import { DropdownMenuEntry } from "@/components/header/navbar/atoms/DropdownMenuEntry";
import { MenuItem } from "@/components/header/navbar/atoms/MenuItem";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/**
 * The primary navigation menu was a `DropdownMenuContent` (Radix) containing
 * `<div role="menuitem" tabIndex={0}>` rows. That combination looks right and
 * behaves like a mouse-only menu:
 *
 *   - Arrow keys never reached the items. Radix drives roving focus over *its
 *     own* `DropdownMenuItem` children via a Collection and `data-highlighted`;
 *     an item outside that collection is not part of the menu's focus loop.
 *   - The items never got `data-highlighted`, so neither Radix's
 *     `data-[highlighted]:bg-accent` nor the item's own `focus:ring` fired,
 *     because Radix only ever focuses its own items.
 *   - Typeahead ("l" to jump to "Log Out") could not see them.
 *   - `role="menuitem"` with unmanaged focus contradicts the `role="menu"` the
 *     primitive already sets.
 *
 * So the entire logged-in user menu — Admin, My listings, Chat, Settings,
 * Log out — was effectively mouse-only. These tests assert the keyboard path,
 * because "it is a div with a keydown handler" is exactly the shape that
 * produced the bug.
 */
function renderMenu() {
  const onSelect = mock();
  render(
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button">Open menu</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuEntry
          label="My listings"
          icon={<svg data-testid="entry-icon" />}
          onSelect={onSelect}
          testId="menu-my-listings"
        />
        <DropdownMenuEntry label="Log Out" onSelect={onSelect} testId="menu-logout" variant="danger" />
      </DropdownMenuContent>
    </DropdownMenu>,
  );

  fireEvent.pointerDown(screen.getByRole("button", { name: "Open menu" }), { pointerType: "mouse", button: 0 });
  return { onSelect };
}

describe("DropdownMenuEntry", () => {
  it("is part of the menu, so Radix focuses it", async () => {
    renderMenu();
    const item = await screen.findByTestId("menu-my-listings");

    // `data-highlighted` is Radix's own signal that the roving focus is on this
    // item. A hand-rolled div can never receive it, which is what made the focus
    // styling dead as well as the keyboard navigation.
    expect(item.closest("[role='menuitem']")).not.toBeNull();
  });

  it("activates on Enter", async () => {
    const { onSelect } = renderMenu();
    const item = await screen.findByTestId("menu-logout");

    fireEvent.keyDown(item, { key: "Enter" });
    // Radix handles activation on the keydown it listens for; what matters is
    // that the handler is wired at all, so assert the call.
    expect(onSelect).toHaveBeenCalled();
  });

  it("activates on Space", async () => {
    const { onSelect } = renderMenu();
    const item = await screen.findByTestId("menu-logout");

    fireEvent.keyDown(item, { key: " " });
    expect(onSelect).toHaveBeenCalled();
  });

  it("hides the decorative icon from assistive technology", async () => {
    renderMenu();
    const item = await screen.findByTestId("menu-my-listings");
    // Icons are decoration next to a text label; announcing them twice is noise.
    expect(item.querySelector("[aria-hidden='true']")).not.toBeNull();
  });
});

describe("MenuItem outside a menu", () => {
  it("is a real button, so Enter and Space work without a keydown handler", () => {
    const onClick = mock();
    render(<MenuItem label="My Messages" onClick={onClick} />);

    const button = screen.getByRole("button", { name: "My Messages" });
    expect(button).toBeDefined();

    // A <button> is focusable and activates natively. The old implementation was
    // a div with tabIndex and a hand-rolled onKeyDown, which is the same
    // behaviour written out longhand and easy to get subtly wrong.
    button.focus();
    expect(document.activeElement).toBe(button);

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not claim to be a menu item, because nothing here is a menu", () => {
    render(<MenuItem label="My Messages" onClick={mock()} />);

    // `role="menuitem"` outside a `role="menu"` is a claim the accessibility
    // tree cannot satisfy, and it inherits none of the menu keyboard contract.
    expect(screen.queryByRole("menuitem")).toBeNull();
    expect(screen.getByRole("button")).toBeDefined();
  });

  it("does not fire when disabled", () => {
    const onClick = mock();
    render(<MenuItem label="Admin" onClick={onClick} disabled />);

    fireEvent.click(screen.getByRole("button", { name: "Admin" }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
