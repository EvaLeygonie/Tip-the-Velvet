import { useState, useRef, useEffect, useMemo, Fragment } from 'react'
import type { Event, OldEvent, EventImage } from '@/types/types'
import {
  createEventImage,
  toggleImageVisibility,
  deleteEventImage,
  setEventImageCategory,
  getEventActsForAdmin,
  type AdminEventActRow,
  type EventPerformerRow,
} from '@/services/eventService'
import { uploadToCloudinary } from '@/services/cloudinaryService'
import CloudinaryImage from '@/components/CloudinaryImage'
import { buildEventFolderName, compressImage, createSlug } from '@/lib/utils'
import { ImageCategory } from '@/types/media'
import { photoGroup } from '@/lib/photoGroups'
import { useLanguage } from '@/contexts/LanguageContext'
import { Eye, EyeOff, Upload, Trash2, X, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useConfirm } from '@/contexts/ConfirmContext'

interface GalleryEditorProps {
  event: Event | OldEvent
  isOldEvent: boolean
  images: EventImage[]
  onUpdate: () => void
  eventPerformers: EventPerformerRow[]
}

// The image types that can be filtered on the public page (see photoGroup in lib/photoGroups.ts)
const PHOTO_CATEGORIES = [
  ImageCategory.PERFORMANCE,
  ImageCategory.STAGE,
  ImageCategory.PARTY,
  ImageCategory.PHOTOBOOTH,
] as const

interface PerformanceSelection {
  performerName: string
  actName: string
}

interface PerformerSlot {
  performerId: string
  actName: string
}

const EMPTY_SLOT: PerformerSlot = { performerId: '', actName: '' }

export const GalleryEditor = ({
  images,
  event,
  isOldEvent,
  onUpdate,
  eventPerformers,
}: GalleryEditorProps) => {
  const { t } = useLanguage()
  const confirm = useConfirm()

  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const [selectedType, setSelectedType] = useState<string>('')
  // The performer/act pickers for the NEXT batch. Live, with no "add" step: whatever is
  // selected here is what the batch gets tagged with. Normally one slot (one act per batch);
  // more only for a group shot ("add another performer").
  const [slots, setSlots] = useState<PerformerSlot[]>([EMPTY_SLOT])

  // The show's running order (performer_acts), used to suggest the right act for each performer
  // and, since photos are uploaded in show order, to jump to the next act after each batch.
  const [acts, setActs] = useState<AdminEventActRow[]>([])
  const [uploadedActKeys, setUploadedActKeys] = useState<string[]>([])

  useEffect(() => {
    if (isOldEvent) return
    let cancelled = false
    getEventActsForAdmin(event.id)
      .then((rows) => {
        if (!cancelled) setActs(rows)
      })
      .catch((err) => console.error('Could not load running order for gallery:', err))
    return () => {
      cancelled = true
    }
  }, [event.id, isOldEvent])

  // Real acts only (manual/constant segments have no performer), in show order.
  const lineup = useMemo(
    () => acts.filter((a) => a.performer_id && a.act_name.trim() && a.performer),
    [acts]
  )

  const actKey = (performerId: string, actName: string) => `${performerId}|${actName}`

  // Lineup performers in running order (first act decides), approved ones only — the same
  // filter the old dropdown applied.
  const orderedPerformers = useMemo(() => {
    const rows = eventPerformers.filter((row) => row.performer)
    const firstIndex = (id: string) => {
      const i = lineup.findIndex((a) => a.performer_id === id)
      return i === -1 ? Number.MAX_SAFE_INTEGER : i
    }
    return [...rows].sort((a, b) => firstIndex(a.performer.id) - firstIndex(b.performer.id))
  }, [eventPerformers, lineup])

  const actsForPerformer = (performerId: string) =>
    lineup.filter((a) => a.performer_id === performerId)

  // Smart pick: the performer's first act that hasn't been uploaded yet this session.
  const suggestAct = (performerId: string) => {
    const list = actsForPerformer(performerId)
    return list.find((a) => !uploadedActKeys.includes(actKey(performerId, a.act_name))) ?? list[0]
  }

  const slotFromAct = (a: AdminEventActRow): PerformerSlot => ({
    performerId: a.performer_id!,
    actName: a.act_name.trim(),
  })

  const performerById = (id: string) =>
    eventPerformers.find((row) => row.performer?.id === id)?.performer

  const updateSlot = (index: number, patch: PerformerSlot) =>
    setSlots((prev) => prev.map((s, i) => (i === index ? patch : s)))

  const handleSlotPerformerChange = (index: number, id: string) =>
    updateSlot(index, {
      performerId: id,
      actName: id ? (suggestAct(id)?.act_name.trim() ?? '') : '',
    })

  // What the next batch is tagged with, derived live from the pickers.
  const selectedPerformers: PerformanceSelection[] = slots.flatMap((slot) => {
    const performer = performerById(slot.performerId)
    return performer
      ? [{ performerName: performer.performer_name, actName: slots[0].actName.trim() }]
      : []
  })

  const [tagInput, setTagInput] = useState('')
  const [customTags, setCustomTags] = useState<string[]>([])

  const baseTags = [event.slug].filter(Boolean)

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

  // Every tag the next batch will get: event, category, the selected performers/acts, and the
  // custom tags (which stay between batches). Shown to the user before uploading.
  const buildTags = () => {
    const performerTags: string[] = []
    selectedPerformers.forEach((p) => {
      performerTags.push(createSlug(p.performerName))
      if (p.actName) performerTags.push(createSlug(p.actName))
    })
    return [event.slug, selectedType, ...performerTags, ...customTags].filter(
      (tag): tag is string => Boolean(tag)
    )
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

    const cloudinaryTags = buildTags()

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
    const uploadCategory = (PHOTO_CATEGORIES as readonly string[]).includes(selectedType)
      ? selectedType
      : null

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
              // events only: the old archive's table has no category column
              ...(isOldEvent ? {} : { category: uploadCategory }),
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

    // Each batch has its own tags: nothing carries over. Photos are uploaded in show order, so
    // the pickers move on to the next act in the running order (or empty, without one).
    if (succeeded > 0 && selectedType === ImageCategory.PERFORMANCE) {
      // extra performers share the first row's act
      const doneKeys = slots[0].performerId ? [actKey(slots[0].performerId, slots[0].actName)] : []
      const allDone = [...uploadedActKeys, ...doneKeys]
      setUploadedActKeys(allDone)
      const keyOf = (a: AdminEventActRow) => actKey(a.performer_id!, a.act_name.trim())
      const lastIdx = Math.max(-1, ...doneKeys.map((k) => lineup.findIndex((a) => keyOf(a) === k)))
      const next =
        lineup.slice(lastIdx + 1).find((a) => !allDone.includes(keyOf(a))) ??
        lineup.find((a) => !allDone.includes(keyOf(a)))
      setSlots([next ? slotFromAct(next) : EMPTY_SLOT])
    }

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

  const handleCategory = async (img: EventImage, value: string) => {
    try {
      await setEventImageCategory(img.id, value || null)
      onUpdate()
    } catch (err) {
      console.error('Set category error:', err)
      toast(t('Något gick fel', 'Something went wrong'))
    }
  }

  const handleDelete = async (img: EventImage) => {
    if (
      !(await confirm({
        message: t('Radera den här bilden?', 'Delete this image?'),
        destructive: true,
      }))
    )
      return
    try {
      await deleteEventImage(img.id, img.image_id, isOldEvent)
      toast.success(t('Bild raderad!', 'Image deleted!'))
      onUpdate()
    } catch (err) {
      console.error('Delete error:', err)
      toast.error(t('Kunde inte radera bilden', 'Failed to delete image'))
    }
  }

  return (
    <div className="space-y-6">
      <div className="editor-container">
        {/* TYPE SELECTION */}
        <div className="grid grid-cols-1 md:flex md:items-end gap-4 bg-black/20 p-4 rounded-xl border border-white/5 mb-2 text-left">
          <div className="form-field w-full md:w-64">
            <label className="form-label-gold text-xs block mb-1">
              {t('Bildtyp *', 'Image Type *')}
            </label>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value)
                if (e.target.value !== ImageCategory.PERFORMANCE) {
                  setSlots([EMPTY_SLOT])
                } else if (slots.every((slot) => !slot.performerId)) {
                  // Start with the first act not uploaded yet (the opening act, at first)
                  const first = lineup.find(
                    (a) => !uploadedActKeys.includes(actKey(a.performer_id!, a.act_name.trim()))
                  )
                  if (first) setSlots([slotFromAct(first)])
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
              {isOldEvent && (
                <option value={ImageCategory.OLD_EVENT}>{t('Gammal Event', 'Old Event')}</option>
              )}
            </select>
          </div>

          {/* PERFORMER + ACT PICKERS — live. The first row picks performer and act; extra
              performers (group act) join the SAME act, so they only need a performer. */}
          {selectedType === ImageCategory.PERFORMANCE && (
            <div className="animate-fade-in flex-1 w-full grid grid-cols-1 sm:grid-cols-[1fr_1fr_46px] items-end gap-3">
              {slots.map((slot, index) => {
                const slotActs = actsForPerformer(slot.performerId)
                return (
                  <Fragment key={index}>
                    <div className="form-field">
                      {index === 0 && (
                        <label className="form-label-gold text-xs block mb-1">
                          {t('1. Välj Artist *', '1. Select Performer *')}
                        </label>
                      )}
                      <select
                        value={slot.performerId}
                        onChange={(e) => handleSlotPerformerChange(index, e.target.value)}
                        className="admin-select !w-full h-[46px]"
                      >
                        <option value="">-- {t('Välj artist...', 'Select artist...')} --</option>
                        {/* orderedPerformers skips lineup rows whose performer isn't approved
                          yet (performer is null there, see EventLineup.tsx) and sorts by show
                          order */}
                        {orderedPerformers.map((row) => (
                          <option key={row.performer.id} value={row.performer.id}>
                            {row.performer.performer_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {index === 0 ? (
                      <div
                        className={`form-field transition-all duration-200 ${slot.performerId ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}
                      >
                        <label className="form-label-gold text-xs block mb-1">
                          {t('2. Akt / Nummer (Frivillig)', '2. Act Name (Optional)')}
                        </label>
                        {slotActs.length > 1 ? (
                          <select
                            value={slot.actName}
                            onChange={(e) =>
                              updateSlot(index, { ...slot, actName: e.target.value })
                            }
                            className="admin-select !w-full h-[46px]"
                          >
                            <option value="">-- {t('Ingen akt', 'No act')} --</option>
                            {slotActs.map((a) => (
                              <option key={a.id} value={a.act_name.trim()}>
                                {a.act_name.trim()}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={slot.actName}
                            onChange={(e) =>
                              updateSlot(index, { ...slot, actName: e.target.value })
                            }
                            placeholder={t('t.ex. Silk, Eld...', 'e.g. Silk, Fire...')}
                            className="w-full bg-background p-3 rounded-lg border text-sm h-[46px]"
                            style={{ borderColor: 'rgba(212, 175, 55, 0.2)' }}
                          />
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-foreground/40 h-[46px] flex items-center">
                        {t('Samma akt', 'Same act')}
                      </p>
                    )}

                    {index === 0 ? (
                      <button
                        type="button"
                        onClick={() => setSlots((prev) => [...prev, EMPTY_SLOT])}
                        disabled={!slots[slots.length - 1].performerId}
                        title={t(
                          'Lägg till en artist till i samma akt',
                          'Add another performer to the same act'
                        )}
                        aria-label={t(
                          'Lägg till en artist till i samma akt',
                          'Add another performer to the same act'
                        )}
                        className="h-[46px] w-[46px] flex items-center justify-center rounded-lg bg-accent text-black hover:bg-white transition-all disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <Plus size={18} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSlots((prev) => prev.filter((_, i) => i !== index))}
                        className="h-[46px] w-[46px] flex items-center justify-center text-foreground/40 hover:text-foreground"
                        aria-label={t('Ta bort artist', 'Remove performer')}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </Fragment>
                )
              })}
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

          {/* Selected performers/acts (from the pickers above) as gold tags */}
          {selectedPerformers.map((p) => (
            <span
              key={p.performerName}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-mono bg-accent text-black border border-accent"
            >
              <span className="font-semibold uppercase tracking-wider">{p.performerName}</span>
              {p.actName && <span className="opacity-70 text-[11px]">({p.actName})</span>}
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
                ? t('VÄLJ EN ARTIST HÄR OVAN', 'SELECT A PERFORMER ABOVE')
                : uploading
                  ? t(`Laddar upp ${progress.current} av ${progress.total}...`, `Uploading...`)
                  : t('Dra hit eller klicka för att ladda upp', 'Drag here or click to upload')}
          </p>

          {!isUploadDisabled() && (
            <p className="text-xs font-mono text-accent/80 pb-2 px-2 break-words">
              {t('Taggas som:', 'Tagging as:')} {buildTags().join(' · ')}
            </p>
          )}

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

                {!isOldEvent && (
                  <select
                    value={photoGroup(img.category) ?? ''}
                    onChange={(e) => void handleCategory(img, e.target.value)}
                    className="absolute bottom-1 left-1 right-1 !w-auto !p-1 !text-[11px] !rounded bg-black/70"
                    aria-label={t('Bildkategori', 'Photo category')}
                  >
                    <option value="">{t('Ingen kategori', 'No category')}</option>
                    <option value="stage">Stage</option>
                    <option value="party">{t('Mingel', 'Mingle')}</option>
                    <option value="photobooth">Photobooth</option>
                  </select>
                )}

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
