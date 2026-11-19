import { assertEquals, assertRejects } from "@std/assert";
import {
  commonsCandidates,
  matchedCandidate,
  neutralCategoryCandidates,
  searchListingReference,
} from "../api-v1-products/lib/listing-cover-search.ts";
import { ServiceUnavailableError } from "../_shared/errors.ts";
function commons(
  license = "CC0",
  host = "upload.wikimedia.org",
  attribution = "false",
) {
  return {
    query: {
      pages: {
        "42": {
          pageid: 42,
          title: "File:Fresh apples.png",
          imageinfo: [{
            url: `https://${host}/apple.png`,
            mime: "image/png",
            width: 1024,
            height: 768,
            extmetadata: {
              LicenseShortName: { value: license },
              LicenseUrl: {
                value: "https://creativecommons.org/publicdomain/zero/1.0/",
              },
              AttributionRequired: { value: attribution },
              Copyrighted: { value: "True" },
              Artist: { value: "Photographer" },
              ImageDescription: { value: "<p>Fresh apples in a bowl</p>" },
            },
          }],
        },
      },
    },
  };
}
Deno.test("Commons accepts CC0 without mandatory attribution and retains source provenance", () => {
  const candidates = commonsCandidates(commons());
  assertEquals(candidates.length, 1);
  assertEquals(candidates[0].caption, "Fresh apples in a bowl");
  assertEquals(
    candidates[0].sourcePageUrl,
    "https://commons.wikimedia.org/?curid=42",
  );
});
Deno.test("unknown or attribution-requiring licenses and foreign download hosts fail closed", () => {
  for (
    const document of [
      commons("CC BY-SA 4.0"),
      commons("All rights reserved"),
      commons("CC0", "127.0.0.1"),
      commons("CC0", "example.com"),
      commons("CC0", "upload.wikimedia.org", "true"),
    ]
  ) assertEquals(commonsCandidates(document), []);
});
Deno.test("AI cannot select an unknown page, low confidence or invalid numeric score", () => {
  const candidates = commonsCandidates(commons());
  for (
    const match of [
      { pageId: 99, confidence: 1 },
      { pageId: 42, confidence: 0.79 },
      { pageId: 42, confidence: NaN },
      { pageId: 42, confidence: 2 },
      { pageId: "42", confidence: 1 },
    ]
  ) assertEquals(matchedCandidate(candidates, match), null);
  assertEquals(
    matchedCandidate(candidates, { pageId: 42, confidence: 0.95 })?.candidate
      .pageId,
    42,
  );
});
Deno.test("AI search uses title plus description, ranks only licensed candidates and never asks for generation", async () => {
  let ai = 0;
  let searches = 0;
  const send = ((input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url === "https://api.groq.com/openai/v1/chat/completions") {
      ai++;
      const body = JSON.parse(init?.body as string);
      assertEquals(
        body.messages[1].content.includes("Fresh garden apples"),
        true,
      );
      assertEquals(
        new Headers(init?.headers).get("authorization"),
        "Bearer test-only",
      );
      return Promise.resolve(
        Response.json({
          choices: [{
            finish_reason: "stop",
            message: {
              content: JSON.stringify(
                ai === 1
                  ? {
                    query: "fresh apples",
                    fallbackQuery: "apples",
                    categoryOnly: false,
                  }
                  : { pageId: 42, confidence: 0.96 },
              ),
            },
          }],
        }),
      );
    }
    searches++;
    assertEquals(new URL(url).hostname, "commons.wikimedia.org");
    assertEquals(new Headers(init?.headers).has("authorization"), false);
    assertEquals(init?.redirect, "error");
    return Promise.resolve(Response.json(commons()));
  }) as typeof fetch;
  const result = await searchListingReference({
    title: "Apples",
    description: "Fresh garden apples",
    postType: "food",
    images: [],
  }, { apiKey: "test-only", fetch: send });
  assertEquals(result.candidate.pageId, 42);
  assertEquals(result.scope, "subject");
  assertEquals(ai, 2);
  assertEquals(searches, 1);
});
Deno.test("AI outage is retryable and cannot become a fabricated cover", async () => {
  await assertRejects(
    () =>
      searchListingReference(
        { title: "Apples", postType: "food", images: [] },
        {
          apiKey: "test-only",
          fetch: (() =>
            Promise.resolve(
              new Response("Unavailable", { status: 503 }),
            )) as typeof fetch,
        },
      ),
    ServiceUnavailableError,
  );
});

Deno.test("vague food listings cannot silently become specific meals", () => {
  const base = commonsCandidates(commons())[0];
  const meal = {
    ...base,
    pageId: 1,
    title: "File:Pancakes with honey.jpg",
    caption: "Pouring honey on pancakes with walnuts",
  };
  const neutral = {
    ...base,
    pageId: 2,
    title: "File:Groceries in a basket.jpg",
    caption: "Mixed groceries for food donation",
  };
  assertEquals(
    neutralCategoryCandidates([meal, neutral], "food").map((c) => c.pageId),
    [2],
  );
  assertEquals(neutralCategoryCandidates([meal], "wanted"), []);
});

Deno.test("category fallback rejects a specific meal before AI ranking, even if search returns it", async () => {
  let ai = 0;
  let searches = 0;
  const send = ((input: string | URL | Request) => {
    if (String(input) === "https://api.groq.com/openai/v1/chat/completions") {
      ai++;
      if (ai > 1) {
        throw Error("A specific meal must not reach category ranking");
      }
      return Promise.resolve(
        Response.json({
          choices: [{
            finish_reason: "stop",
            message: {
              content: JSON.stringify({
                query: "food",
                fallbackQuery: "food basket",
                categoryOnly: true,
              }),
            },
          }],
        }),
      );
    }
    searches++;
    const document = commons();
    document.query.pages["42"].title = "File:Pancakes with honey.png";
    document.query.pages["42"].imageinfo[0].extmetadata.ImageDescription.value =
      "Pancakes with honey and walnuts";
    return Promise.resolve(Response.json(document));
  }) as typeof fetch;
  await assertRejects(
    () =>
      searchListingReference({ title: "Rosa", postType: "food", images: [] }, {
        apiKey: "test-only",
        fetch: send,
      }),
    ServiceUnavailableError,
  );
  assertEquals(ai, 1);
  assertEquals(searches, 4);
});

Deno.test("neutral food references cannot be another organisation's sign or truck", () => {
  const base = commonsCandidates(commons())[0];
  assertEquals(
    neutralCategoryCandidates([{
      ...base,
      title: "File:Township food pantry truck.png",
      caption: "Groceries for donation",
    }], "wanted"),
    [],
  );
});
Deno.test("AI provider retry guidance is bounded and preserved", async () => {
  try {
    await searchListingReference({
      title: "Apples",
      postType: "food",
      images: [],
    }, {
      apiKey: "test-only",
      fetch: (() =>
        Promise.resolve(
          new Response("limited", {
            status: 429,
            headers: { "retry-after": "90" },
          }),
        )) as typeof fetch,
    });
    throw Error("Expected provider rejection");
  } catch (error) {
    assertEquals(error instanceof ServiceUnavailableError, true);
    assertEquals((error as ServiceUnavailableError).retryAfterMs, 90_000);
    assertEquals((error as Error).message.includes("429"), true);
  }
});

Deno.test("identical neutral candidates reuse ranking across name-only listings without caching licenses", async () => {
  let ai = 0;
  let queries = 0;
  let ranks = 0;
  let licensed = true;
  const send = ((input: string | URL | Request, init?: RequestInit) => {
    if (String(input) === "https://api.groq.com/openai/v1/chat/completions") {
      ai++;
      const body = JSON.parse(init?.body as string);
      const data = JSON.parse(body.messages[1].content);
      const ranking = Array.isArray(data.candidates);
      if (ranking) ranks++;
      else queries++;
      return Promise.resolve(
        Response.json({
          choices: [{
            finish_reason: "stop",
            message: {
              content: JSON.stringify(
                ranking ? { pageId: 42, confidence: 0.96 } : {
                  query: "food basket",
                  fallbackQuery: "groceries",
                  categoryOnly: true,
                },
              ),
            },
          }],
        }),
      );
    }
    const document = commons(licensed ? "CC0" : "CC BY-SA 4.0");
    document.query.pages["42"].title = "File:Mixed vegetables for sharing.png";
    document.query.pages["42"].imageinfo[0].extmetadata.ImageDescription.value =
      "Assorted mixed vegetables for a community food basket";
    return Promise.resolve(Response.json(document));
  }) as typeof fetch;
  for (const title of ["Test Person Alpha", "Test Person Beta"]) {
    await searchListingReference({ title, postType: "wanted", images: [] }, {
      apiKey: "test-only",
      fetch: send,
    });
  }
  assertEquals(queries, 2);
  assertEquals(ranks, 1);
  assertEquals(ai, 3);
  licensed = false;
  await assertRejects(
    () =>
      searchListingReference({
        title: "Test Person Gamma",
        postType: "wanted",
        images: [],
      }, {
        apiKey: "test-only",
        fetch: send,
      }),
    ServiceUnavailableError,
  );
  assertEquals(ranks, 1);
});

Deno.test("neutral grocery references reject museum artifacts and depictions", () => {
  const base = commonsCandidates(commons())[0];
  const grocery = {
    ...base,
    pageId: 2,
    title: "File:Mixed groceries in a basket.jpg",
    caption: "A basket of real mixed groceries",
  };
  const artifacts = [
    {
      ...base,
      title: "File:Basket of food MET 183134.jpg",
      caption: "Italian, Naples; Crèche accessory; Crèche",
    },
    {
      ...base,
      title: "File:Food basket.jpg",
      caption: "Miniature replica in a museum",
    },
    {
      ...base,
      title: "File:Mixed vegetables.jpg",
      caption: "Still life painting of assorted vegetables",
    },
    {
      ...base,
      title: "File:Household supplies.jpg",
      caption: "Toy household donation supplies",
    },
  ];
  for (const category of ["food", "wanted", "household"]) {
    assertEquals(neutralCategoryCandidates(artifacts, category), []);
  }
  assertEquals(
    neutralCategoryCandidates([grocery], "food").map((item) => item.pageId),
    [2],
  );
});

Deno.test("neutral food baskets need explicit real supplies evidence", () => {
  const base = commonsCandidates(commons())[0];
  const ancient = {
    ...base,
    title: "File:Basket Containing Food Items (10112842433).jpg",
    caption:
      "Mawangdui Han Tombs, Changsha, Hunan. Complete indexed photo collection at WorldHistoryPics.com.",
  };
  const unspecified = {
    ...base,
    title: "File:Basket of food.jpg",
    caption: "",
  };
  const groceries = {
    ...base,
    pageId: 3,
    title: "File:Food basket.jpg",
    caption: "Mixed vegetables and canned food for donation",
  };
  assertEquals(neutralCategoryCandidates([ancient, unspecified], "food"), []);
  assertEquals(
    neutralCategoryCandidates([groceries], "food").map((item) => item.pageId),
    [3],
  );
});

Deno.test("neutral fresh-produce photos remain eligible without accepting unrelated supplies", () => {
  const base = commonsCandidates(commons())[0];
  const produce = {
    ...base,
    pageId: 4,
    title: "File:Fresh Vegetable Produce (Unsplash).jpg",
    caption: "Fresh farm vegetables",
  };
  const unrelated = {
    ...base,
    title: "File:Fresh paint.jpg",
    caption: "Household supplies",
  };
  assertEquals(
    neutralCategoryCandidates([produce], "food").map((item) => item.pageId),
    [4],
  );
  assertEquals(neutralCategoryCandidates([unrelated], "food"), []);
});

Deno.test("verified public-domain subjects are found after the CC0-only pass has no match", async () => {
  let ai = 0;
  let searches = 0;
  const send = ((input: string | URL | Request) => {
    if (String(input) === "https://api.groq.com/openai/v1/chat/completions") {
      ai++;
      return Promise.resolve(
        Response.json({
          choices: [{
            finish_reason: "stop",
            message: {
              content: JSON.stringify(
                ai === 1
                  ? {
                    query: "dressed herring",
                    fallbackQuery: "herring salad",
                    categoryOnly: false,
                  }
                  : { pageId: 42, confidence: 0.99 },
              ),
            },
          }],
        }),
      );
    }
    searches++;
    const url = new URL(String(input));
    if (url.searchParams.get("gsrsearch")?.includes("incategory:CC-Zero")) {
      return Promise.resolve(Response.json({ query: { pages: {} } }));
    }
    assertEquals(url.searchParams.get("gsrlimit"), "20");
    const document = commons("Public domain");
    document.query.pages["42"].title = "File:Selidi pod shuboi.jpg";
    document.query.pages["42"].imageinfo[0].extmetadata.Copyrighted.value =
      "False";
    document.query.pages["42"].imageinfo[0].extmetadata.ImageDescription.value =
      "Dressed herring";
    return Promise.resolve(Response.json(document));
  }) as typeof fetch;
  const result = await searchListingReference({
    title: "Сельдь под шубой",
    postType: "food",
    images: [],
  }, { apiKey: "test-only", fetch: send });
  assertEquals(result.candidate.license, "Public domain");
  assertEquals(searches, 3);
  assertEquals(ai, 2);
});
Deno.test("a public-domain label cannot bypass copyright or attribution checks", () => {
  assertEquals(commonsCandidates(commons("Public domain")), []);
  const valid = commons("Public domain");
  valid.query.pages["42"].imageinfo[0].extmetadata.Copyrighted.value = "False";
  assertEquals(commonsCandidates(valid).length, 1);
  valid.query.pages["42"].imageinfo[0].extmetadata.AttributionRequired.value =
    "True";
  assertEquals(commonsCandidates(valid), []);
});
