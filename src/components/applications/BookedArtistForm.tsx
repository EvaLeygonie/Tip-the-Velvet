import React, { useEffect, useRef, useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import CloudinaryImage from '@/components/CloudinaryImage'
import { toast } from 'sonner'
import {
  Upload,
  Save,
  Loader2,
  FileText,
  Music,
  ExternalLink,
  Trash2,
  Plus,
  Crown,
  Mic2,
} from 'lucide-react'
import type { CastingApplicationPortalData } from '@/types/types'
import { uploadStorageFile } from '@/services/databaseService'
import { supabase } from '@/lib/supabase'
import {
  updatePerformerAct,
  updateEventPerformerDetails,
  updatePerformerBioViaToken,
  type PerformerActInput,
  type EventPerformerDetailsInput,
} from '@/services/applicationService'
import {
  buildEventFolderName,
  createSlug,
  getStoragePathFromUrl,
  getPublicFileUrl,
} from '@/lib/utils'

export interface AudioTrackItem {
  id: string
  title: string
  artist: string
  fileName?: string
  fileUrl?: string
  filePath?: string
}

export interface ReceiptItem {
  id: string
  name: string
  url: string
}

interface BookedArtistFormProps {
  application: CastingApplicationPortalData
  onSaveSuccess?: () => void
}

interface ActFormState {
  key: string
  actId: string | null
  label: string
  act_name: string
  act_description_sv: string
  act_description_eng: string
  stage_preparations: string
  pick_up_cleaning: string
  act_notes: string
  audioTracks: AudioTrackItem[]
}

// Type Guards for Supabase Json/Jsonb conversion
const isAudioTrackItemArray = (data: unknown): data is AudioTrackItem[] => {
  if (!Array.isArray(data)) return false
  return data.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      'id' in item &&
      'title' in item &&
      'artist' in item
  )
}

const isReceiptItemArray = (data: unknown): data is ReceiptItem[] => {
  if (!Array.isArray(data)) return false
  return data.every(
    (item) =>
      typeof item === 'object' && item !== null && 'id' in item && 'name' in item && 'url' in item
  )
}

export const BookedArtistForm: React.FC<BookedArtistFormProps> = ({
  application,
  onSaveSuccess,
}) => {
  const { t } = useLanguage()

  const [submitting, setSubmitting] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  // Save bar visibility logic — if the user has scrolled to the bottom of the form, hide the save bar so it doesn't cover the submit button.
  const [reachedFormEnd, setReachedFormEnd] = useState(false)
  const [saveBarHeight, setSaveBarHeight] = useState(80)
  const saveBarRef = useRef<HTMLDivElement | null>(null)
  const formEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = saveBarRef.current
    if (!el) return
    const resizeObserver = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height
      if (height) setSaveBarHeight(height)
    })
    resizeObserver.observe(el)
    return () => resizeObserver.disconnect()
  }, [])

  useEffect(() => {
    const el = formEndRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setReachedFormEnd(entry.isIntersecting),
      { rootMargin: `0px 0px -${saveBarHeight}px 0px` }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [saveBarHeight])

  // Storage paths staged for deletion — only actually removed from the bucket once
  // the form is saved, so an accidental "x" click can't lose a file for good.
  const [pendingDeletePaths, setPendingDeletePaths] = useState<string[]>([])

  const [uploadingAudio, setUploadingAudio] = useState(false)
  const [uploadingReceipt, setUploadingReceipt] = useState(false)

  const [newTrackTitle, setNewTrackTitle] = useState('')
  const [newTrackArtist, setNewTrackArtist] = useState('')
  const [newTrackFile, setNewTrackFile] = useState<{
    name: string
    url: string
    path: string
  } | null>(null)

  const isEng = application.language === 'eng'

  const [receiptFiles, setReceiptFiles] = useState<ReceiptItem[]>(() => {
    const receipts = application.event_performers?.travel_receipts
    return receipts && isReceiptItemArray(receipts) ? receipts : []
  })

  // application kommer redan med performers/performer_acts/event_performers/acts nästlat
  // (get_casting_application_by_token hämtar allt i samma SECURITY DEFINER-anrop) —
  // anon har ingen direkt läsrättighet på dessa tabeller, så det finns inget att hämta
  // asynkront här; initiera state direkt från proppen istället för en effekt.
  //
  // Ett block per vald akt (confirm_and_migrate_artist skapar en performer_acts-rad per
  // vald akt) — en bekräftad bokning (booking_status = 'confirmed') garanterar alltid
  // minst en vald akt med en migrerad performer_acts-rad, så inget fallback behövs längre.
  const [actsFormData, setActsFormData] = useState<ActFormState[]>(() => {
    const confirmedActs = (application.acts ?? []).filter((act) => act.is_selected)

    return confirmedActs.map((act) => {
      const actData = act.performer_acts
      const audioFiles = actData?.audio_files
      return {
        key: act.id,
        actId: act.performer_act_id,
        label: actData?.act_name || act.act_title,
        act_name: actData?.act_name ?? act.act_title ?? '',
        act_description_sv: actData?.description_sv ?? (isEng ? '' : act.act_description || ''),
        act_description_eng: actData?.description_eng ?? (isEng ? act.act_description || '' : ''),
        stage_preparations: actData?.stage_preparations ?? '',
        pick_up_cleaning: actData?.pick_up_cleaning ?? '',
        act_notes: actData?.act_notes ?? '',
        audioTracks: audioFiles && isAudioTrackItemArray(audioFiles) ? audioFiles : [],
      }
    })
  })

  const [activeActIndex, setActiveActIndex] = useState(0)
  const activeAct = actsFormData[activeActIndex] ?? actsFormData[0]

  const [formData, setFormData] = useState(() => {
    const perfData = application.performers
    const logisticsData = application.event_performers

    return {
      // Sektion 1: Artist Promo
      bio_sv: perfData?.bio_sv ?? (isEng ? '' : application.promo_text || ''),
      bio_eng: perfData?.bio_eng ?? (isEng ? application.promo_text || '' : ''),

      // Sektion 3: Logistik
      dietary_requirements: logisticsData?.dietary_requirements ?? '',
      plus_one_name: logisticsData?.plus_one_name ?? '',
      plus_one_email: logisticsData?.plus_one_email ?? '',
      travel_covered: logisticsData?.travel_covered ?? 0,
    }
  })

  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setIsDirty(true)
  }

  // Same as handleChange, but writes into the currently active act's block instead of
  // the shared formData — act fields are per-act (Phase 9 of multi-act-casting-plan.md).
  const handleActFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setActsFormData((prev) =>
      prev.map((act, idx) => (idx === activeActIndex ? { ...act, [name]: value } : act))
    )
    setIsDirty(true)
  }

  // Switches the active act tab, discarding any half-filled "new track" draft so it can
  // never end up attached to the wrong act.
  const handleSelectAct = (index: number) => {
    setActiveActIndex(index)
    setNewTrackTitle('')
    setNewTrackArtist('')
    setNewTrackFile(null)
  }

  const getStorageFolderPath = (subFolder: 'audio-tracks' | 'travel-receipts') => {
    const eventTitle = application.events?.title
    const eventDate = application.events?.event_start

    const eventFolderName =
      eventTitle && eventDate
        ? buildEventFolderName(eventTitle, eventDate)
        : application.event_id || 'okant-event'

    const artistSlug = application.performer_name
      ? createSlug(application.performer_name)
      : application.performer_id || 'okand-artist'

    return `${eventFolderName}/${artistSlug}/${subFolder}`
  }

  // --- MUSIC ---
  const handleTempAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAudio(true)
    try {
      const folderPath = getStorageFolderPath('audio-tracks')
      const rawPath = await uploadStorageFile('artist-files', folderPath, file)
      const publicUrl = getPublicFileUrl(rawPath)

      setNewTrackFile({
        name: file.name,
        url: publicUrl,
        path: rawPath,
      })
      toast.success(
        t(
          'Ljudfil bifogad! Glöm inte att klicka "Lägg till låt i akten".',
          'Audio file attached! Don\'t forget to press "Add song to act".'
        ),
        { duration: 7000 }
      )
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte ladda upp ljudfilen.', 'Could not upload audio file.'))
    } finally {
      setUploadingAudio(false)
      e.target.value = ''
    }
  }

  const handleAddTrack = () => {
    if (!newTrackTitle.trim() || !newTrackArtist.trim()) {
      toast.error(
        t(
          'Ange både låttitel och artist för att lägga till låten. Ladda upp fil vid behov.',
          'Please enter both a track title and artist to add the song. Upload a file if needed.'
        )
      )
      return
    }

    const newTrack: AudioTrackItem = {
      id: `track-${Date.now()}`,
      title: newTrackTitle.trim(),
      artist: newTrackArtist.trim(),
      fileName: newTrackFile?.name,
      fileUrl: newTrackFile?.url,
      filePath: newTrackFile?.path,
    }

    setActsFormData((prev) =>
      prev.map((act, idx) =>
        idx === activeActIndex ? { ...act, audioTracks: [...act.audioTracks, newTrack] } : act
      )
    )

    setNewTrackTitle('')
    setNewTrackArtist('')
    setNewTrackFile(null)
    setIsDirty(true)

    toast.success(
      t(
        'Låt tillagd i listan! Glöm inte att spara formuläret.',
        "Track added to the list! Don't forget to save the form."
      )
    )
  }

  // filePath is meant to hold a bucket-relative storage path, but items saved before
  // an earlier bugfix have it holding a full public URL instead — normalize either
  // shape down to a real path so storage.remove() can actually find the object.
  const resolveStoragePath = (filePath?: string, fileUrl?: string) => {
    if (filePath) {
      return filePath.startsWith('http') ? getStoragePathFromUrl(filePath) : filePath
    }
    return getStoragePathFromUrl(fileUrl || '')
  }

  // Removal only stages the file for deletion — the actual storage delete happens
  // in handleSubmit, once the form is saved, so an accidental "x" click (or closing
  // the tab without saving) never permanently loses a file.
  const removeTrack = (id: string) => {
    const trackToDelete = activeAct?.audioTracks.find((item) => item.id === id)

    if (trackToDelete) {
      const rawPath = resolveStoragePath(trackToDelete.filePath, trackToDelete.fileUrl)
      if (rawPath) {
        setPendingDeletePaths((prev) => [...prev, rawPath])
      }
    }

    setActsFormData((prev) =>
      prev.map((act, idx) =>
        idx === activeActIndex
          ? { ...act, audioTracks: act.audioTracks.filter((item) => item.id !== id) }
          : act
      )
    )
    setIsDirty(true)
    toast(
      t(
        'Låten borttagen. Glöm inte att spara formuläret för att bekräfta.',
        "Track removed. Don't forget to save the form to confirm."
      )
    )
  }

  // --- HANTERA RESEKVITTON ---
  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingReceipt(true)
    try {
      const folderPath = getStorageFolderPath('travel-receipts')
      const newItems: (ReceiptItem & { filePath?: string })[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const rawPath = await uploadStorageFile('artist-files', folderPath, file)
        const publicUrl = getPublicFileUrl(rawPath)

        newItems.push({
          id: `receipt-${Date.now()}-${i}`,
          name: file.name,
          url: publicUrl,
          filePath: rawPath,
        })
      }

      setReceiptFiles((prev) => [...prev, ...newItems])
      setIsDirty(true)
      toast.success(
        t(
          'Resekvitto(n) uppladdade! Glöm inte att spara formuläret.',
          "Travel receipt(s) uploaded! Don't forget to save the form."
        )
      )
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte ladda upp kvittot.', 'Could not upload receipt.'))
    } finally {
      setUploadingReceipt(false)
      e.target.value = ''
    }
  }

  // Same deferred-delete pattern as removeTrack — staged now, deleted from storage on save.
  const removeReceiptFile = (id: string) => {
    const receiptToDelete = receiptFiles.find((item) => item.id === id)

    if (receiptToDelete) {
      const rawPath = resolveStoragePath(
        (receiptToDelete as { filePath?: string }).filePath,
        receiptToDelete.url
      )
      if (rawPath) {
        setPendingDeletePaths((prev) => [...prev, rawPath])
      }
    }

    setReceiptFiles((prev) => prev.filter((item) => item.id !== id))
    setIsDirty(true)
    toast(
      t(
        'Kvittot borttaget. Glöm inte att spara formuläret för att bekräfta.',
        "Receipt removed. Don't forget to save the form to confirm."
      )
    )
  }

  // --- SPARA TILL SUPABASE ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (!application.access_token) {
        throw new Error('Access token saknas på ansökan.')
      }

      // 1. Uppdatera Performer
      if (application.performer_id) {
        await updatePerformerBioViaToken(application.performer_id, application.access_token, {
          bio_sv: formData.bio_sv,
          bio_eng: formData.bio_eng,
        })
      }

      // 2. Uppdatera varje vald akts Performer Act (en per flik)
      for (const act of actsFormData) {
        if (!act.actId) continue
        const actData: PerformerActInput & {
          stage_preparations?: string
          pick_up_cleaning?: string
          audio_files?: AudioTrackItem[]
        } = {
          act_name: act.act_name,
          description_sv: act.act_description_sv,
          description_eng: act.act_description_eng,
          act_notes: act.act_notes,
          stage_preparations: act.stage_preparations,
          pick_up_cleaning: act.pick_up_cleaning,
          audio_files: act.audioTracks,
        }
        await updatePerformerAct(act.actId, application.access_token, actData)
      }

      // 3. Uppdatera Event Performer Details (Inklusive travel_covered)
      const eventFromRelation = Array.isArray(application.events)
        ? application.events[0]
        : application.events
      const actualEventId = application.event_id || eventFromRelation?.id

      if (actualEventId && application.performer_id) {
        const logisticsData: EventPerformerDetailsInput = {
          dietary_requirements: formData.dietary_requirements,
          travel_receipts: receiptFiles,
          plus_one_name: formData.plus_one_name,
          plus_one_email: formData.plus_one_email,
          travel_covered: Number(formData.travel_covered) || 0,
        }
        await updateEventPerformerDetails(
          actualEventId,
          application.performer_id,
          application.access_token,
          logisticsData
        )
      }

      // Only now, after the DB has been updated successfully, actually remove any
      // files the artist deleted during this edit — see removeTrack/removeReceiptFile.
      if (pendingDeletePaths.length > 0) {
        const { error } = await supabase.storage.from('artist-files').remove(pendingDeletePaths)
        if (error) console.error('Kunde inte radera fil(er) från storage:', error)
        setPendingDeletePaths([])
      }

      setIsDirty(false)
      toast.success(t('Informationen har sparats!', 'Information saved successfully!'))
      if (onSaveSuccess) onSaveSuccess()
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte spara informationen', 'Failed to save information'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="gold-divider" />

      <p className="subtitle">
        {t(
          'Här kan du se och uppdatera information inför eventet, såsom din artist promo, låtar för din akt och logistik. Du kan komma tillbaka till denna länk när som helst.',
          'Here you can see and update your information for the event, like your promo, tracks for your act and logistics. You can return to this link anytime.'
        )}
      </p>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ===SEKTION 1: ARTIST PROMO === */}
        <div className="login-card space-y-6">
          <div className="flex items-center gap-2 text-lg font-bold text-accent border-b border-border/50 pb-3 justify-center">
            <h2>{t('Artist Promo', 'Artist Promo')}</h2>
          </div>
          <p className="text-sm text-foreground/90">
            {t(
              'Används för eventpromo och din artistprofil i vårt "Hall of Fame"',
              'Used for event promo and your artist profile in our "Hall of Fame"'
            )}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
            <div className="form-field md:col-span-4 flex flex-col h-full">
              <label className="form-label-block">{t('Promobild', 'Promo Image')}</label>
              <div className="relative flex-1 flex flex-col items-center justify-center border border-accent/20 rounded-lg p-2 bg-background/30 min-h-[220px]">
                {application.promo_image_id ? (
                  <CloudinaryImage
                    publicId={application.promo_image_id}
                    width={400}
                    height={400}
                    fit
                    className="max-h-full max-w-full object-contain rounded"
                  />
                ) : (
                  <span className="text-xs text-foreground/50">
                    {t('Ingen bild tillgänglig', 'No image available')}
                  </span>
                )}
              </div>
            </div>

            <div className="md:col-span-8 flex flex-col gap-4">
              <div className="form-field flex-1 flex flex-col">
                <label className="form-label-gold text-xs block mb-1">
                  {t('Promo text (Svenska)', 'Promo text (Swedish)')}
                </label>
                <textarea
                  name="bio_sv"
                  placeholder={t(
                    'Din presentationstext på svenska...',
                    'Your presentation in Swedish...'
                  )}
                  value={formData.bio_sv}
                  onChange={handleChange}
                  className="login-input flex-1 w-full resize-none p-3 min-h-[100px] text-sm"
                />
              </div>

              <div className="form-field flex-1 flex flex-col">
                <label className="form-label-gold text-xs block mb-1">
                  {t('Promo text (Engelska)', 'Promo text (English)')}
                </label>
                <textarea
                  name="bio_eng"
                  placeholder={t(
                    'Din presentationstext på engelska...',
                    'Your presentation in English...'
                  )}
                  value={formData.bio_eng}
                  onChange={handleChange}
                  className="login-input flex-1 w-full resize-none p-3 min-h-[100px] text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ================= SEKTION 2: ACT DETAILS ================= */}
        <div className="login-card space-y-6">
          <div className="flex items-center gap-2 text-lg font-bold text-accent border-b border-border/50 pb-3 justify-center">
            <h2>{t('Act Details', 'Act Details')}</h2>
          </div>

          {actsFormData.length > 1 && (
            <div className="flex flex-wrap gap-1.5 -mt-2">
              {actsFormData.map((act, index) => (
                <button
                  type="button"
                  key={act.key}
                  onClick={() => handleSelectAct(index)}
                  className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                    index === activeActIndex
                      ? 'bg-accent/20 border-accent text-accent font-semibold'
                      : 'bg-black/30 border-accent/20 text-foreground/70 hover:border-accent/50'
                  }`}
                >
                  {act.label || t('Namnlös akt', 'Untitled act')}
                </button>
              ))}
            </div>
          )}

          <div className="form-field">
            <label className="form-label-block text-xs">
              {t('Aktens Namn / Act Name', 'Act Name')}
            </label>
            <input
              type="text"
              name="act_name"
              placeholder={t('T.ex. Fire Spectacular', 'e.g. Fire Spectacular')}
              value={activeAct?.act_name ?? ''}
              onChange={handleActFieldChange}
              className="login-input"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-field">
              <label className="form-label-gold text-xs block mb-1">
                {t('Aktbeskrivning (Svenska)', 'Act Description (Swedish)')}
              </label>
              <textarea
                name="act_description_sv"
                rows={3}
                placeholder={t('Beskriv din akt på svenska...', 'Describe your act in Swedish...')}
                value={activeAct?.act_description_sv ?? ''}
                onChange={handleActFieldChange}
                className="login-input text-sm resize-none"
              />
            </div>

            <div className="form-field">
              <label className="form-label-gold text-xs block mb-1">
                {t('Aktbeskrivning (Engelska)', 'Act Description (English)')}
              </label>
              <textarea
                name="act_description_eng"
                rows={3}
                placeholder={t('Beskriv din akt på engelska...', 'Describe your act in English...')}
                value={activeAct?.act_description_eng ?? ''}
                onChange={handleActFieldChange}
                className="login-input text-sm resize-none"
              />
            </div>
          </div>

          {/* MUSIC */}
          <div className="space-y-4 border-t border-border/40 pt-4">
            <label className="form-label-block text-xs font-bold text-accent">
              {t('Låtar för akten', 'Act Songs & Audio Tracks')}
            </label>

            <div className="p-4 rounded-lg border border-accent/30 bg-accent/5 space-y-3">
              <span className="text-xs font-semibold text-foreground/80 block">
                {t('Lägg till låt', 'Add new song')}
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder={t('Låttitel (t.ex. Feeling Good)', 'Track Title')}
                  value={newTrackTitle}
                  onChange={(e) => setNewTrackTitle(e.target.value)}
                  className="login-input text-xs"
                />
                <input
                  type="text"
                  placeholder={t('Låtartist / Kompositör (t.ex. Nina Simone)', 'Track Artist')}
                  value={newTrackArtist}
                  onChange={(e) => setNewTrackArtist(e.target.value)}
                  className="login-input text-xs"
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <label
                    htmlFor="temp-audio-up"
                    className="btn-gold-outline text-xs py-1.5 px-3 cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    {uploadingAudio ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload size={14} />
                    )}
                    {newTrackFile
                      ? t('Byt ljudfil', 'Change audio file')
                      : t('Välj ljudfil (valfritt)', 'Select audio file (optional)')}
                  </label>
                  <input
                    type="file"
                    id="temp-audio-up"
                    className="hidden"
                    accept="audio/*"
                    onChange={handleTempAudioUpload}
                  />
                  {newTrackFile && (
                    <span className="text-xs text-accent truncate min-w-0">
                      ✓ {newTrackFile.name}
                    </span>
                  )}
                </div>

                {(() => {
                  const canAddTrack = Boolean(newTrackTitle.trim() && newTrackArtist.trim())
                  return (
                    <button
                      type="button"
                      onClick={handleAddTrack}
                      disabled={!canAddTrack}
                      className={`text-xs py-1.5 px-4 flex items-center gap-1.5 shrink-0 rounded-lg ${
                        canAddTrack ? 'btn-gold btn-gold-glow-active' : 'btn-gold-inactive'
                      }`}
                    >
                      <Plus size={14} />
                      {t('Lägg till låt i akten', 'Add song to act')}
                    </button>
                  )
                })()}
              </div>

              {(() => {
                const hasTitle = Boolean(newTrackTitle.trim())
                const hasArtist = Boolean(newTrackArtist.trim())
                if (hasTitle && hasArtist) {
                  return (
                    <p className="text-[11px] text-accent/90 italic">
                      {t(
                        'Klart? Glöm inte att trycka "Lägg till låt i akten" — annars sparas den inte.',
                        'Ready? Don\'t forget to press "Add song to act" — otherwise it won\'t be saved.'
                      )}
                    </p>
                  )
                }
                if (hasTitle || hasArtist || newTrackFile) {
                  return (
                    <p className="text-[11px] text-foreground/60 italic">
                      {t(
                        'Låttitel och artist krävs för att kunna lägga till låten.',
                        'Track title and artist are both required to add the song.'
                      )}
                    </p>
                  )
                }
                return null
              })()}
            </div>

            {/* Lista över sparade låtar */}
            {(activeAct?.audioTracks.length ?? 0) > 0 ? (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-medium text-foreground/70 block">
                  {t('Tillagda låtar:', 'Added tracks:')}
                </span>
                {(activeAct?.audioTracks ?? []).map((track, idx) => (
                  <div
                    key={track.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-background/40"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                      <Music className="w-4 h-4 text-accent shrink-0" />
                      <div className="min-w-0 flex-1 flex flex-col items-start">
                        <p className="text-xs font-semibold text-foreground truncate w-full text-left">
                          {idx + 1}. {track.title || t('Namnlös låt', 'Untitled track')}
                          {track.artist ? ` - ${track.artist}` : ''}
                        </p>
                        {track.fileName && (
                          <p className="text-[10px] text-accent truncate w-full text-left">
                            Fil: {track.fileName}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {track.fileUrl && (
                        <a
                          href={track.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-md border border-border hover:border-accent text-foreground/80 hover:text-accent transition-colors"
                          title={t('Lyssna/Öppna', 'Listen/Open')}
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => removeTrack(track.id)}
                        className="p-1.5 rounded-md border border-destructive/30 hover:bg-destructive/20 text-destructive transition-colors"
                        title={t('Ta bort', 'Remove')}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-foreground/50 italic pt-1">
                {t('Inga låtar tillagda ännu.', 'No songs added yet.')}
              </p>
            )}
          </div>

          {/* SCENFÄLT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border/40 pt-4">
            <div className="form-field">
              <label className="form-label-block text-xs">
                {t('Scen förberedelser', 'Stage preparations')}
              </label>
              <textarea
                name="stage_preparations"
                rows={3}
                placeholder={t(
                  'T.ex. Starting off stage. Needs someone to give a push onto stage...',
                  'e.g. Starting off stage. Needs someone to give a push onto stage...'
                )}
                value={activeAct?.stage_preparations ?? ''}
                onChange={handleActFieldChange}
                className="login-input text-sm resize-none"
              />
            </div>

            <div className="form-field">
              <label className="form-label-block text-xs">
                {t('Plock / städ', 'Pick up / cleaning')}
              </label>
              <textarea
                name="pick_up_cleaning"
                rows={3}
                placeholder={t(
                  'T.ex. Hat, 2 sleeves, skirt. Take down balloon between breaks...',
                  'e.g. Hat, 2 sleeves, skirt. Take down balloon between breaks...'
                )}
                value={activeAct?.pick_up_cleaning ?? ''}
                onChange={handleActFieldChange}
                className="login-input text-sm resize-none"
              />
            </div>
          </div>

          <div className="form-field">
            <label className="form-label-block text-xs">
              {t('Övriga noteringar (Ljud, ljus & scenkrav)', 'Sound, Lighting & General Notes')}
            </label>
            <textarea
              name="act_notes"
              rows={3}
              placeholder={t(
                'T.ex. Önskar dämpat ljus vid start, mikrofonbehov m.m.',
                'e.g. Soft lighting at start, microphone requirements, etc.'
              )}
              value={activeAct?.act_notes ?? ''}
              onChange={handleActFieldChange}
              className="login-input text-sm resize-none"
            />
          </div>
        </div>

        {/* ================= SEKTION 3: LOGISTIK ================= */}
        <div className="login-card space-y-6">
          <div className="flex items-center gap-2 text-lg font-bold text-accent border-b border-border/50 pb-3 justify-center">
            <h2>{t('Logistik', 'Logistics')}</h2>
          </div>

          <div className="form-field">
            <label className="form-label-block text-xs">
              {t('Matpreferenser & Allergier', 'Dietary Requirements')}
            </label>
            <input
              type="text"
              name="dietary_requirements"
              placeholder={t('T.ex. Vegetarian, nötallergi...', 'e.g. Vegetarian, nut allergy...')}
              value={formData.dietary_requirements}
              onChange={handleChange}
              className="login-input"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border/40 pt-4">
            <div className="form-field">
              <label className="form-label-block text-xs">
                {t('Plus One Namn', 'Plus One Name')}
              </label>
              <input
                type="text"
                name="plus_one_name"
                placeholder={t('T.ex. Anna Karlsson', 'e.g. Anna Karlsson')}
                value={formData.plus_one_name}
                onChange={handleChange}
                className="login-input"
              />
            </div>
            <div className="form-field">
              <label className="form-label-block text-xs">
                {t('Plus One mail', 'Plus One Email')}
              </label>
              <input
                type="text"
                name="plus_one_email"
                placeholder={t('T.ex. anna.karlsson@example.com', 'e.g. anna.karlsson@example.com')}
                value={formData.plus_one_email}
                onChange={handleChange}
                className="login-input"
              />
            </div>
          </div>

          {(application.needs_travel_costs || (application.travel_cost_amount ?? 0) > 0) && (
            <div className="form-field border-t border-border/40 pt-4 space-y-3">
              <div className="form-field">
                <label className="form-label-block text-xs">
                  {t('Slutliga reseräkning', 'Final Travel Reimbursement')}
                </label>
                <input
                  type="number"
                  name="travel_covered"
                  placeholder={
                    application.travel_cost_amount
                      ? t(
                          `Uppskattat ca ${application.travel_cost_amount}`,
                          `Estimated ~${application.travel_cost_amount}`
                        )
                      : t('T.ex. 500', 'e.g. 500')
                  }
                  value={formData.travel_covered}
                  onChange={handleChange}
                  className="login-input"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="form-label-block text-xs">
                  {t('Resekvitton (PDF/Bild)', 'Travel Receipts (PDF/Image)')}
                </label>
                <label
                  htmlFor="receipt-up-multi"
                  className="btn-gold-outline text-xs py-1.5 px-3 cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  {uploadingReceipt ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus size={14} />
                  )}
                  {t('Ladda upp kvitto(n)', 'Upload receipt(s)')}
                </label>
                <input
                  type="file"
                  id="receipt-up-multi"
                  className="hidden"
                  accept="image/*,.pdf"
                  multiple
                  onChange={handleReceiptUpload}
                />
              </div>

              {receiptFiles.length > 0 ? (
                <div className="space-y-2">
                  {receiptFiles.map((receipt, idx) => (
                    <div
                      key={receipt.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-accent/40 bg-accent/10"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                        <FileText className="w-5 h-5 text-accent shrink-0" />
                        <div className="min-w-0 flex-1 flex flex-col items-start">
                          <p className="text-xs font-semibold text-foreground truncate w-full text-left">
                            {idx + 1}. {receipt.name}
                          </p>
                          <p className="text-[10px] text-accent font-medium text-left">
                            ✓ Kvitto bifogat
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={receipt.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-md border border-border hover:border-accent text-foreground/80 hover:text-accent transition-colors"
                          title={t('Öppna kvitto', 'Open receipt')}
                        >
                          <ExternalLink size={14} />
                        </a>
                        <button
                          type="button"
                          onClick={() => removeReceiptFile(receipt.id)}
                          className="p-1.5 rounded-md border border-destructive/30 hover:bg-destructive/20 text-destructive transition-colors"
                          title={t('Ta bort', 'Remove')}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-foreground/50 italic pt-1">
                  {t('Inga kvitton uppladdade ännu.', 'No receipts uploaded yet.')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ================= SEKTION 4: ÖVERENSKOMMET GAGE (READ-ONLY) =================
            Fee comes from proposed_fee (fixed at offer time, not editable here — no fee
            field exists in this form). Travel reads formData.travel_covered live, since
            that IS the editable "final reimbursement" field just above, so this summary
            stays in sync as the artist fills it in.

            Three states, not two — travel being *part of the offer* (needs_travel_costs)
            and travel having a *settled amount* (travel_covered, filled in by the artist
            once they actually know it) are different things. Real case that caught this:
            an artist offered travel reimbursement, not yet booked her trip, saw nothing
            about travel at all here — the "no travel" and "travel not decided yet" states
            looked identical. Now: no line when travel isn't part of the offer at all; a
            firm "+ Travel: X SEK" + "= Total" once she's entered a real figure; and, in
            between, a "+ Travel costs: TBD (~offered estimate)" placeholder with no "="
            line — a real total shouldn't be stated until travel actually has a number. */}
        {(() => {
          const proposedFee = Number(application.proposed_fee) || 0
          const travelCovered = Number(formData.travel_covered) || 0
          const needsTravel = application.needs_travel_costs || false
          const offeredTravelEstimate = Number(application.travel_cost_amount) || 0
          const actCount = actsFormData.length
          const roleLabel =
            application.lineup_role === 'host'
              ? 'Host'
              : application.lineup_role === 'headliner'
                ? 'Headliner'
                : null

          return (
            <div className="login-card space-y-3">
              <div className="flex items-center gap-2 text-lg font-bold text-accent border-b border-border/50 pb-3 justify-center">
                <h2>{t('Överenskommet Gage', 'Agreed Compensation')}</h2>
              </div>
              <div className="text-sm text-foreground space-y-1.5 font-mono">
                <p>
                  {proposedFee} SEK
                  {actCount > 1 && ` ${t('för', 'for')} ${actCount} ${t('akter', 'acts')}`}
                </p>
                {needsTravel && travelCovered > 0 && (
                  <>
                    <p>
                      + {t('Reseersättning', 'Travel Reimbursement')}: {travelCovered} SEK
                    </p>
                    <p className="text-accent font-bold pt-1.5 border-t border-border/30">
                      = {t('Totalt', 'Total')}: {proposedFee + travelCovered} SEK
                    </p>
                  </>
                )}
                {needsTravel && travelCovered === 0 && (
                  <p className="text-foreground/60 italic">
                    +{' '}
                    {t(
                      `Reseersättning tillkommer (uppskattat ca ${offeredTravelEstimate} SEK) — fyll i den slutliga summan ovan när den är klar`,
                      `Travel reimbursement to be added (estimated ~${offeredTravelEstimate} SEK) — fill in the final amount above once known`
                    )}
                  </p>
                )}
                {roleLabel && (
                  <p className="pt-1.5 border-t border-border/30 flex items-center justify-center gap-1.5 text-center">
                    {application.lineup_role === 'host' ? (
                      <Mic2 className="w-3.5 h-3.5 text-accent" />
                    ) : (
                      <Crown className="w-3.5 h-3.5 text-accent" />
                    )}
                    {t('Roll', 'Role')}: <span className="text-accent font-bold">{roleLabel}</span>
                  </p>
                )}
              </div>
            </div>
          )
        })()}

        {/* SPARA-FÄLT — fast position längst ner i skärmen medan man scrollar genom
            formuläret; landar i sitt normala flödesläge så fort formulärets sanna slut
            (markerat av formEndRef) syns, så den aldrig hamnar ovanpå sidfoten. */}
        <div ref={formEndRef}>
          {!reachedFormEnd && <div style={{ height: saveBarHeight }} />}
          <div
            ref={saveBarRef}
            className={
              reachedFormEnd
                ? 'z-40 border-t border-accent/30 bg-background/95 backdrop-blur-sm px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.35)]'
                : 'fixed bottom-0 left-0 right-0 z-40 border-t border-accent/30 bg-background/95 backdrop-blur-sm px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.35)]'
            }
          >
            <div className="max-w-2xl mx-auto flex items-center justify-end gap-3">
              {isDirty && !submitting && (
                <span className="text-xs text-accent/90 italic mr-auto">
                  {t('Osparade ändringar', 'Unsaved changes')}
                </span>
              )}
              <button
                type="submit"
                disabled={submitting || !isDirty}
                className={`flex items-center gap-2 py-3 px-6 text-sm font-semibold rounded-lg ${
                  isDirty ? 'btn-gold btn-gold-glow-active' : 'btn-gold-inactive'
                }`}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
                {t('Spara information', 'Save Information')}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
