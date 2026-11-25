import { afterEach, describe, expect, mock, test } from "bun:test";
import { ImageCarousel } from "@/components/productCard/ImageCarousel";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

mock.module("next-intl", () => ({
  useTranslations: () => (key: string, opts?: { defaultMessage?: string }) => opts?.defaultMessage || key,
}));
mock.module("next/image", () => ({
  default: ({ src, alt, onError }: { src: string; alt: string; onError?: () => void }) => (
    <img src={src} alt={alt} onError={onError} />
  ),
}));

afterEach(cleanup);

const BASE = "https://api.foodshare.club/storage/v1/object/public";
const REFERENCE = `${BASE}/assets/listing-reference/${"a".repeat(64)}/fresh-produce.jpg`;
const TITLE_CARD = `${BASE}/food-images/u/reference-covers/${"b".repeat(64)}.jpeg`;
const PHOTO = `${BASE}/food-images/u/photo.jpg`;

const props = { productUrl: "/food/1", productId: 1, postName: "Apples", postType: "food" };

describe("ImageCarousel cover guarantee", () => {
  test("renders a stored reference cover instead of hiding it", () => {
    render(<ImageCarousel {...props} images={[REFERENCE]} />);
    expect(screen.queryByTestId("finding-photo")).toBeNull();
    expect(screen.getByAltText("Apples").getAttribute("src")).toBe(REFERENCE);
  });

  test("stored images render first, in order, with no generated cover", () => {
    render(<ImageCarousel {...props} images={[TITLE_CARD, PHOTO]} coverUrl="/assets/covers/food/assorted-1.jpg" />);
    const srcs = screen.getAllByAltText("Apples").map((img) => img.getAttribute("src"));
    expect(srcs).toEqual([TITLE_CARD, PHOTO]);
    expect(screen.queryByTestId("finding-photo")).toBeNull();
  });

  test("empty images show the distinct transient state with a spinner", () => {
    render(<ImageCarousel {...props} images={[]} coverUrl="/assets/covers/food/assorted-1.jpg" />);
    expect(screen.getByRole("status").getAttribute("aria-label")).toBe(
      "Finding a photo for this Community Food listing…",
    );
    expect(screen.getByTestId("finding-photo-indicator")).toBeTruthy();
  });

  test("only the dead URL is dropped; the live stored image stays visible", () => {
    render(<ImageCarousel {...props} images={[REFERENCE, PHOTO]} />);
    fireEvent.error(screen.getAllByAltText("Apples")[0]);
    const srcs = screen.getAllByAltText("Apples").map((img) => img.getAttribute("src"));
    expect(srcs).toEqual([PHOTO]);
    expect(screen.queryByTestId("finding-photo")).toBeNull();
  });

  test("every URL dead falls back to the transient state", () => {
    render(<ImageCarousel {...props} images={[PHOTO]} />);
    fireEvent.error(screen.getByAltText("Apples"));
    expect(screen.getByTestId("finding-photo")).toBeTruthy();
  });

  test("invalid URLs are filtered and trigger the transient state", () => {
    render(<ImageCarousel {...props} images={["not a url", "http://evil.example/x.jpg"]} />);
    expect(screen.getByTestId("finding-photo")).toBeTruthy();
  });
});
