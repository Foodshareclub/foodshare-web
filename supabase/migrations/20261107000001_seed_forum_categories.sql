-- Seed forum categories.
--
-- Production `forum_categories` is empty while 227 published posts reference
-- category_id 1 (19), 7 (3) and 8 (205), so every post renders without a
-- category badge and the category filter is dead on web and mobile.
--
-- Names are chosen for the food-share community forum. Explicit ids are used
-- so the seed matches the rows already present in `forum`; ON CONFLICT DO
-- NOTHING keeps the seed idempotent and never clobbers a later restored row.
INSERT INTO public.forum_categories (id, name, slug, description, icon_name, color, sort_order, is_active)
VALUES
  (1, 'General', 'general',
   'General discussions about food sharing in your community',
   'message-circle', '#4CAF50', 1, TRUE),
  (7, 'Help & Tips', 'help-and-tips',
   'Questions, help requests and practical tips',
   'circle-help', '#2196F3', 7, TRUE),
  (8, 'Success Stories', 'success-stories',
   'Food rescues, community wins and inspiration',
   'trophy', '#FF9800', 8, TRUE)
ON CONFLICT (id) DO NOTHING;
