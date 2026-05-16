import { CloudinaryImage } from '@/components/CloudinaryImage'
import {
  createEventImage,
  toggleImageVisibily,
  updateImageOrder,
} from '@/services/cloudinaryService'
import { Eye, EyeOff } from 'lucide-react'
import type { EventImage } from '@/types'

const GalleryEditor = ({ images, eventId, eventSlug, isOldEvent, onUpdate }) => {
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    try {
      for (const file of files) {
        const publicId = await uploadToCloudinary(file, eventSlug)
        await createEventImage({
          event_id: eventId,
          event_slug: eventSlug,
          image_id: publicId,
          is_visible: true,
          display_order: images.length, // Add to end of gallery
        })
      }
      onUpdate() // Refresh gallery after upload
    } catch (err) {
      console.error('Upload error:', err)
      alert('Något gick fel vid uppladdningen')
    }
  }

  const handleToggle = async (img: EventImage) => {
    try {
      await toggleImageVisibily(img.id, !img.is_visible)
      onUpdate()
    } catch (err) {
      console.error('Toggle visibility error:', err)
      alert('Något gick fel vid ändring av synlighet')
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      <label className="promo-upload-square cursor-pointer">
        <input type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} />
        <span>Dra hit eller klicka för att ladda upp</span>
      </label>

      {/* Image grid with controls */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {images.map((img: EventImage) => (
          <div key={img.id} className="relative group aspect-square">
            <CloudinaryImage
              publicId={img.image_id}
              width={400}
              height={400}
              className="w-full h-full object-cover rounded-lg"
            />

            {/* Visibility toggle */}
            <button
              onClick={() => handleToggle(img)}
              className={`absolute top-2 right-2 p-1 rounded-full transition-all ${
                img.is_visible ? 'bg-accent text-black' : 'bg-black/60 text-white/40'
              }`}
            >
              {img.is_visible ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>

            {/* Drag handle for reordering — can add later */}
          </div>
        ))}
      </div>
    </div>
  )
}

export default GalleryEditor
