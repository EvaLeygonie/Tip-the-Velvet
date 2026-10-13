import React, { useEffect, useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useConfirm } from '@/contexts/ConfirmContext'
import { toast } from 'sonner'
import type { CastingApplicationPortalData, DietaryCategory } from '@/types/types'
import { uploadStorageFile, uploadStorageFileWithProgress } from '@/services/databaseService'
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
import {
  isAudioTrackItemArray,
  isReceiptItemArray,
  type ActFormState,
  type AudioTrackItem,
  type BookedFormData,
  type FormChangeEvent,
  type PendingTrackFile,
  type ReceiptItem,
} from './booked-artist/types'
import { PromoSection } from './booked-artist/PromoSection'
import { ActMusicEditor } from './booked-artist/ActMusicEditor'
import { LogisticsSection } from './booked-artist/LogisticsSection'
import { AgreedCompensationCard } from './booked-artist/AgreedCompensationCard'
import { FormSaveBar } from './booked-artist/FormSaveBar'

export type { AudioTrackItem, ReceiptItem } from './booked-artist/types'

interface BookedArtistFormProps {
  application: CastingApplicationPortalData
  onSaveSuccess?: () => void
}

const NOTHING_TO_ADD = 'N/A'

export const BookedArtistForm: React.FC<BookedArtistFormProps> = ({
  application,
  onSaveSuccess,
}) => {
  const confirm = useConfirm()
  const { t } = useLanguage()

  const [submitting, setSubmitting] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  // Storage paths staged for deletion — only actually removed from the bucket once
  // the form is saved, so an accidental "x" click can't lose a file for good.
  const [pendingDeletePaths, setPendingDeletePaths] = useState<string[]>([])

  const [uploadingAudio, setUploadingAudio] = useState(false)
  // 0–1 while an audio file is uploading; the status area shows it as a percentage.
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadingReceipt, setUploadingReceipt] = useState(false)

  const [newTrackTitle, setNewTrackTitle] = useState('')
  const [newTrackArtist, setNewTrackArtist] = useState('')
  const [attachingTrackId, setAttachingTrackId] = useState<string | null>(null)
  const [newTrackFile, setNewTrackFile] = useState<PendingTrackFile | null>(null)

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

  const [formData, setFormData] = useState<BookedFormData>(() => {
    const perfData = application.performers
    const logisticsData = application.event_performers

    return {
      // Sektion 1: Artist Promo
      bio_sv: perfData?.bio_sv ?? (isEng ? '' : application.promo_text || ''),
      bio_eng: perfData?.bio_eng ?? (isEng ? application.promo_text || '' : ''),

      // Sektion 3: Logistik
      dietary_requirements: logisticsData?.dietary_requirements ?? '',
      dietary_category: (logisticsData?.dietary_category ?? '') as DietaryCategory | '',
      plus_one_name: logisticsData?.plus_one_name ?? '',
      plus_one_email: logisticsData?.plus_one_email ?? '',
      plus_one_needs_accommodation: logisticsData?.plus_one_needs_accommodation ?? false,
      // Defaults to the negotiated estimate, not 0 — the number input showed a bare "0"
      // (the placeholder only shows the estimate, it doesn't fill the value), so saving the
      // form for an unrelated reason (dietary info, plus-one, etc.) without ever touching
      // this field silently locked in "$0 travel reimbursement" as if it were deliberate.
      // Real case: Luminous Starling's agreed 1000 SEK got recorded as 0 this way. Direct
      // feedback 2026-09-22.
      travel_covered: logisticsData?.travel_covered ?? application.travel_cost_amount ?? 0,
      travels_by_car: logisticsData?.travels_by_car ?? false,
      artist_note: logisticsData?.artist_note ?? '',
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

  const handleChange = (e: FormChangeEvent) => {
    const { name, value, type } = e.target
    const nextValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    setFormData((prev) => ({ ...prev, [name]: nextValue }))
    setIsDirty(true)
  }

  // Same as handleChange, but writes into the currently active act's block instead of
  // the shared formData — act fields are per-act (Phase 9 of multi-act-casting-plan.md).
  // "Nothing to add" writes N/A into both stage fields so the board's dashboard counts the
  // act as done (it only checks that one of them is filled in). Only offered while both
  // fields are blank or already N/A — once there's real text, the act is done anyway.
  const stageFieldValues = [activeAct?.stage_preparations ?? '', activeAct?.pick_up_cleaning ?? '']
  const canMarkNothingToAdd = stageFieldValues.every((v) => v === '' || v === NOTHING_TO_ADD)
  const nothingToAdd = stageFieldValues.every((v) => v === NOTHING_TO_ADD)
  const handleNothingToAddChange = (checked: boolean) => {
    const value = checked ? NOTHING_TO_ADD : ''
    setActsFormData((prev) =>
      prev.map((act, idx) =>
        idx === activeActIndex
          ? { ...act, stage_preparations: value, pick_up_cleaning: value }
          : act
      )
    )
  }

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
      // Replacing a file that was never added to the act: the old upload would be orphaned.
      if (newTrackFile) await removeStoredFile(newTrackFile.path)
      const folderPath = getStorageFolderPath('audio-tracks')
      setUploadProgress(0)
      const rawPath = await uploadStorageFileWithProgress(
        'artist-files',
        folderPath,
        file,
        setUploadProgress
      )
      const publicUrl = getPublicFileUrl(rawPath)

      setNewTrackFile({
        name: file.name,
        url: publicUrl,
        path: rawPath,
      })
      // The file is already in storage but not yet part of the act — warn on leaving.
      setIsDirty(true)
      toast.success(
        t(
          'Ljudfilen är uppladdad! Fyll i låttitel och artist och spara formuläret.',
          'Audio file uploaded! Fill in the song title and artist and save the form.'
        ),
        { duration: 7000 }
      )
    } catch (err) {
      console.error(err)
      toast.error(
        t(
          'Kunde inte ladda upp ljudfilen just nu – servern var upptagen. Vänta en stund och försök igen.',
          'Could not upload the audio file right now – the server was busy. Wait a moment and try again.'
        )
      )
    } finally {
      setUploadingAudio(false)
      e.target.value = ''
    }
  }

  const handleAddTrack = () => {
    if (!newTrackTitle.trim() || !newTrackArtist.trim() || !newTrackFile) return

    const newTrack: AudioTrackItem = {
      id: `track-${Date.now()}`,
      title: newTrackTitle.trim(),
      artist: newTrackArtist.trim(),
      fileName: newTrackFile.name,
      fileUrl: newTrackFile.url,
      filePath: newTrackFile.path,
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

  // A just-uploaded file that isn't part of any song yet can simply be deleted again.
  const removeStoredFile = async (path: string) => {
    try {
      await supabase.storage.from('artist-files').remove([path])
    } catch (err) {
      console.error(err)
    }
  }

  const removePendingFile = async () => {
    if (!newTrackFile) return
    await removeStoredFile(newTrackFile.path)
    setNewTrackFile(null)
  }

  const patchActiveTrack = (trackId: string, patch: Partial<AudioTrackItem>) => {
    setActsFormData((prev) =>
      prev.map((act, idx) =>
        idx === activeActIndex
          ? {
              ...act,
              audioTracks: act.audioTracks.map((track) =>
                track.id === trackId ? { ...track, ...patch } : track
              ),
            }
          : act
      )
    )
    setIsDirty(true)
  }

  // Upload a file straight onto a song that was added without one.
  const handleAttachFile = async (trackId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAttachingTrackId(trackId)
    try {
      setUploadProgress(0)
      const rawPath = await uploadStorageFileWithProgress(
        'artist-files',
        getStorageFolderPath('audio-tracks'),
        file,
        setUploadProgress
      )
      patchActiveTrack(trackId, {
        fileName: file.name,
        fileUrl: getPublicFileUrl(rawPath),
        filePath: rawPath,
      })
      toast.success(
        t(
          'Ljudfilen är kopplad till låten. Glöm inte att spara formuläret.',
          "The audio file is attached to the song. Don't forget to save the form."
        )
      )
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte ladda upp ljudfilen.', 'Could not upload audio file.'))
    } finally {
      setAttachingTrackId(null)
      e.target.value = ''
    }
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

    // A song that is filled in but was never added to the act would be lost on save: ask. A
    // half-filled one is stopped, so it isn't silently dropped either.
    let actsToSave = actsFormData
    const pendingStarted = Boolean(newTrackTitle.trim() || newTrackArtist.trim() || newTrackFile)
    if (pendingStarted) {
      if (!newTrackTitle.trim() || !newTrackArtist.trim() || !newTrackFile) {
        toast.error(
          !newTrackFile
            ? t(
                'Ladda upp ljudfilen för låten (krävs), eller töm låtfälten.',
                'Upload the audio file for the song (required), or clear the song fields.'
              )
            : t(
                'Fyll i både låttitel och artist för låten.',
                'Fill in both the song title and artist for the song.'
              ),
          { duration: 9000 }
        )
        return
      }
      const addIt = await confirm({
        message: t(
          `Du har fyllt i låten "${newTrackTitle.trim()}" men inte lagt till den i akten. Lägga till den och spara?`,
          `You have filled in the song "${newTrackTitle.trim()}" but not added it to the act. Add it and save?`
        ),
        confirmLabel: t('Lägg till och spara', 'Add and save'),
        cancelLabel: t('Tillbaka', 'Go back'),
      })
      if (!addIt) return
      const pendingTrack: AudioTrackItem = {
        id: `track-${Date.now()}`,
        title: newTrackTitle.trim(),
        artist: newTrackArtist.trim(),
        fileName: newTrackFile.name,
        fileUrl: newTrackFile.url,
        filePath: newTrackFile.path,
      }
      actsToSave = actsFormData.map((act, idx) =>
        idx === activeActIndex ? { ...act, audioTracks: [...act.audioTracks, pendingTrack] } : act
      )
      setActsFormData(actsToSave)
      setNewTrackTitle('')
      setNewTrackArtist('')
      setNewTrackFile(null)
    }

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
      for (const act of actsToSave) {
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
          dietary_category: formData.dietary_category || null,
          travel_receipts: receiptFiles,
          plus_one_name: formData.plus_one_name,
          plus_one_email: formData.plus_one_email,
          plus_one_needs_accommodation: formData.plus_one_needs_accommodation,
          travel_covered: Number(formData.travel_covered) || 0,
          travels_by_car: formData.travels_by_car,
          artist_note: formData.artist_note,
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
          'Här kan du se och uppdatera information inför eventet. Du kan komma tillbaka till denna länk när som helst.',
          'Here you can see and update your information for the event. You can return to this link anytime.'
        )}
      </p>

      <form onSubmit={handleSubmit} className="space-y-8">
        <PromoSection application={application} formData={formData} onChange={handleChange} />

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

          <ActMusicEditor
            tracks={activeAct?.audioTracks ?? []}
            newTrackTitle={newTrackTitle}
            newTrackArtist={newTrackArtist}
            newTrackFile={newTrackFile}
            onTitleChange={(value) => {
              setNewTrackTitle(value)
              setIsDirty(true)
            }}
            onArtistChange={(value) => {
              setNewTrackArtist(value)
              setIsDirty(true)
            }}
            uploadingAudio={uploadingAudio}
            attachingTrackId={attachingTrackId}
            uploadProgress={uploadProgress}
            onPendingUpload={handleTempAudioUpload}
            onRemovePendingFile={removePendingFile}
            onAddTrack={handleAddTrack}
            onAttachFile={handleAttachFile}
            onRemoveTrack={removeTrack}
          />

          {/* SCENFÄLT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border/40 pt-4">
            {canMarkNothingToAdd && (
              <label className="md:col-span-2 flex items-center gap-2 text-sm text-foreground/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={nothingToAdd}
                  onChange={(e) => handleNothingToAddChange(e.target.checked)}
                  className="h-4 w-4 accent-accent"
                />
                {t(
                  'Jag har inget att lägga till här (fyller i N/A)',
                  'I have nothing to add here (fills in N/A)'
                )}
              </label>
            )}
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

        <LogisticsSection
          application={application}
          formData={formData}
          onChange={handleChange}
          receiptFiles={receiptFiles}
          uploadingReceipt={uploadingReceipt}
          onReceiptUpload={handleReceiptUpload}
          onRemoveReceipt={removeReceiptFile}
        />

        <AgreedCompensationCard
          application={application}
          travelCovered={formData.travel_covered}
          actCount={actsFormData.length}
        />

        <FormSaveBar isDirty={isDirty} submitting={submitting} />
      </form>
    </div>
  )
}
