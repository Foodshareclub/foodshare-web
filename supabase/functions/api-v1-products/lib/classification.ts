/** Shared policy for publishing and read-only catalogue review. No network or database access. */
export const CLASSIFICATION_VERSION = "2026-09-19.1";
export const AUTO_CLASSIFICATION_THRESHOLD = 0.95;

export interface ClassificationInput {
  title: string;
  description?: string;
  postType: string;
  categoryMode?: "auto" | "manual";
  previousClassification?: { source?: string } | null;
}

export interface CategoryPrediction {
  postType: "food" | "thing" | "wanted" | "borrow" | "unknown";
  confidence: number;
  evidence: string;
  mixed: boolean;
}

export interface ClassificationDecision {
  version: string;
  requestedPostType: string;
  postType: string;
  suggestedPostType: string | null;
  source: "rules" | "ai" | "manual" | "user";
  status: "classified" | "needs_review" | "manual" | "preserved";
  confidence: number | null;
  reason: string;
  needsReview: boolean;
}

const normalize = (text: string) =>
  text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
const word = (terms: string) =>
  new RegExp(`(?<![\\p{L}\\p{N}])(?:${terms})(?![\\p{L}\\p{N}])`, "u");
const food = word(
  "food|apples?|bananas?|lentils?|rice|vegetables?|tomatoes|cucumbers?|lettuce|bread|milk|cheese|eggs?|pasta|jam|juice|coffee|" +
    "obst|gemuse|milch|brot|brotchen|marmelade|lebensmittel|reis|nudeln|kaffe(?:e)?kapseln|walnuss|" +
    "картофел[ья]|яблок[аи]?|овощи|морковь|хлеб|каша|" +
    "pommes|legumes|lait|arroz|verduras|leche",
);
const thing = word(
  "sofa|couch|chairs?|wardrobe|books?|toys?|clothes|shoes|mattress|box spring|bicycle|laptop|" +
    "stuhl|stuhle|kleidung|spielzeug|bucher|schrank|fahrrad|schuhe|matratze|" +
    "chaise|vetements|jouets|ropa|juguetes|silla",
);
// Match the author's intent at the start, not 'free for anyone who needs food'.
const request =
  /^(?:i (?:am looking for|need)|i'm looking for|looking for|need|wanted|ich suche|suche|gesucht|je cherche|busco|нужн[аоы]|ищу)\s+\S/iu;

function base(input: ClassificationInput): ClassificationDecision {
  return {
    version: CLASSIFICATION_VERSION,
    requestedPostType: input.postType,
    postType: input.postType,
    suggestedPostType: null,
    source: "user",
    status: "needs_review",
    confidence: null,
    reason: "insufficient_evidence",
    needsReview: true,
  };
}

export function manualClassification(postType: string): ClassificationDecision {
  return {
    ...base({ title: "", postType }),
    source: "manual",
    status: "manual",
    reason: "explicit_category_choice",
    needsReview: false,
  };
}

/** High precision rules; ambiguous or mixed content deliberately falls through to AI/review. */
export function classifyByRules(input: ClassificationInput): ClassificationDecision | null {
  if (input.categoryMode === "manual" || input.previousClassification?.source === "manual") {
    return manualClassification(input.postType);
  }
  // Venues, volunteer roles, discussions and existing request/loan intent have separate semantics.
  // A household fridge is a Thing; a community fridge is a venue. Never infer venue status here.
  if (input.postType !== "food" && input.postType !== "thing") {
    return {
      ...base(input),
      status: "preserved",
      reason: "specialist_category",
      needsReview: false,
    };
  }
  const title = normalize(input.title).replace(/^\(no title\)$/, "");
  const description = normalize(input.description ?? "");
  const text = `${title} ${description}`;
  // These words change the meaning of food nouns (rice cooker, apple seeds, empty jam jars).
  // Lending, negation and mixed offers require context rather than keyword precedence.
  if (
    word(
      "machine|cooker|containers?|holders?|cartons?|jars?|bottles?|empty|seeds?|plants?|trees?|borrow|lend|loan|no|not|" +
        "iphone|macbook|soap|candles?|scent|perfume|session|wish|seeking|requesting|" +
        "maschine|kocher|leere?|samen|pflanzen|leihen|verleihen|kein[en]?|nicht|" +
        "vide|graines|emprunter|prestar|semillas|vacio",
    ).test(text)
  ) return null;
  const hasFood = food.test(text);
  const hasThing = thing.test(text);
  if (hasFood && hasThing) return null;
  let postType: string | undefined;
  let reason = "";
  if ((request.test(title) || request.test(description)) && (hasFood || hasThing)) {
    postType = "wanted";
    reason = "explicit_request";
  } else if (hasFood && !request.test(title) && !request.test(description)) {
    postType = "food";
    reason = "edible_item";
  } else if (hasThing && !request.test(title) && !request.test(description)) {
    postType = "thing";
    reason = "household_item";
  }
  if (postType) {
    return {
      ...base(input),
      postType,
      source: "rules",
      status: "classified",
      confidence: null,
      reason,
      needsReview: false,
    };
  }
  // Names and placeholders without a description do not establish what is being shared.
  if (!description && title.split(" ").length <= 2) return base(input);
  return null;
}

/** AI is advisory unless its answer is valid, supported by the input, and sufficiently confident. */
export function applyPrediction(
  input: ClassificationInput,
  prediction: CategoryPrediction | null,
): ClassificationDecision {
  const preserved = classifyByRules(input);
  if (preserved?.source === "manual" || preserved?.status === "preserved") return preserved;
  const result = base(input);
  if (!prediction) return { ...result, reason: "ai_unavailable" };
  const validTypes = ["food", "thing", "wanted", "borrow", "unknown"];
  const evidence = typeof prediction.evidence === "string" ? normalize(prediction.evidence) : "";
  if (
    !validTypes.includes(prediction.postType) || !Number.isFinite(prediction.confidence) ||
    prediction.confidence < 0 || prediction.confidence > 1 ||
    typeof prediction.mixed !== "boolean" ||
    evidence.length < 3 ||
    !normalize(`${input.title} ${input.description ?? ""}`).includes(evidence)
  ) {
    return { ...result, reason: "invalid_ai_evidence" };
  }
  const canApply = prediction.postType !== "unknown" && !prediction.mixed &&
    prediction.confidence >= AUTO_CLASSIFICATION_THRESHOLD;
  return {
    ...result,
    source: "ai",
    confidence: prediction.confidence,
    postType: canApply ? prediction.postType : input.postType,
    suggestedPostType: !canApply && prediction.postType !== "unknown" ? prediction.postType : null,
    status: canApply ? "classified" : "needs_review",
    reason: canApply
      ? "content_classified"
      : prediction.mixed
      ? "mixed_items"
      : "uncertain_content",
    needsReview: !canApply,
  };
}

export async function classifyListing(
  input: ClassificationInput,
  predict: (
    input: Pick<ClassificationInput, "title" | "description">,
  ) => Promise<CategoryPrediction | null>,
): Promise<ClassificationDecision> {
  const decision = classifyByRules(input);
  if (decision) return decision;
  try {
    return applyPrediction(
      input,
      await predict({ title: input.title, description: input.description }),
    );
  } catch {
    return applyPrediction(input, null);
  }
}
