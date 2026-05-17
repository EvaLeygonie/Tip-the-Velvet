import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Event, OldEvent, EventImage } from '@/types'
import {
  createEventImage,
  toggleImageVisibility,
  deleteEventImage,
  purgeOrphanedImages,
} from '@/services/eventService'
import { uploadToCloudinary } from '@/services/cloudinaryService'
import CloudinaryImage from '@/components/CloudinaryImage'
import { buildEventFolderName, compressImage } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { Eye, EyeOff, Upload, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

interface GalleryEditorProps {
  event: Event | OldEvent
  isOldEvent: boolean
  images: EventImage[]
  onUpdate: () => void
}

const GalleryEditor = ({ images, event, isOldEvent, onUpdate }: GalleryEditorProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const { t } = useLanguage()

  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([event.slug])

  const handlePurge = async () => {
    try {
      const count = await purgeOrphanedImages(event.slug, isOldEvent)
      toast.success(t(`${count} trasiga rader borttagna`, `${count} orphaned rows removed`))
      onUpdate()
    } catch (err) {
      toast.error(t('Rensning misslyckades', 'Purge failed'))
      console.error(err)
    }
  }

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const newTag = tagInput.trim().toLowerCase().replace(/\s+/g, '-')
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag])
      }
      setTagInput('')
    }
    if (e.key === 'Backspace' && tagInput === '' && tags.length > 1) {
      setTags(tags.slice(0, -1))
    }
  }

  const removeTag = (tagToRemove: string) => {
    if (tagToRemove === event.slug) return // protect event slug
    setTags(tags.filter((t) => t !== tagToRemove))
  }

  const getEventDate = () => {
    if (isOldEvent) return 'date' in event ? event.date : null
    return 'event_start' in event ? event.event_start : null
  }

  const BATCH_SIZE = 4
  const handleUpload = async (files: FileList) => {
    if (!files.length) return
    setUploading(true)
    setProgress({ current: 0, total: files.length })

    const folder = buildEventFolderName(isOldEvent, event.title, getEventDate() || '')
    const fileArray = Array.from(files)

    let succeeded = 0
    let failed = 0

    for (let i = 0; i < fileArray.length; i += BATCH_SIZE) {
      const batch = fileArray.slice(i, i + BATCH_SIZE)

      await Promise.allSettled(
        batch.map(async (file) => {
          try {
            const fileToUpload = file.size > 9 * 1024 * 1024 ? await compressImage(file) : file

            const publicId = await uploadToCloudinary(fileToUpload, folder, tags)
            await createEventImage(
              {
                event_id: event.id,
                event_slug: event.slug || '',
                image_id: publicId,
                is_visible: true,
                display_order: images.length + succeeded,
              },
              isOldEvent
            )
            succeeded++
          } catch (err) {
            console.error('Failed:', file.name, err)
            failed++
          } finally {
            setProgress((prev) => ({ ...prev, current: prev.current + 1 }))
          }
        })
      )
    }

    if (succeeded > 0)
      toast.success(t(`${succeeded} bilder uppladdade!`, `${succeeded} images uploaded!`))
    if (failed > 0) toast.error(t(`${failed} misslyckades`, `${failed} failed`))

    setUploading(false)
    setProgress({ current: 0, total: 0 })
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

  const handleDelete = async (img: EventImage) => {
    if (
      !confirm(
        t(
          'Är du säker på att du vill radera den här bilden?',
          'Are you sure you want to delete this image?'
        )
      )
    )
      return

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) throw new Error(t('Inte inloggad', 'Not logged in'))

    try {
      await deleteEventImage(img.id, img.image_id, isOldEvent, session.access_token)
      toast.success(t('Bild raderad!', 'Image deleted!'))
      onUpdate()
    } catch (err) {
      console.error('Delete image error:', err)
      toast(t('Något gick fel vid radering av bilden', 'Something went wrong deleting the image'))
    }
  }

  return (
    <div className="space-y-4">
      <div className="editor-container">
        <button onClick={handlePurge} className="btn-admin text-xs">
          {t('Rensa trasiga bilder', 'Remove orphaned images')}
        </button>

        {/* Tag editor */}
        <div className="flex flex-wrap items-center gap-2 border-b border-accent/20 pb-3 mb-4">
          {tags.map((tag) => (
            <span
              key={tag}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider ${
                tag === event.slug
                  ? 'bg-accent/20 text-accent border border-accent/30' // event slug — gold
                  : 'bg-white/10 text-foreground/70 border border-white/10' // extra tags — neutral
              }`}
            >
              {tag}
              {tag !== event.slug && (
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-foreground/40 hover:text-foreground ml-1"
                >
                  <X size={10} />
                </button>
              )}
            </span>
          ))}

          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder={t('Lägg till tagg...', 'Add tag...')}
            className="flex-1 min-w-[120px] bg-transparent outline-none text-xs text-foreground/60 placeholder:text-foreground/30 font-mono"
          />
        </div>

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
              ? t(
                  `Laddar upp ${progress.current} av ${progress.total}...`,
                  `Uploading ${progress.current} of ${progress.total}...`
                )
              : t('Dra hit eller klicka för att ladda upp', 'Drag here or click to upload')}
          </p>

          {/* Progress bar */}
          {uploading && progress.total > 0 && (
            <div className="w-full bg-white/10 rounded-full h-1.5 mt-4">
              <div
                className="bg-accent h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          )}
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
                  className={'  w-full h-full object-cover ' + (img.is_visible ? '' : 'opacity-30')}
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
                <button
                  onClick={() => handleDelete(img)}
                  className="absolute top-2 left-2 p-1 rounded-full transition-all bg-red-900/80 hover:bg-red-600 text-red-200"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default GalleryEditor
