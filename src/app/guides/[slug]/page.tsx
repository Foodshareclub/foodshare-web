import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/navigation/PageHeader";
import { generatePageMetadata } from "@/lib/metadata";
import { generateArticleJsonLd, safeJsonLdStringify } from "@/lib/jsonld";
import { getGuide, getAllGuideSlugs, guides } from "@/lib/guides";

interface Params {
  slug: string;
}

export async function generateStaticParams() {
  return getAllGuideSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const g = getGuide(slug);
  if (!g) return {};
  return generatePageMetadata({
    title: g.title,
    description: g.description,
    keywords: g.keywords,
    path: `/guides/${slug}`,
  });
}

function GuideContent({ slug }: { slug: string }) {
  switch (slug) {
    case "food-safety":
      return (
        <>
          <p className="text-muted-foreground mb-6">
            Last updated: September 2026 — migrated from legacy docs, modernized for current
            FoodShare.
          </p>
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              Domestic kitchen — “is it good enough for you?”
            </h2>
            <ul className="list-disc list-inside ml-4 space-y-2 text-foreground/80">
              <li>
                Only share food you would eat yourself. If you believe it’s unsafe, don’t share it.
              </li>
              <li>
                If requesting: ask about ingredients, when opened and how stored, allergens present.
              </li>
              <li>Don’t collect or eat if you’re worried it’s unsafe.</li>
              <li>
                See{" "}
                <Link href="/terms" className="text-[#FF2D55] hover:underline">
                  Terms
                </Link>{" "}
                § Food Safety.
              </li>
            </ul>
          </section>
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Business donations & Food Waste Heroes</h2>
            <ul className="list-disc list-inside ml-4 space-y-2 text-foreground/80">
              <li>
                Volunteers are trained in a Food Safety Management System (FSMS, HACCP-based, Food
                Standards Agency input).
              </li>
              <li>
                Packaged food should be fully labelled; unlabelled bakery within 24h of collection.
              </li>
              <li>
                Ambient “best before” can be shared beyond date on quality; chilled “best before”
                within 24h.
              </li>
              <li>Report concerns via the flag on a listing or in chat.</li>
            </ul>
          </section>
          <section className="mb-8 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900">
            <p className="text-sm text-amber-900 dark:text-amber-100">
              <strong>Use By vs Best Before:</strong> see{" "}
              <Link href="/guides/expiry-dates" className="underline">
                Expiry Dates Explained
              </Link>{" "}
              — Use By = safety (do not share past), Best Before = quality (can share).
            </p>
          </section>
        </>
      );
    case "safe-sharing":
      return (
        <>
          <p className="text-muted-foreground mb-6">Community trust — practical steps.</p>
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Choose who you share with</h2>
            <p className="text-foreground/80 mb-3">
              Check the requester’s profile (tap photo), message tone, pickup time, and rating (3+
              ratings). Politely decline others so they’re not left waiting.
            </p>
            <h2 className="text-xl font-semibold mb-4">Check the item</h2>
            <p className="text-foreground/80 mb-3">
              Look at photo + description. Everything on FoodShare is free. Beware stock photos or
              too-good-to-be-true non-food listings.
            </p>
            <h2 className="text-xl font-semibold mb-4">Check rating & profile</h2>
            <p className="text-foreground/80 mb-3">
              Rating appears after 3+ shares. Read “About” for likes/dislikes. Phone verification is
              required at signup.
            </p>
            <h2 className="text-xl font-semibold mb-4">Assess communication</h2>
            <p className="text-foreground/80 mb-3">
              Friendly, polite, and responsive = good sign. One of our guidelines is “Courtesy
              rules”.
            </p>
            <h2 className="text-xl font-semibold mb-4">Meet in a safe place</h2>
            <p className="text-foreground/80 mb-3">
              Doorstep is common, but you can set a public pickup. For doorstep leaves, use a safe
              space outside. Verify area/time you’re comfortable with.
            </p>
          </section>
          <section className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Payments: FoodShare is free. For Borrow deposits, see{" "}
              <Link href="/guides/borrow" className="text-[#FF2D55] hover:underline">
                Borrow
              </Link>{" "}
              — private cash-deposit agreement at your own risk.
            </p>
          </section>
        </>
      );
    case "sharing-guidelines":
      return (
        <>
          <p className="text-muted-foreground mb-6">
            Five guidelines that keep FoodShare kind and useful.
          </p>
          <div className="space-y-6">
            <div className="p-4 bg-card border rounded-xl">
              <h3 className="font-medium mb-1">😆 Good enough for you</h3>
              <p className="text-foreground/80 text-sm">
                Only add food you’d eat yourself, or non-food items of real value to someone else.
              </p>
            </div>
            <div className="p-4 bg-card border rounded-xl">
              <h3 className="font-medium mb-1">👋 Don’t be shy</h3>
              <p className="text-foreground/80 text-sm">
                Give, take, or both — it takes two to tango. Every share prevents waste.
              </p>
            </div>
            <div className="p-4 bg-card border rounded-xl">
              <h3 className="font-medium mb-1">😇 Courtesy rules</h3>
              <p className="text-foreground/80 text-sm">
                Describe accurately, reply promptly, show up on time. Let people know if you choose
                someone else.
              </p>
            </div>
            <div className="p-4 bg-card border rounded-xl">
              <h3 className="font-medium mb-1">🤔 Best judgment</h3>
              <p className="text-foreground/80 text-sm">
                Use it in every interaction — safety and kindness first.
              </p>
            </div>
            <div className="p-4 bg-card border rounded-xl">
              <h3 className="font-medium mb-1">🤩 Have fun</h3>
              <p className="text-foreground/80 text-sm">
                Food sharing is ancient and joyful — experiment, meet neighbours, build community.
              </p>
            </div>
          </div>
        </>
      );
    case "what-can-i-share":
      return (
        <>
          <p className="text-muted-foreground mb-6">
            Anything edible you’d eat yourself — plus household essentials.
          </p>
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Food you can share</h2>
            <ul className="list-disc list-inside ml-4 space-y-2 text-foreground/80">
              <li>Loose, raw, cooked, opened or unopened — if you’d eat it, it’s okay.</li>
              <li>
                Past “Best Before” is allowed (quality date, see{" "}
                <Link href="/guides/expiry-dates" className="text-[#FF2D55] hover:underline">
                  expiry guide
                </Link>
                ).
              </li>
              <li>Alcohol: ensure recipient is legal drinking age in your country.</li>
              <li>
                Baby formula: only share surplus with informed parents who already use it (not
                advertised).
              </li>
            </ul>
          </section>
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Non-food you can share</h2>
            <ul className="list-disc list-inside ml-4 space-y-2 text-foreground/80">
              <li>Kitchen knives: legal knives only, list “18+”, verify age (FoodShare is 18+).</li>
              <li>
                OTC meds/vitamins within use-by, max store-quantity per person; no prescription meds
                (see below).
              </li>
              <li>Pet food as non-food; used cosmetics within use-by.</li>
            </ul>
          </section>
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">What you cannot share</h2>
            <ul className="list-disc list-inside ml-4 space-y-2 text-foreground/80">
              <li>Food past its “Use By” (safety date — illegal to share).</li>
              <li>
                Prescription/pharmacy-only meds, fake/counterfeit goods, coupons/vouchers,
                animals/live pets, controlled substances, weapons/fireworks/solvents, digital
                content, prescription glasses.
              </li>
              <li>Violent/sexually explicit content (condoms/sex toys/art okay).</li>
            </ul>
          </section>
        </>
      );
    case "expiry-dates":
      return (
        <>
          <p className="text-muted-foreground mb-6">
            10% of Europe’s 88M tonnes waste is date-label confusion. Know the difference.
          </p>
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">1️⃣ Use By — safety</h2>
            <p className="text-foreground/80 mb-3">
              Fresh/chilled/perishable. Illegal to sell or hand over past Use By on FoodShare. Use
              “List For” to auto-expire at midnight of Use By. Report past-Use-By listings via flag.
            </p>
            <p className="text-sm font-medium text-red-600">Sharing past Use By: ❌ Not allowed</p>
          </section>
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">2️⃣ Best Before — quality</h2>
            <p className="text-foreground/80 mb-3">
              Frozen/dried/canned. Safe beyond date (quality only). Government considered scrapping
              it — it misleads.
            </p>
            <p className="text-sm font-medium text-green-600">
              Sharing past Best Before: ✅ Allowed
            </p>
          </section>
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              3️⃣ Display Until / Sell By — stock control
            </h2>
            <p className="text-foreground/80">
              For shop staff only, not legally required — ignore for sharing decisions.
            </p>
          </section>
          <section className="mb-8 p-4 bg-muted/50 rounded-lg">
            <h3 className="font-medium mb-2">Hero rules (volunteers)</h3>
            <ul className="list-disc list-inside text-sm text-foreground/80 space-y-1">
              <li>Never hand over past Use By; always List For → midnight.</li>
              <li>
                Ambient best-before beyond date = judgement; chilled best-before & unlabelled bakery
                within 24h.
              </li>
              <li>Photo required for safety visibility.</li>
            </ul>
          </section>
          <section className="text-sm text-muted-foreground">
            Sources:{" "}
            <a
              href="https://www.nhs.uk/live-well/eat-well/food-labelling-terms/"
              className="underline"
              target="_blank"
              rel="noopener"
            >
              NHS labelling
            </a>{" "}
            ·{" "}
            <a
              href="https://wrap.org.uk/sites/default/files/2020-07/WRAP-surplus-food-redistribution-labelling-guide-May-2020.pdf"
              className="underline"
              target="_blank"
              rel="noopener"
            >
              WRAP guide
            </a>
          </section>
        </>
      );
    case "borrow":
      return (
        <>
          <p className="text-muted-foreground mb-6">
            Lend and borrow household things instead of buying — at your own risk.
          </p>
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">General</h2>
            <ul className="list-disc list-inside ml-4 space-y-2 text-foreground/80">
              <li>
                No FoodShare insurance — lend low-value, non-sentimental items; you may request a
                cash deposit and restrict to 4★+ / 5+ shares / 2km.
              </li>
              <li>
                Tap “+” → Borrow to list; agree loan period, return date, and deposit in chat before
                handover.
              </li>
              <li>Remove online accounts from devices before lending.</li>
            </ul>
          </section>
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Lender</h2>
            <ul className="list-disc list-inside ml-4 space-y-2 text-foreground/80">
              <li>
                Set restrictions when listing; only lend to people you’re comfortable with
                (rating/profile).
              </li>
              <li>
                Agree return via chat; if no return, contact us → if deleted/unresponsive, report
                theft to police (we assist).
              </li>
              <li>
                Returned damaged? Request borrower fix/replace at their cost. Check items are safe.
              </li>
            </ul>
          </section>
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Borrower</h2>
            <ul className="list-disc list-inside ml-4 space-y-2 text-foreground/80">
              <li>
                Borrow via Borrow tab; if “don’t meet requirements”, lender restricted to 4★/5
                shares/2km.
              </li>
              <li>
                Deposits are private cash agreements — FoodShare not liable. Confirm amount in chat.
                Disputes → “need more help”.
              </li>
              <li>
                Photo on receipt, check safety, read manual (
                <a
                  href="https://www.makeuseof.com/find-instruction-manuals-free-online/"
                  className="underline"
                  target="_blank"
                  rel="noopener"
                >
                  manuals
                </a>
                ). All use at borrower risk.
              </li>
            </ul>
          </section>
        </>
      );
    case "cookie-policy":
      return (
        <>
          <p className="text-muted-foreground mb-6">FOODSHARE CLUB LIMITED UK 14023669.</p>
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">What are cookies?</h2>
            <p className="text-foreground/80 mb-3">
              Small text files your browser stores to make the site work, remember preferences
              (language/region), count visitors, and — with consent — show relevant ads. We share
              limited targeting data with advertisers/analytics.
            </p>
            <ul className="list-disc list-inside ml-4 space-y-2 text-foreground/80">
              <li>
                <strong>Strictly necessary</strong> — login, secure area.
              </li>
              <li>
                <strong>Functionality</strong> — remember you, personalise.
              </li>
              <li>
                <strong>Analysis</strong> — pages visited, errors, improvements.
              </li>
              <li>
                <strong>Marketing/targeting</strong> — relevant ads, frequency capping.
              </li>
            </ul>
          </section>
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Manage or opt out</h2>
            <p className="text-foreground/80 mb-3">
              Delete/refuse via browser settings (Options/Tools/Preferences). Some features may
              break.
            </p>
            <ul className="list-disc list-inside ml-4 space-y-2 text-foreground/80">
              <li>
                <a
                  href="https://support.google.com/chrome/answer/95647?hl=en"
                  className="underline"
                  target="_blank"
                  rel="noopener"
                >
                  Chrome
                </a>{" "}
                ·{" "}
                <a
                  href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac"
                  className="underline"
                  target="_blank"
                  rel="noopener"
                >
                  Safari
                </a>{" "}
                ·{" "}
                <a
                  href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer"
                  className="underline"
                  target="_blank"
                  rel="noopener"
                >
                  Firefox
                </a>{" "}
                ·{" "}
                <a
                  href="https://help.opera.com/en/latest/web-preferences/#cookies"
                  className="underline"
                  target="_blank"
                  rel="noopener"
                >
                  Opera
                </a>{" "}
                ·{" "}
                <a
                  href="https://support.microsoft.com/en-US/gp/cookies"
                  className="underline"
                  target="_blank"
                  rel="noopener"
                >
                  IE
                </a>
              </li>
            </ul>
            <p className="text-foreground/80 mt-3">
              Questions? Use{" "}
              <Link href="/feedback" className="text-[#FF2D55] hover:underline">
                feedback form
              </Link>{" "}
              — see also{" "}
              <Link href="/privacy" className="text-[#FF2D55] hover:underline">
                Privacy
              </Link>{" "}
              &{" "}
              <Link href="/terms" className="text-[#FF2D55] hover:underline">
                Terms
              </Link>
              . © 2021 FOODSHARE CLUB LIMITED.
            </p>
          </section>
        </>
      );
    default:
      return null;
  }
}

export default async function GuidePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const jsonLd = generateArticleJsonLd({
    title: guide.title,
    description: guide.description,
    datePublished: "2026-09-03",
    dateModified: guide.updatedAt,
    authorName: "FoodShare",
    url: `https://foodshare.club/guides/${slug}`,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(jsonLd) }}
      />
      <div className="min-h-screen bg-muted/30 dark:bg-background">
        <PageHeader title={guide.title} />
        <div className="container mx-auto max-w-4xl py-8 px-4">
          <div className="bg-card rounded-2xl shadow-sm p-8 md:p-12">
            <div className="prose prose-gray dark:prose-invert max-w-none">
              <p className="text-sm text-muted-foreground mb-2">
                <Link href="/guides" className="hover:underline">
                  Guides
                </Link>{" "}
                › {guide.category}
              </p>
              <h1 className="text-2xl font-bold mb-2">{guide.title}</h1>
              <p className="text-muted-foreground mb-8">{guide.description}</p>
              <GuideContent slug={slug} />
              <div className="mt-10 pt-6 border-t flex justify-between text-sm">
                <Link href="/guides" className="text-[#FF2D55] hover:underline">
                  ← All guides
                </Link>
                <Link href="/help" className="text-[#FF2D55] hover:underline">
                  Help Center →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
