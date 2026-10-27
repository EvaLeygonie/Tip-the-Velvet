-- Run once in the Supabase SQL editor. Safe to run again. Afterwards regenerate
-- src/types/database.types.ts.
--
-- Lets photos on an event page be filtered (Stage / Mingle / Photobooth). The category is picked when
-- uploading (the "Image type" dropdown in the gallery editor) and can be set later per photo. Photos
-- without one only show under "All". Values match ImageCategory in src/types/media.ts; 'performance'
-- and 'stage' are both shown under Stage, 'party' under Mingle.
alter table public.event_images add column if not exists category text;
alter table public.event_images drop constraint if exists event_images_category_check;
alter table public.event_images add constraint event_images_category_check
  check (category is null or category in ('performance', 'stage', 'party', 'photobooth'));
