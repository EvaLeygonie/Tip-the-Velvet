import { supabase } from "@/lib/supabase";
import { getCloudinaryImagesByTag } from "./cloudinaryService";
import type {
  OldEvent,
  CreateOldEventImageInput,
} from "@/types";

//=== READ ===///

export const getOldEvents = async (): Promise<OldEvent[]> => {
  const { data, error } = await supabase
    .from('old_events')
    .select('*')
    .order('date', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const getOldImageGalleryBySlug = async (slug: string) => {
  const { data, error } = await supabase
    .from('old_event_images')
    .select('*')
    .eq('event_slug', slug);

  if (error) throw error;
  return data || [];
};

export const getOldEventWithImages = async (slug: string) => {
  const { data, error } = await supabase
    .from('old_events')
    .select(`
      *,
      old_event_images (*)
    `)
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return data;
}

//=== CREATE ===///

export const createOldEventImage = async (eventData: CreateOldEventImageInput): Promise<OldEvent> => {
  const { data, error } = await supabase.from('old_event_images').insert([eventData]).single();
  if (error) throw error;
  return data;
};

//=== UPDATE ===///

//=== DELETE ===///

export const deleteOldEventImage = async (imageId: string) => {
  const { error } = await supabase
    .from('old_event_images')
    .delete()
    .eq('id', imageId);

  if (error) throw error;
};

//=== SYNC ===///

// CLoudinary => Supabase
export const syncImagesToEvent = async (eventId: string, slug: string) => {
  const imageIds = await getCloudinaryImagesByTag(slug);
  const rowsToInsert = imageIds.map((imageId: string) => ({
    old_event_id: eventId,
    event_slug: slug,
    image_id: imageId,
  }));

  const { data, error } = await supabase
    .from('old_event_images')
    .insert(rowsToInsert)
    .select('*');

  if (error) throw error;
  return data.length; // Antal bilder som synkats
};
