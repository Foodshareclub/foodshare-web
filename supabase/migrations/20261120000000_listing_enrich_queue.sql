-- Create-path hook: async background queue that upgrades new fridge/foodbank
-- listings (created with 0 real images) to real photographs via the enrichListing
-- pipeline. The create path enqueues a row; a worker (api-v1-ai /enrichListingQueue)
-- claims and processes it, non-blocking the create response.
--
-- The covers-wave title-card floor still guarantees >=1 image immediately; this
-- queue is the UPGRADE path (real photo via the pipeline). Idempotent: a listing
-- already enriched (metadata.image_provenance.status = 'placed') is skipped.
--
-- Card: t_5e01973c (create-path hook). Consistent with the email-queue lifecycle
-- (pending -> processing -> done/failed, stale-claim recovery, retry bound).

create table if not exists public.listing_enrich_queue (
  id          bigint generated always as identity primary key,
  post_id     bigint not null,
  status      text not null default 'pending'
              check (status in ('pending', 'processing', 'done', 'failed')),
  retry_count integer not null default 0,
  last_error  text,
  claimed_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- One pending/processing row per post at a time (idempotency at the queue level;
-- the pipeline-level idempotency is metadata.image_provenance.status = 'placed').
create unique index if not exists uq_listing_enrich_queue_active
  on public.listing_enrich_queue (post_id)
  where status in ('pending', 'processing');

create index if not exists idx_listing_enrich_queue_status
  on public.listing_enrich_queue (status, created_at);

-- Service role drives the queue; no public/anon access.
alter table public.listing_enrich_queue enable row level security;
-- No policies: service role bypasses RLS; authenticated/anon have no access.

-- Create-path hook: fire the enrich-queue for any new fridge/foodbank listing,
-- regardless of the creating source (admin, seed, API). The trigger enqueues a
-- row SYNCHRONOUSLY within the insert transaction (fast — one row insert); the
-- actual photo pipeline runs ASYNCHRONOUSLY in the worker, so the create
-- response is never blocked. `on conflict do nothing` keeps it idempotent with
-- the unique active index (a re-insert for an active row is a no-op).
create or replace function public.tg_listing_enrich_enqueue()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.images is null or cardinality(new.images) = 0 or new.post_type in ('fridge', 'foodbank')) then
    insert into public.listing_enrich_queue (post_id)
    values (new.id)
    on conflict (post_id) where status in ('pending', 'processing') do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_posts_listing_enrich on public.posts;
create trigger trg_posts_listing_enrich
  after insert on public.posts
  for each row
  when (new.images is null or cardinality(new.images) = 0 or new.post_type in ('fridge', 'foodbank'))
  execute function public.tg_listing_enrich_enqueue();
