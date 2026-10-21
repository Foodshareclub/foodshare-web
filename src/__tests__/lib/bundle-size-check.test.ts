import { describe, expect, test } from "bun:test";
import { globalCssFiles } from "../../../scripts/check-bundle-size";

const page = (cssFiles: string[]) =>
  `<!DOCTYPE html><html><head>${cssFiles.map((f) => `<link href="/_next/static/chunks/${f}" rel="stylesheet">`).join("")}</head><body></body></html>`;

describe("globalCssFiles", () => {
  test("returns CSS linked in every page", () => {
    const pages = [page(["a.css", "b.css"]), page(["a.css", "b.css"]), page(["a.css", "b.css"])];

    expect(globalCssFiles(pages).sort()).toEqual(["a.css", "b.css"]);
  });

  test("excludes CSS linked by only some pages", () => {
    const pages = [
      page(["global.css", "route-specific.css"]),
      page(["global.css", "route-specific.css"]),
      page(["global.css"]),
    ];

    expect(globalCssFiles(pages)).toEqual(["global.css"]);
  });

  test("returns empty when no pages exist", () => {
    expect(globalCssFiles([])).toEqual([]);
  });

  test("returns empty when pages share no CSS", () => {
    const pages = [page(["a.css"]), page(["b.css"])];

    expect(globalCssFiles(pages)).toEqual([]);
  });

  test("handles a single page — all its CSS is global", () => {
    const pages = [page(["only.css"])];

    expect(globalCssFiles(pages)).toEqual(["only.css"]);
  });

  test("the old union behaviour would have overcounted", () => {
    // This is the regression the fix addresses: summing every chunk counts
    // route-specific CSS that most pages never load.
    const pages = [
      page(["global.css", "admin.css"]),
      page(["global.css", "admin.css"]),
      page(["global.css"]),
      page(["global.css"]),
    ];

    const global = globalCssFiles(pages);

    expect(global).toEqual(["global.css"]);
    expect(global).not.toContain("admin.css");
  });

  test("handles nested chunk paths", () => {
    const html =
      '<link href="/_next/static/chunks/nested/global.css" rel="stylesheet">' +
      '<link href="/_next/static/chunks/other.css" rel="stylesheet">';

    expect(globalCssFiles([html, html])).toEqual(["global.css", "other.css"]);
  });
});
