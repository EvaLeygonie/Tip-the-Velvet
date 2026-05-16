import { useState, useRef } from 'react'
import CloudinaryImage from '@/components/CloudinaryImage'
import { createEventImage, toggleImageVisibility } from '@/services/eventService'
import { uploadToCloudinary } from '@/services/cloudinaryService'
import { buildEventFolderName } from '@/lib/utils'
import { Eye, EyeOff, Upload } from 'lucide-react'
import type { Event, OldEvent, EventImage } from '@/types'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'

interface GalleryEditorProps {
  event: Event | OldEvent
  isOldEvent: boolean
  images: EventImage[]
  onUpdate: () => void
}

const GalleryEditor = ({ images, event, isOldEvent, onUpdate }: GalleryEditorProps) => {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { t } = useLanguage()

  const getEventDate = () => {
    if (isOldEvent) return 'date' in event ? event.date : null
    return 'event_start' in event ? event.event_start : null
  }

  const handleUpload = async (files: FileList) => {
    if (!files.length) return
    setUploading(true)

    const folder = buildEventFolderName(isOldEvent, event.title, getEventDate() || '')

    const results = await Promise.allSettled(
      Array.from(files).map(async (file) => {
        const publicId = uploadToCloudinary(file, folder, event.slug || '')

        const id = await publicId
        return createEventImage(
          {
            event_id: event.id,
            event_slug: event.slug || '',
            image_id: id,
            is_visible: true,
            display_order: images.length,
          },
          isOldEvent
        )
      })
    )

    const succeeded = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length
    if (succeeded > 0)
      toast.success(t(`${succeeded} bilder uppladdade!`, `${succeeded} images uploaded!`))
    if (failed > 0) toast.error(t(`${failed} misslyckades`, `${failed} failed`))

    setUploading(false)
    onUpdate()
  }

  const handleToggle = async (img: EventImage) => {
    try {
      await toggleImageVisibility(img.id, !img.is_visible, isOldEvent)
      onUpdate()
    } catch (err) {
      console.error('Toggle visibility error:', err)
      toast(
        t('Något gick fel vid ändring av synlighet', 'Something went wrong toggling visibility')
      )
    }
  }

  return (
    <div className="space-y-4">
      <div className="editor-container">
        {/* Upload zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            handleUpload(e.dataTransfer.files)
          }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-accent bg-accent/10'
              : 'border-accent/20 hover:border-accent/50 hover:bg-accent/5'
          }`}
        >
          <Upload className="w-8 h-8 text-accent/50 mx-auto mb-3" />
          <p className="font-decorative uppercase tracking-widest text-sm text-foreground/50">
            {uploading
              ? t('Laddar upp...', 'Uploading...')
              : t('Dra hit eller klicka för att ladda upp', 'Drag here or click to upload')}
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files && handleUpload(e.target.files)}
          />
        </div>

        {/* Image grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {images.map((img: EventImage) => (
              <div
                key={img.id}
                className="relative aspect-square rounded-lg overflow-hidden border border-accent/10 hover:border-accent/40 transition-all hover:scale-[1.02]"
              >
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

                {/* Delete button */}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default GalleryEditor
