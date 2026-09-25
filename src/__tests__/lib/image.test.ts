import { describe, expect, test } from "bun:test";
import { isValidImageUrl, normalizeImageUrl } from "@/lib/image";

describe("listing image URLs", () => {
  test.each([
    undefined,
    "",
    "AgACAgIAAxkBAAIGEmktUIcHikBGZR4jv5NaStt0PpWdAAKfDGsbB3BxSTg5xb0weBz-AQADAgADeQADNgQ",
    "//firebasestorage.googleapis.com/photo.jpg",
    "/\\untrusted.example/photo.jpg",
    "https://supabase.co.untrusted.example/photo.jpg",
    "https://untrusted.example/photo.jpg",
    "http://api.foodshare.club/photo.jpg",
    "https://user:password@api.foodshare.club/photo.jpg",
  ])("rejects values the image optimizer cannot use: %s", (value) => {
    expect(isValidImageUrl(value)).toBe(false);
    expect(normalizeImageUrl(value)).toBeUndefined();
  });

  test.each([
    "/images/placeholder-food.png",
    "https://project.supabase.co/storage/v1/object/public/posts/photo.jpg",
    "https://account.r2.cloudflarestorage.com/posts/photo.jpg",
    "https://api.foodshare.club/storage/v1/object/public/posts/photo.jpg",
    "https://firebasestorage.googleapis.com/v0/b/legacy/o/photo.jpg?alt=media&token=public-image-token",
  ])("preserves supported listing photos: %s", (value) => {
    expect(isValidImageUrl(value)).toBe(true);
    expect(normalizeImageUrl(value)).toBe(value);
  });

  test("normalizes older host-based photo URLs without treating Telegram IDs as hosts", () => {
    expect(
      normalizeImageUrl("  firebasestorage.googleapis.com/v0/b/legacy/o/photo.jpg?alt=media  ")
    ).toBe("https://firebasestorage.googleapis.com/v0/b/legacy/o/photo.jpg?alt=media");
  });
});
