import { useState, useRef, useEffect } from 'react'
import type { Event, OldEvent, EventImage, Performer } from '@/types/types'
import { createEventImage, toggleImageVisibility, deleteEventImage } from '@/services/eventService'
import { uploadToCloudinary } from '@/services/cloudinaryService'
import CloudinaryImage from '@/components/CloudinaryImage'
import { fetchPerformers } from '@/services/performerService'
import { buildEventFolderName, compressImage, createSlug } from '@/lib/utils'
import { ImageCategory } from '@/types/media'
import { useLanguage } from '@/contexts/LanguageContext'
import { Eye, EyeOff, Upload, Trash2, X, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface GalleryEditorProps {
  event: Event | OldEvent
  isOldEvent: boolean
  images: EventImage[]
  onUpdate: () => void
}

interface PerformanceSelection {
  performerName: string
  actName: string
}

export const GalleryEditor = ({ images, event, isOldEvent, onUpdate }: GalleryEditorProps) => {
  const { t } = useLanguage()

  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  // Metadata states
  const [selectedType, setSelectedType] = useState<string>('')
  const [selectedPerformers, setSelectedPerformers] = useState<PerformanceSelection[]>([])

  // States för artist-väljaren
  const [activePerformerName, setActivePerformerName] = useState<string>('')
  const [currentActInput, setCurrentActInput] = useState('')
  const [allPerformers, setAllPerformers] = useState<Performer[]>([])

  // Manuella extra-taggar
  const [tagInput, setTagInput] = useState('')
  const [customTags, setCustomTags] = useState<string[]>([])

  const baseTags = [event.slug].filter(Boolean)

  useEffect(() => {
    const loadPerformers = async () => {
      try {
        const data = await fetchPerformers(true)
        setAllPerformers(data as Performer[])
      } catch (err) {
        console.error('Failed to fetch performers:', err)
      }
    }
    loadPerformers()
  }, [])

  // Funktion för att baka ihop artist + akt till listan
  const handleAddPerformer = () => {
    if (!activePerformerName) return

    if (!selectedPerformers.some((p) => p.performerName === activePerformerName)) {
      setSelectedPerformers([
        ...selectedPerformers,
        { performerName: activePerformerName, actName: currentActInput.trim() },
      ])
    }

    // Nollställ sökfälten för nästa artist
    setActivePerformerName('')
    setCurrentActInput('')
  }

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const newTag = createSlug(tagInput)

      if (newTag && !baseTags.includes(newTag) && !customTags.includes(newTag)) {
        setCustomTags([...customTags, newTag])
      }
      setTagInput('')
    }
    if (e.key === 'Backspace' && tagInput === '' && customTags.length > 0) {
      setCustomTags(customTags.slice(0, -1))
    }
  }

  const removeTag = (tagToRemove: string) => {
    setCustomTags(customTags.filter((t) => t !== tagToRemove))
  }

  const getEventDate = () => {
    if (isOldEvent) return 'date' in event ? event.date : null
    return 'event_start' in event ? event.event_start : null
  }

  const isUploadDisabled = () => {
    if (!selectedType) return true
    if (selectedType === ImageCategory.PERFORMANCE && selectedPerformers.length === 0) return true
    return uploading
  }

  const handleUpload = async (files: FileList) => {
    if (!files.length || isUploadDisabled()) return
    setUploading(true)
    setProgress({ current: 0, total: files.length })

    const base = isOldEvent ? 'Old Events' : 'Events'
    const eventFolder = buildEventFolderName(event.title, getEventDate() || '')
    const fileArray = Array.from(files)
    const folder = `${base}/${eventFolder}`

    // Slugs för sökning i Cloudinary
    const performerTags: string[] = []
    selectedPerformers.forEach((p) => {
      performerTags.push(createSlug(p.performerName))
      if (p.actName) performerTags.push(createSlug(p.actName))
    })

    const cloudinaryTags = [event.slug, selectedType, ...performerTags, ...customTags].filter(
      Boolean
    )

    const formattedPerformers = selectedPerformers.map((p) =>
      p.actName ? `${p.performerName} (${p.actName})` : p.performerName
    )

    let artistMetadataString = 'N/A'
    if (formattedPerformers.length === 1) {
      artistMetadataString = formattedPerformers[0]
    } else if (formattedPerformers.length > 1) {
      const last = formattedPerformers.pop()
      artistMetadataString = `${formattedPerformers.join(', ')} & ${last}`
    }

    const context = {
      photographer: event.photographer?.trim() || 'Okänd',
      event: event.title.trim(),
      category: selectedType,
      artist: artistMetadataString,
    }

    let succeeded = 0
    let failed = 0
    const baseOrder = images.length

    await Promise.allSettled(
      fileArray.map(async (file, index) => {
        try {
          const fileToUpload = await compressImage(file)
          const publicId = await uploadToCloudinary(
            fileToUpload,
            folder,
            cloudinaryTags,
            undefined,
            context
          )

          await createEventImage(
            {
              event_id: event.id,
              event_slug: event.slug || '',
              image_id: publicId,
              is_visible: true,
              display_order: baseOrder + index,
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
      toast(t('Något gick fel', 'Something went wrong'))
    }
  }

  const handleDelete = async (img: EventImage) => {
    if (!confirm(t('Är du säker?', 'Are you sure?'))) return
    try {
      await deleteEventImage(img.id, img.image_id, isOldEvent)
      toast.success(t('Bild raderad!', 'Image deleted!'))
      onUpdate()
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  return (
    <div className="space-y-6">
      <div className="editor-container">
        {/* TOP PANEL: SAMMA HÖJD OCH RAK RAD PÅ STÖRRE SKÄRMAR */}
        <div className="grid grid-cols-1 md:flex md:items-end gap-4 bg-black/20 p-4 rounded-xl border border-white/5 mb-4 text-left">
          <div className="form-field w-full md:w-64">
            <label className="form-label-gold text-xs block mb-1">
              {t('Bildtyp *', 'Image Type *')}
            </label>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value)
                if (e.target.value !== ImageCategory.PERFORMANCE) {
                  setSelectedPerformers([])
                  setActivePerformerName('')
                  setCurrentActInput('')
                }
              }}
              className="admin-select !w-full h-[46px]"
            >
              <option value="">-- {t('Välj bildtyp...', 'Select image type...')} --</option>
              <option value={ImageCategory.PERFORMANCE}>
                {t('Performance (Artist)', 'Performance (Artist)')}
              </option>
              <option value={ImageCategory.STAGE}>
                {t('Stage (Crew/Host)', 'Stage (Crew/Host)')}
              </option>
              <option value={ImageCategory.PARTY}>{t('Party (Mingel)', 'Party (Mingel)')}</option>
              <option value={ImageCategory.PHOTOBOOTH}>{t('Photobooth', 'Photobooth')}</option>
              <option value={ImageCategory.OLD_EVENT}>{t('Gammal Event', 'Old Event')}</option>
            </select>
          </div>

          {/* DYNAMISK ARTISTVÄLJARE - VISAS BARA VID PERFORMANCE */}
          {selectedType === ImageCategory.PERFORMANCE && (
            <div className="animate-fade-in flex-1 grid grid-cols-1 sm:flex sm:items-end gap-3 w-full">
              <div className="form-field flex-1">
                <label className="form-label-gold text-xs block mb-1">
                  {t('1. Välj Artist *', '1. Select Performer *')}
                </label>
                <select
                  value={activePerformerName}
                  onChange={(e) => setActivePerformerName(e.target.value)}
                  className="admin-select !w-full h-[46px]"
                >
                  <option value="">-- {t('Välj artist...', 'Select artist...')} --</option>
                  {allPerformers.map((p) => (
                    <option key={p.id} value={p.performer_name}>
                      {p.performer_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* AKT INPUT - VISAS BARA OM EN ARTIST ÄR VALD FÖRST */}
              <div
                className={`form-field transition-all duration-200 flex-1 ${activePerformerName ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}
              >
                <label className="form-label-gold text-xs block mb-1">
                  {t('2. Akt / Nummer (Frivillig)', '2. Act Name (Optional)')}
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={currentActInput}
                    onChange={(e) => setCurrentActInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddPerformer()}
                    placeholder={t(
                      't.ex. Silk, Eld... (Klicka Enter)',
                      'e.g. Silk, Fire... (Press Enter)'
                    )}
                    className="w-full bg-background p-3 pr-10 rounded-lg border text-sm h-[46px]"
                    style={{ borderColor: 'rgba(212, 175, 55, 0.2)' }}
                  />
                  <button
                    type="button"
                    onClick={handleAddPerformer}
                    disabled={!activePerformerName}
                    className="absolute right-2 p-1.5 rounded-md bg-accent text-black hover:bg-white transition-all disabled:opacity-50"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* GEMENSAM TAG-RAD: BÅDE EVENT, ARTISTER OCH EXTRA TAGGAR HÄR */}
        <div className="flex flex-wrap items-center gap-2 bg-black/40 p-3 rounded-lg border border-white/5 mb-6">
          {/* Base Event Tag */}
          {baseTags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider bg-accent/10 text-accent border border-accent/20"
            >
              {tag}
            </span>
          ))}

          {/* Valda artister renderas som guld-taggar i samma rad! */}
          {selectedPerformers.map((p) => (
            <span
              key={p.performerName}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-mono bg-accent text-black border border-accent"
            >
              <span className="font-semibold uppercase tracking-wider">{p.performerName}</span>
              {p.actName && <span className="opacity-70 text-[11px]">({p.actName})</span>}
              <button
                type="button"
                onClick={() =>
                  setSelectedPerformers(
                    selectedPerformers.filter((item) => item.performerName !== p.performerName)
                  )
                }
                className="text-black hover:text-red-800 ml-1.5 font-bold"
              >
                <X size={12} />
              </button>
            </span>
          ))}

          {/* Custom taggar */}
          {customTags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider bg-white/10 text-foreground/80 border border-white/10"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-foreground/40 hover:text-foreground ml-1"
              >
                <X size={12} />
              </button>
            </span>
          ))}

          {/* Textfält för att skriva fria taggar */}
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder={t('Lägg till extra tagg...', 'Add extra tag...')}
            className="flex-1 min-w-[150px] bg-transparent outline-none text-xs text-foreground/60 placeholder:text-foreground/30 font-mono py-1.5"
          />
        </div>

        {/* Upload zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault()
            if (!isUploadDisabled()) setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            if (!isUploadDisabled()) handleUpload(e.dataTransfer.files)
          }}
          onClick={() => !isUploadDisabled() && inputRef.current?.click()}
          className={`upload-dropzone ${dragOver ? 'upload-dropzone-active' : ''} ${
            isUploadDisabled() ? 'opacity-30 cursor-not-allowed border-dashed' : 'cursor-pointer'
          }`}
        >
          <Upload className="w-8 h-8 text-accent/50 mx-auto mb-3" />
          <p className="font-body tracking-wider text-sm text-foreground/50 p-2">
            {!selectedType
              ? t('VÄLJ BILDTYP OVAN FÖRST', 'SELECT IMAGE TYPE ABOVE FIRST')
              : selectedType === ImageCategory.PERFORMANCE && selectedPerformers.length === 0
                ? t(
                    'VÄLJ OCH LÄGG TILL MINST EN ARTIST HÄR OVAN',
                    'ADD AT LEAST ONE PERFORMER ABOVE'
                  )
                : uploading
                  ? t(`Laddar upp ${progress.current} av ${progress.total}...`, `Uploading...`)
                  : t('Dra hit eller klicka för att ladda upp', 'Drag here or click to upload')}
          </p>

          {uploading && progress.total > 0 && (
            <div className="progress-track">
              <div
                className="progress-fill"
                style={
                  {
                    ['--progress' as string]: `${(progress.current / progress.total) * 100}%`,
                  } as React.CSSProperties
                }
              />
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*"
            disabled={isUploadDisabled()}
            className="hidden"
            onChange={(e) => e.target.files && handleUpload(e.target.files)}
          />
        </div>

        {/* Image grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {images.map((img: EventImage) => (
              <div key={img.id} className="gallery-thumb relative">
                <CloudinaryImage
                  publicId={img.image_id}
                  width={400}
                  height={400}
                  className={'media-cover' + (img.is_visible ? '' : ' opacity-30')}
                />

                <button
                  onClick={() => handleToggle(img)}
                  className={`absolute top-2 right-2 p-1 rounded-full transition-all ${
                    img.is_visible ? 'bg-accent text-black' : 'bg-black/60 text-white/40'
                  }`}
                >
                  {img.is_visible ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>

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
