-- The original queue migration was already applied before its predicate was
-- widened. Upgrade existing databases rather than editing migration history.
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

-- A later edit can remove the final photograph, too. Do not re-enqueue normal
-- image uploads or unrelated edits, and preserve the active-queue uniqueness.
drop trigger if exists trg_posts_missing_cover_update on public.posts;
create trigger trg_posts_missing_cover_update
  after update of images on public.posts
  for each row
  when (new.images is null or cardinality(new.images) = 0)
  execute function public.tg_listing_enrich_enqueue();

insert into public.listing_enrich_queue (post_id)
select id from public.posts
where images is null or cardinality(images) = 0
on conflict (post_id) where status in ('pending', 'processing') do nothing;
