import { afterAll, expect, mock, test } from "bun:test";
import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";
// DOMPurify recommends jsdom for Node; Happy DOM is only the React rendering harness.
const documentWindow = new JSDOM("").window;
const sanitizer = createDOMPurify(documentWindow);
mock.module("dompurify", () => ({ default: sanitizer }));
const { RichTextViewer } = await import("@/components/forum/RichTextViewer");
afterAll(() => documentWindow.close());
import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";

const hostile =
  '<p>Shared food</p><img src="x" onerror="alert(1)"><a href="javascript:alert(2)" onclick="alert(4)">bad link</a><script>alert(3)</script><svg onload="alert(5)"></svg><a href="https://example.com">Safe link</a>';

test("server rendering never emits unsanitized rich text", () => {
  const html = renderToString(<RichTextViewer content={hostile} />);
  expect(html).not.toContain("onerror");
  expect(html).not.toContain("javascript:");
  expect(html).not.toContain("<script");
});

test("browser rendering preserves text and removes active content", () => {
  const view = render(<RichTextViewer content={hostile} />);
  expect(view.container.textContent).toContain("Shared food");
  expect(view.container.innerHTML).not.toContain("onerror");
  expect(view.container.innerHTML).not.toContain("onclick");
  expect(view.container.innerHTML).not.toContain("onload");
  expect(view.container.innerHTML).not.toContain("javascript:");
  expect(view.container.querySelector("script")).toBeNull();
  expect(view.container.querySelector("svg")).toBeNull();
  const link = view.container.querySelector('a[href="https://example.com"]');
  expect(link?.getAttribute("target")).toBe("_blank");
  expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
  view.unmount();
});
