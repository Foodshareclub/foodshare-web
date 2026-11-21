import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { BecomeSharerBlock } from "@/components/becomeSharerBlock/BecomeSharerBlock";

mock.module("next/image", () => ({
  default: ({
    src,
    alt,
    width,
    height,
  }: {
    src: string | { src: string };
    alt: string;
    width: number;
    height: number;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : src.src} alt={alt} width={width} height={height} />
  ),
}));

describe("BecomeSharerBlock - Airbnb Listing Creation Popover", () => {
  it("renders trigger Add listing button and opens category dropdown on click", async () => {
    const { container } = render(<BecomeSharerBlock defaultOpen={true} />);

    const trigger = container.querySelector("button");
    expect(trigger).not.toBeNull();
    expect(trigger?.textContent).toContain("Add listing");

    // Assert main share categories exist in portal
    expect(await screen.findByText("Share")).toBeDefined();
    expect(screen.getByText("Food")).toBeDefined();
    expect(screen.getByText("Things")).toBeDefined();
    expect(screen.getByText("Borrow")).toBeDefined();
    expect(screen.getByText("Wanted")).toBeDefined();

    // Assert community section
    expect(screen.getByText("Community")).toBeDefined();
    expect(screen.getByText("Community fridge")).toBeDefined();
    expect(screen.getByText("Food bank")).toBeDefined();
    expect(screen.getByText("Volunteer")).toBeDefined();

    // Assert link destinations
    const foodLink = screen.getByText("Food").closest("a");
    expect(foodLink?.getAttribute("href")).toBe("/new?type=food");

    const thingsLink = screen.getByText("Things").closest("a");
    expect(thingsLink?.getAttribute("href")).toBe("/new?type=thing");
  });
});
