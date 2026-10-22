import { describe, expect, it } from "bun:test";
import { ErrorDisplay } from "@/components/error/ErrorDisplay";
import { render, screen } from "@testing-library/react";

/**
 * The error boundary's timestamp.
 *
 * A client component is prerendered too, and the framework refuses a
 * clock read in the render body there: the value would be evaluated
 * during the prerender and baked into the page, instead of being
 * recomputed on each visit. The refusal aborts the render, and the
 * visitor gets an error page instead of the page -- so an error
 * boundary that reads the clock can turn a small failure into a total
 * one.
 *
 * So the instant is read on the client, and the server renders nothing
 * for it. This test pins that the boundary still renders, and that the
 * timestamp it shows is an instant rather than nothing.
 */
describe("the error boundary", () => {
  const error = new Error("something broke");

  it("renders the error and the way out", () => {
    render(<ErrorDisplay error={error} reset={() => {}} />);

    expect(screen.getByRole("heading", { name: /something went wrong/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /try again/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /go home/i })).toBeDefined();
  });

  it("shows when the error happened", () => {
    const { container } = render(<ErrorDisplay error={error} reset={() => {}} />);

    // The timestamp is an ISO instant, so it can be read and
    // compared. It is read on the client, and the server renders
    // nothing for it, so the two renders agree and there is no
    // hydration mismatch.
    const shown = container.textContent?.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/)?.[0];
    expect(shown).toBeDefined();
    expect(Number.isNaN(Date.parse(shown!))).toBe(false);
  });
});
