-- Telegram file IDs and blank/relative entries are not client-loadable covers.
-- Preserve the entries so enrichment can recover the original uploaded photo.
create or replace function public.tg_listing_enrich_enqueue()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from unnest(new.images) as image
    where btrim(image) ~ '^https?://[^/[:space:]]+'
  ) or (tg_op = 'INSERT' and new.post_type in ('fridge', 'foodbank')) then
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
  for each row execute function public.tg_listing_enrich_enqueue();

drop trigger if exists trg_posts_missing_cover_update on public.posts;
create trigger trg_posts_missing_cover_update
  after update of images on public.posts
  for each row execute function public.tg_listing_enrich_enqueue();

insert into public.listing_enrich_queue (post_id)
select id from public.posts
where not exists (
  select 1 from unnest(images) as image
  where btrim(image) ~ '^https?://[^/[:space:]]+'
)
on conflict (post_id) where status in ('pending', 'processing') do nothing;
