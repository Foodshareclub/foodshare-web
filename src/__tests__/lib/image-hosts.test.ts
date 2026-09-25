import { expect, test } from "bun:test";
import { hasRemoteMatch } from "next/dist/shared/lib/match-remote-pattern";
import { CONFIGURED_IMAGE_PATTERNS, normalizeImageUrl } from "@/lib/image";

test("Next Image accepts legacy Firebase photos as well as storage subdomains", () => {
  for (const source of [
    "https://firebasestorage.googleapis.com/v0/b/foodshare.appspot.com/o/uploads%2Fphoto.jpg?alt=media",
    "https://project.supabase.co/storage/v1/object/public/posts/photo.jpg",
    "https://foodshare.club/images/food.jpg",
    "https://images.foodshare.club/posts/photo.jpg",
    "https://bucket.r2.cloudflarestorage.com/food.jpg",
  ]) {
    const normalized = normalizeImageUrl(source);
    expect(normalized).toBeDefined();
    expect(hasRemoteMatch([], CONFIGURED_IMAGE_PATTERNS, new URL(normalized!))).toBe(true);
  }
});

test("image configuration still rejects untrusted and insecure origins", () => {
  for (const source of [
    "https://supabase.co.untrusted.example/photo.jpg",
    "https://untrusted.example/photo.jpg",
    "http://firebasestorage.googleapis.com/photo.jpg",
  ]) {
    expect(hasRemoteMatch([], CONFIGURED_IMAGE_PATTERNS, new URL(source))).toBe(false);
    expect(normalizeImageUrl(source)).toBeUndefined();
  }
});
