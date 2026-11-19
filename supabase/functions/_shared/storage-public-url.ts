/** Public application files use the configured external Supabase API origin. */
export function storagePublicUrl(
  base: string,
  bucket: string,
  path: string,
): string {
  const url = new URL(base);
  if (
    url.protocol !== "https:" || url.username || url.password || !bucket ||
    bucket.includes("/") || !path || path.startsWith("/") ||
    path.split("/").some((p) => p === "." || p === "..")
  ) throw Error("Invalid public Supabase storage routing");
  url.pathname = "/storage/v1/object/public/" + encodeURIComponent(bucket) +
    "/" + path.split("/").map(encodeURIComponent).join("/");
  url.search = "";
  url.hash = "";
  return url.href;
}
