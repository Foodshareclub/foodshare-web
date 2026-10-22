import { assert, assertEquals } from "@std/assert";
import {
  applyPrediction,
  type ClassificationInput,
  classifyByRules,
  classifyListing,
} from "../api-v1-products/lib/classification.ts";
import { predictListingCategory } from "../api-v1-products/lib/classification-ai.ts";
import { createProductSchema, updateProductSchema } from "../api-v1-products/lib/schemas.ts";

const input = (title: string, description = "", postType = "food"): ClassificationInput => ({
  title,
  description,
  postType,
});

for (
  const [title, description, expected] of [
    ["Fresh garden apples", "Collected today", "food"],
    ["Kaffekapseln", "4x Dolce Gusto", "food"],
    ["selbstgemachte Marmelade und Most aus Biogarten", "60 Gläser Marmelade", "food"],
    ["Овощи", "Картофель и хлеб", "food"],
    ["FREE Used Queen Box Spring", "Wooden frame", "thing"],
    ["Books", "Three novels", "thing"],
    ["Lebensmittel", "Ich suche lebensmittel", "wanted"],
    ["(No Title)", "need food", "wanted"],
    ["Fresh Organic Vegetables", "Free for anyone who needs them!", "food"],
  ]
) {
  Deno.test(`category rules: ${title}`, () => {
    assertEquals(classifyByRules(input(title, description))?.postType, expected);
  });
}

for (
  const title of [
    "Rice cooker",
    "Coffee machine",
    "Empty jam jars",
    "Apple seeds",
    "Book about bread",
    "Can I borrow a chair?",
  ]
) {
  Deno.test(`category rules defer ambiguous object: ${title}`, () => {
    assertEquals(classifyByRules(input(title)), null);
  });
}

Deno.test("names and placeholders do not turn into Things or spend AI tokens", async () => {
  for (const title of ["Steffi", "Huli", "___sebo___", "Rosa45", "(No Title)"]) {
    const decision = await classifyListing(input(title), () => {
      throw Error("AI must not run");
    });
    assertEquals(decision.postType, "food");
    assertEquals(decision.reason, "insufficient_evidence");
    assertEquals(decision.needsReview, true);
  }
});

Deno.test("manual decisions and specialist categories survive automation", async () => {
  for (
    const postType of [
      "wanted",
      "borrow",
      "fridge",
      "foodbank",
      "volunteer",
      "vegan",
      "organisation",
      "forum",
    ]
  ) {
    const decision = await classifyListing(input("Fresh apples", "", postType), () => {
      throw Error("AI must not run");
    });
    assertEquals(decision.postType, postType);
    assertEquals(decision.needsReview, false);
  }
  for (
    const manual of [{ categoryMode: "manual" as const }, {
      previousClassification: { source: "manual" },
    }]
  ) {
    const listing = { ...input("Marmelade und Most", "", "thing"), ...manual };
    const decision = await classifyListing(listing, () => {
      throw Error("AI must not run");
    });
    assertEquals(decision.source, "manual");
    assertEquals(decision.postType, "thing");
    assertEquals(
      applyPrediction(listing, {
        postType: "food",
        confidence: 1,
        evidence: "Marmelade",
        mixed: false,
      }).postType,
      "thing",
    );
  }
});

Deno.test("AI needs valid confidence, a supported category and evidence present in the listing", () => {
  const listing = input("Rice cooker", "Working appliance");
  const prediction = {
    postType: "thing" as const,
    confidence: 0.98,
    evidence: "Rice cooker",
    mixed: false,
  };
  assertEquals(applyPrediction(listing, prediction).postType, "thing");
  for (
    const invalid of [
      { confidence: 1.1 },
      { confidence: -1 },
      { confidence: NaN },
      { evidence: "a sofa" },
      { evidence: "" },
      { postType: "volunteer" },
      { mixed: undefined },
    ]
  ) {
    const decision = applyPrediction(listing, { ...prediction, ...invalid } as typeof prediction);
    assertEquals(decision.postType, "food");
    assertEquals(decision.needsReview, true);
  }
  for (
    const uncertain of [{ confidence: 0.94 }, { mixed: true }, { postType: "unknown" as const }]
  ) {
    const decision = applyPrediction(listing, { ...prediction, ...uncertain });
    assertEquals(decision.postType, "food");
    assertEquals(decision.needsReview, true);
  }
});

Deno.test("AI failure preserves publishing and only title/description reach the provider", async () => {
  const listing = {
    ...input("Rice cooker", "Working appliance"),
    latitude: 10,
    pickupAddress: "Private address",
    profileId: "private",
  };
  const decision = await classifyListing(listing, (payload) => {
    assertEquals(Object.keys(payload).sort(), ["description", "title"]);
    throw Error("Provider unavailable");
  });
  assertEquals(decision.postType, "food");
  assertEquals(decision.reason, "ai_unavailable");
});

Deno.test("AI transport requests strict JSON, strips contact details and validates completion", async () => {
  let called = false;
  const result = await predictListingCategory(
    input("Coffee machine", "Email a@example.com, call +49 123 456 7890"),
    {
      apiKey: "test-only",
      fetch: ((_url, init) => {
        called = true;
        const body = JSON.parse(String((init as RequestInit | undefined)?.body));
        assertEquals(body.response_format.json_schema.strict, true);
        assertEquals(body.messages.length, 2);
        assert(!body.messages[1].content.includes("a@example.com"));
        assert(!body.messages[1].content.includes("123 456"));
        return Promise.resolve(
          Response.json({
            choices: [{
              finish_reason: "stop",
              message: {
                content: JSON.stringify({
                  postType: "thing",
                  confidence: 0.99,
                  evidence: "Coffee machine",
                  mixed: false,
                }),
              },
            }],
          }),
        );
      }) as typeof fetch,
    },
  );
  assert(called);
  assertEquals(result?.postType, "thing");
  for (
    const payload of [{}, { choices: [{ finish_reason: "length", message: { content: "{}" } }] }, {
      choices: [{ finish_reason: "stop", message: { content: "not JSON" } }],
    }]
  ) {
    assertEquals(
      await predictListingCategory(input("Coffee machine"), {
        apiKey: "test-only",
        fetch: (() => Promise.resolve(Response.json(payload))) as typeof fetch,
      }),
      null,
    );
  }
});

Deno.test("AI transport times out and never retries rate limits", async () => {
  assertEquals(
    await predictListingCategory(input("Coffee machine"), {
      apiKey: "test-only",
      timeoutMs: 5,
      fetch: ((_url, init) =>
        new Promise((_resolve, reject) => {
          (init as RequestInit | undefined)?.signal?.addEventListener("abort", () =>
            reject(new Error("aborted")), {
            once: true,
          });
        })) as typeof fetch,
    }),
    null,
  );
  let attempts = 0;
  assertEquals(
    await predictListingCategory(input("Coffee machine"), {
      apiKey: "test-only",
      fetch: (() => {
        attempts++;
        return Promise.resolve(new Response("Rate limited", { status: 429 }));
      }) as typeof fetch,
    }),
    null,
  );
  assertEquals(attempts, 1);
});

Deno.test("invalid credentials use a cooldown and replacing the key recovers immediately", async () => {
  let attempts = 0;
  const unavailable = (() => {
    attempts++;
    return Promise.resolve(new Response("Unauthorized", { status: 401 }));
  }) as typeof fetch;
  for (let i = 0; i < 2; i++) {
    assertEquals(
      await predictListingCategory(input("Coffee machine"), {
        apiKey: "rejected-test-key",
        fetch: unavailable,
      }),
      null,
    );
  }
  assertEquals(attempts, 1);
  await predictListingCategory(input("Coffee machine"), {
    apiKey: "replacement-test-key",
    fetch: unavailable,
  });
  assertEquals(attempts, 2);
});

Deno.test("publishing accepts missing coordinates without inventing a location, and category corrections are typed", () => {
  const body = { title: "Fresh apples", images: [], postType: "food", categoryMode: "manual" };
  assertEquals(createProductSchema.safeParse(body).success, true);
  assertEquals(createProductSchema.safeParse({ ...body, latitude: 0 }).success, false);
  assertEquals(createProductSchema.safeParse({ ...body, latitude: 0, longitude: 0 }).success, true);
  assertEquals(
    createProductSchema.safeParse({ ...body, categoryMode: "force_admin" }).success,
    false,
  );
  assertEquals(updateProductSchema.parse({ version: 1, postType: "thing" }).postType, "thing");
  assertEquals(updateProductSchema.safeParse({ version: 1, postType: "invalid" }).success, false);
});
