import { describe, expect, it, mock } from "bun:test";
import { render, screen } from "@testing-library/react";

mock.module("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

mock.module("@/components/theme/ThemeToggle", () => ({
  ThemeToggleInline: () => <div data-testid="theme-toggle" />,
}));

mock.module("@/components/modals/AuthenticationUser/AuthenticationUserModal", () => ({
  default: () => null,
}));

import { AddListingButton } from "@/components/becomeSharerBlock/AddListingButton";
import { DesktopMenu } from "@/components/header/navbar/organisms/DesktopMenu";

describe("Airbnb Navigation Elements", () => {
  it("renders DesktopMenu trigger as an accessible capsule button with menu icon and avatar", () => {
    render(
      <DesktopMenu
        isAuth={false}
        signalOfNewMessage={[]}
        onNavigateToMyLists={() => {}}
        onNavigateToLogout={() => {}}
        onNavigateToAccSettings={() => {}}
        onNavigateToHelp={() => {}}
        onNavigateToAboutUs={() => {}}
        onNavigateToMyMessages={() => {}}
      />,
    );

    const triggerButton = screen.getByRole("button", { name: "seeMenu" });
    expect(triggerButton).toBeDefined();
    expect(triggerButton.className).toContain("rounded-full");
    expect(triggerButton.className).toContain("border");
    expect(triggerButton.className).toContain("shadow-2xs");
  });

  it("renders AddListingButton with pill styling and plus icon", () => {
    render(<AddListingButton />);

    const button = screen.getByRole("button", { name: /Add listing/i });
    expect(button).toBeDefined();
    expect(button.className).toContain("rounded-full");
    expect(button.className).toContain("bg-emerald-600");
  });
});
