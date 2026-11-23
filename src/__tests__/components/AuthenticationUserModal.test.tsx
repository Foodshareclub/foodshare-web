import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";

mock.module("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      logIn: "Log in",
      signUp: "Sign up",
      firstName: "First name",
      lastName: "Last name",
      emailAddress: "Email address",
      password: "Password",
      showPassword: "Show password",
      hidePassword: "Hide password",
      orContinueWith: "or continue with",
      noAccountPrompt: "Don't have an account?",
      haveAccountPrompt: "Already have an account?",
      "modal.welcomeTitle": "Welcome to FoodShare",
      "modal.loginBody": "Log in to share and request food items in your area.",
      "modal.signupBody": "Join a global community reducing food waste together.",
      "modal.continueLabel": "Continue",
    };
    return translations[key] || key;
  },
}));

mock.module("@/hooks/useAuth", () => ({
  useAuth: () => ({
    loginWithPassword: mock(() => Promise.resolve({ success: true })),
    loginWithProvider: mock(() => Promise.resolve({ success: true })),
    register: mock(() => Promise.resolve({ success: true })),
    authError: null,
    clearError: mock(),
    isAuth: false,
  }),
}));

mock.module("@/lib/config/oauth", () => ({
  getEnabledProviders: () => [],
  isOAuthEnabled: () => false,
}));

mock.module("@/lib/errors/storage-handler", () => ({
  testStorageAvailability: () => Promise.resolve({ localStorage: true, indexedDB: true }),
  clearSupabaseStorage: () => Promise.resolve(true),
}));

mock.module("@/lib/supabase/client", () => ({
  isStorageHealthy: true,
}));

import AuthenticationUserModal from "@/components/modals/AuthenticationUser/AuthenticationUserModal";

describe("AuthenticationUserModal - Airbnb Auth Experience", () => {
  it("renders Airbnb elevated modal dialog with header, welcome copy, and brand continue button", () => {
    render(<AuthenticationUserModal isOpen={true} mode="login" onClose={() => {}} />);

    expect(screen.getByText("Welcome to FoodShare")).toBeDefined();
    expect(screen.getByText("Log in to share and request food items in your area.")).toBeDefined();

    const continueBtn = screen.getByRole("button", { name: "Continue" });
    expect(continueBtn).toBeDefined();
    expect(continueBtn.className).toContain("bg-brand");
    expect(continueBtn.className).toContain("rounded-xl");
  });

  it("renders sign up mode with first and last name inputs when mode=signup", () => {
    render(<AuthenticationUserModal isOpen={true} mode="signup" onClose={() => {}} />);

    const firstNameInput = screen.getByPlaceholderText("First name");
    const lastNameInput = screen.getByPlaceholderText("Last name");
    expect(firstNameInput).toBeDefined();
    expect(lastNameInput).toBeDefined();

    expect(firstNameInput.className).toContain("focus:border-brand");
    expect(lastNameInput.className).toContain("focus:border-brand");
  });

  it("toggles between login and signup modes smoothly", () => {
    render(<AuthenticationUserModal isOpen={true} mode="login" onClose={() => {}} />);

    const toggleBtn = screen.getByRole("button", { name: "Sign up" });
    expect(toggleBtn).toBeDefined();
    fireEvent.click(toggleBtn);

    expect(screen.getByPlaceholderText("First name")).toBeDefined();
  });
});
