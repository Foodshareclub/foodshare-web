-- Add get_post_rating: the rating aggregate behind the Product aggregateRating.
--
-- `src/lib/jsonld.ts` reads `five_star` / `four_star` off the product to build
-- schema.org `aggregateRating`. Those are not columns of `public.posts` and
-- never were — they are not in `posts_with_location` either — so both were
-- `undefined` on every listing, `calculateAggregateRating` returned null, and
-- the Product JSON-LD shipped without a rating. Google was never offered a
-- star rating or a review snippet for a single listing.
--
-- The app previously embedded `reviews(*)` on the product fetch instead. That
-- returned every review row for the post — including the free-text `notes` and
-- `feedback` columns — to compute two numbers nobody read, on the most
-- trafficked route in the app. This aggregates in the database instead.
--
-- The old helper also averaged only the 4- and 5-star counts, which inflates:
-- nine 1-star reviews and two 5-star ones scored 4.6. `aggregateRating` has
-- to describe every review, and Google treats a rating that quietly excludes
-- the bad ones as a manual-action risk. So this returns the true mean over
-- every *rated* review (1..5) plus that population's size.
--
-- SECURITY INVOKER, not DEFINER: `reviews` already carries
-- `FOR SELECT USING (true)`, so the aggregate is exactly as public as the rows
-- it summarises and no privilege is widened. `search_path` is pinned and every
-- table is schema-qualified, so a hostile search_path cannot redirect it.

BEGIN;

-- The aggregate filters on `reviewed_rating > 0`, and `idx_reviews_post_id`
-- covers the lookup. A partial index keeps the index small (most rows for a
-- given post are 4s and 5s anyway, but the predicate is what the aggregate
-- actually asks for) and lets Postgres skip index entries for unrated rows.
CREATE INDEX IF NOT EXISTS idx_reviews_post_id_rated
    ON public.reviews USING btree (post_id)
    WHERE reviewed_rating > 0;

-- Returns one row even for a listing with no reviews: callers get zeros and a
-- null mean rather than an empty result set, so "unrated" is a value, not a
-- branch. A set-returning function that can return zero rows is a footgun
-- through PostgREST — `data.length === 0` is indistinguishable from a failed
-- RPC at the call site.
CREATE OR REPLACE FUNCTION public.get_post_rating(p_post_id bigint)
    RETURNS TABLE (
        avg_rating   numeric,
        total_reviews bigint,
        five_star    bigint,
        four_star    bigint
    )
    LANGUAGE sql
    STABLE
    SECURITY INVOKER
    SET search_path TO ''
AS $$
    SELECT
        round(avg(r.reviewed_rating)::numeric, 1) AS avg_rating,
        count(*)                                 AS total_reviews,
        count(*) FILTER (WHERE r.reviewed_rating = 5) AS five_star,
        count(*) FILTER (WHERE r.reviewed_rating = 4) AS four_star
      FROM public.reviews r
     WHERE r.post_id = p_post_id
       -- 0 is the column default, i.e. "a review with no score". Averaging
       -- those in would report 0.0 for a listing that was rated 5 stars, and
       -- reviewCount would claim coverage the mean does not have.
       AND r.reviewed_rating BETWEEN 1 AND 5;
$$;

COMMENT ON FUNCTION public.get_post_rating(bigint) IS
  'Mean and population size of every rated (1..5) review for a listing. Backs '
  'schema.org aggregateRating on the product detail page. INVOKER: reviews is '
  'publicly readable, so this widens no privilege.';

-- Same grant the blanket 20260812200000 gave everything, stated explicitly so
-- a future revoke-everything sweep does not silently break the product page.
GRANT EXECUTE ON FUNCTION public.get_post_rating(bigint) TO anon, authenticated, service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────
-- Verify the outcome
-- ----------------------------------------------------------------------
--
-- The property that matters: the aggregate covers *every* rated review, so a
-- listing with low ratings reports a low mean. Asserting the mean rather than
-- the output shape is what makes this worth having — the first version of this
-- check only compared five_star/four_star totals, which a 4/5-star-only average
-- also satisfies.
DO $$
DECLARE
    v_mean  numeric;
    v_total bigint;
BEGIN
    -- Seed two rows against a listing that cannot exist in production.
    INSERT INTO public.reviews (id, profile_id, reviewed_rating, post_id, feedback, notes)
    VALUES (-900001, gen_random_uuid(), 5, -900001, '-', '-'),
           (-900002, gen_random_uuid(), 1, -900001, '-', '-');

    SELECT avg_rating, total_reviews INTO v_mean, v_total
      FROM public.get_post_rating(-900001);

    IF v_total <> 2 THEN
        RAISE EXCEPTION 'get_post_rating: expected 2 rated reviews, got %', v_total;
    END IF;

    -- A 4/5-only average would report 5.0 here and hide the 1-star review.
    IF v_mean <> 3.0 THEN
        RAISE EXCEPTION
            'get_post_rating: expected mean 3.0 (a 5 and a 1), got % — the aggregate '
            'is excluding low ratings', v_mean;
    END IF;

    DELETE FROM public.reviews WHERE id IN (-900001, -900002);
END
$$;
