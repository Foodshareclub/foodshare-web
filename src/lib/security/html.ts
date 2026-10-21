/**
 * HTML sanitization utility to prevent XSS.
 */
export function sanitizeHtml(dirty: string): string {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = dirty;
  return tempDiv.textContent || tempDiv.innerText || "";
}
