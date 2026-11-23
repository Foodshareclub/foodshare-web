import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";

mock.module("next/navigation", () => ({
  useRouter: () => ({
    push: mock(),
    refresh: mock(),
  }),
}));

mock.module("@/hooks/getAllCountries", () => ({
  getAllCountries: mock(() =>
    Promise.resolve([
      {
        id: 1,
        name: "United States",
        continent: "North America",
        iso2: "US",
        iso3: "USA",
        local_name: "United States",
      },
    ]),
  ),
}));

mock.module("@/app/actions/profile", () => ({
  updateAddressDirect: mock(() => Promise.resolve({ success: true })),
}));

import { AddressBlock, EmailBlock, NameBlock, PhoneNumberBlock } from "@/components/profile";

describe("Profile Blocks - Airbnb Account Personal Information", () => {
  it("renders NameBlock with Airbnb card elevation and handles edit mode toggle", () => {
    const setFirstName = mock();
    const setSecondName = mock();
    const onSaveHandler = mock();
    const setDisable = mock();

    const { rerender } = render(
      <NameBlock
        firstName="Elena"
        secondName="Rostova"
        setFirstName={setFirstName}
        setSecondName={setSecondName}
        onSaveHandler={onSaveHandler}
        disableNameEdit={false}
        disableEmailEdit={false}
        disablePhoneEdit={false}
        disableAddressEdit={false}
        setDisableEmailEdit={setDisable}
        setDisablePhoneEdit={setDisable}
        setDisableAddressEdit={setDisable}
      />,
    );

    expect(screen.getByText("Name")).toBeDefined();
    expect(screen.getByText("Elena Rostova")).toBeDefined();

    const editBtn = screen.getByRole("button", { name: "Edit" });
    expect(editBtn.className).toContain("rounded-full");
    fireEvent.click(editBtn);

    const saveBtn = screen.getByRole("button", { name: "Save" });
    expect(saveBtn).toBeDefined();
    expect(saveBtn.className).toContain("bg-brand");
  });

  it("renders EmailBlock with crisp Airbnb layout and action buttons", () => {
    const setEmail = mock();
    const onSaveHandler = mock();
    const setDisable = mock();

    render(
      <EmailBlock
        email="elena@example.com"
        setEmail={setEmail}
        onSaveHandler={onSaveHandler}
        disableEmailEdit={false}
        disableNameEdit={false}
        disablePhoneEdit={false}
        disableAddressEdit={false}
        setDisableNameEdit={setDisable}
        setDisablePhoneEdit={setDisable}
        setDisableAddressEdit={setDisable}
      />,
    );

    expect(screen.getByText("Email address")).toBeDefined();
    expect(screen.getByText("elena@example.com")).toBeDefined();

    const editBtn = screen.getByRole("button", { name: "Edit" });
    fireEvent.click(editBtn);

    const saveBtn = screen.getByRole("button", { name: "Save" });
    expect(saveBtn.className).toContain("bg-brand");
    expect(saveBtn.className).toContain("rounded-xl");
  });

  it("renders PhoneNumberBlock and AddressBlock with logical input controls and brand CTAs", () => {
    const setPhone = mock();
    const onSaveHandler = mock();
    const setDisable = mock();

    render(
      <PhoneNumberBlock
        phone="+1 555-0199"
        setPhone={setPhone}
        onSaveHandler={onSaveHandler}
        disablePhoneEdit={false}
        disableNameEdit={false}
        disableEmailEdit={false}
        disableAddressEdit={false}
        setDisableNameEdit={setDisable}
        setDisableEmailEdit={setDisable}
        setDisableAddressEdit={setDisable}
      />,
    );

    expect(screen.getByText("Phone number")).toBeDefined();
    expect(screen.getByText("+1 555-0199")).toBeDefined();

    render(
      <AddressBlock
        address={{
          profile_id: "user-1",
          address_line_1: "123 Orchard Lane",
          address_line_2: "",
          city: "San Francisco",
          county: "San Francisco",
          state_province: "CA",
          postal_code: "94110",
          country: 1,
        }}
        disableAddressEdit={false}
        disableNameEdit={false}
        disableEmailEdit={false}
        disablePhoneEdit={false}
        setDisableNameEdit={setDisable}
        setDisableEmailEdit={setDisable}
        setDisablePhoneEdit={setDisable}
        countries={[
          {
            id: 1,
            name: "United States",
            continent: "North America",
            iso2: "US",
            iso3: "USA",
            local_name: "United States",
          },
        ]}
      />,
    );

    expect(screen.getByText("Address")).toBeDefined();
    expect(screen.getByText("Use a permanent address where you can receive mail.")).toBeDefined();
  });
});
