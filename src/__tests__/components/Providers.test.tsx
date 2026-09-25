import { describe, expect, mock, test } from "bun:test";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const passthrough = ({ children }: { children: ReactNode }) => children;
mock.module("next-intl", () => ({ NextIntlClientProvider: passthrough }));
mock.module("@/lib/gpu", () => ({ GPUProvider: passthrough }));
mock.module("@/hooks/useActionToast", () => ({ ActionToastProvider: passthrough }));

const { Providers, useChangeLocale } = await import("@/app/providers");

function Content() {
  const { locale } = useChangeLocale();
  return <main lang={locale}>Community listings</main>;
}

describe("server-rendered providers", () => {
  test("renders page content before browser effects or message downloads", () => {
    const html = renderToStaticMarkup(
      <Providers initialLocale="en" initialMessages={{}}>
        <Content />
      </Providers>
    );
    expect(html).toContain('<main lang="en">Community listings</main>');
    expect(html).not.toContain("animate-spin");
  });

  test("uses the server-selected locale on the initial render", () => {
    const html = renderToStaticMarkup(
      <Providers initialLocale="ar" initialMessages={{}}>
        <Content />
      </Providers>
    );
    expect(html).toContain('<main lang="ar">Community listings</main>');
  });
});
