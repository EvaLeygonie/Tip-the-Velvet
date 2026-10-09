import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  GripVertical,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  updatePerformerActNotes,
  updateShowSegmentTitle,
  deleteManualShowSegment,
} from '@/services/eventService'
import { parseActTracks, trackFileUrl } from '@/lib/actMusic'
import type { AdminEventActRow } from '@/services/eventService'
import { useConfirm } from '@/contexts/ConfirmContext'

interface ShowProgramRowProps {
  row: AdminEventActRow
  position: number
  isFirst: boolean
  isLast: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onRemoved: (id: string) => void
  onUpdated: (id: string, patch: Partial<AdminEventActRow>) => void
}

// One segment in the running order — a real submitted act (performer set, act_name is
// artist-owned and read-only here) or a manual/constant segment (performer: null, its title
// is the board's own text and editable). Both share the same 3 note fields
// (stage_preparations/pick_up_cleaning/act_notes). Reorderable two ways: the drag handle
// (ShowProgramBoard.tsx owns the drag-and-drop context this row is sortable within, and is
// the only way to move a segment across the Set 1/2 divide) and the up/down arrows
// (a same-set-only nudge, re-added per direct feedback 2026-09-21 as a reliable fallback
// since drag-and-drop alone was fiddly to land precisely).
export const ShowProgramRow = ({
  row,
  position,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onRemoved,
  onUpdated,
}: ShowProgramRowProps) => {
  const { t } = useLanguage()
  const confirm = useConfirm()
  const isManual = row.performer === null
  const isConstant = row.is_constant
  // The two costume-competition constants are board appearances specifically (the
  // thank-you bow isn't) — "Board" used to be baked into the title itself
  // ("Board: Presentera kostymtävlingen"), moved down into the subtitle instead so the
  // title reads clean and "Board" sits next to "Fast moment"/"Constant segment" where the
  // rest of the row's metadata already lives. Direct feedback 2026-09-22.
  const isBoardSegment =
    row.constant_key === 'costume_intro' || row.constant_key === 'costume_winners'

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  const tracks = parseActTracks(row.audio_files)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [draft, setDraft] = useState({
    title: row.act_name,
    stage_preparations: row.stage_preparations ?? '',
    pick_up_cleaning: row.pick_up_cleaning ?? '',
    act_notes: row.act_notes ?? '',
    // Manual/constant rows have no artist submitting music, so the board fills in one song
    // here (e.g. what plays to call everyone back on stage). Real acts show the artist's own
    // submitted tracks read-only instead.
    music_artist: tracks[0]?.artist ?? '',
    music_title: tracks[0]?.title ?? '',
  })

  // A real act's own notes being empty is worth flagging (the artist hasn't filled them in
  // yet) — a manual/constant segment's being empty is normal, most need no prep at all, so
  // it never counts as "missing". Direct feedback 2026-09-21, matches the same carve-out on
  // the Dashboard's "Scenanteckningar" card.
  const hasNotes = row.stage_preparations || row.pick_up_cleaning || row.act_notes

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const musicArtist = draft.music_artist.trim()
      const musicTitle = draft.music_title.trim()
      // Only manual rows edit music here; the first track is the one these two fields map to,
      // any further tracks are left as they were.
      const audioFilesPatch = isManual
        ? {
            audio_files: [
              ...(musicArtist || musicTitle
                ? [
                    {
                      ...tracks[0],
                      id: tracks[0]?.id ?? `track-${crypto.randomUUID()}`,
                      title: musicTitle,
                      artist: musicArtist,
                    },
                  ]
                : []),
              ...tracks.slice(1),
            ] as unknown as AdminEventActRow['audio_files'],
          }
        : {}
      const patch = {
        stage_preparations: draft.stage_preparations.trim() || null,
        pick_up_cleaning: draft.pick_up_cleaning.trim() || null,
        act_notes: draft.act_notes.trim() || null,
        ...audioFilesPatch,
      }
      await updatePerformerActNotes(row.id, patch)
      let titlePatch: Partial<AdminEventActRow> = {}
      if (isManual) {
        const title = draft.title.trim()
        if (title !== row.act_name) {
          await updateShowSegmentTitle(row.id, title)
          titlePatch = { act_name: title }
        }
      }
      onUpdated(row.id, { ...patch, ...titlePatch })
      toast.success(t('Sparat!', 'Saved!'))
      setIsExpanded(false)
    } catch (err) {
      toast.error(t('Kunde inte spara.', 'Could not save.'))
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    const confirmed = await confirm({
      message: t('Ta bort det här momentet?', 'Remove this segment?'),
      destructive: true,
    })
    if (!confirmed) return
    setIsDeleting(true)
    try {
      await deleteManualShowSegment(row.id)
      onRemoved(row.id)
      toast.success(t('Borttaget.', 'Removed.'))
    } catch (err) {
      toast.error(t('Kunde inte ta bort.', 'Could not remove.'))
      console.error(err)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`admin-panel velvet-surface transition-all duration-300 overflow-hidden cursor-pointer ${
        // Board appearances, fixed moments and custom segments get a gold tint so they read
        // apart from the artists' acts at a glance.
        isManual ? 'bg-accent/[0.05] border-accent/20' : ''
      }`}
    >
      <div className="p-3 flex items-center gap-3" onClick={() => setIsExpanded(!isExpanded)}>
        <span className="text-xs font-mono text-accent/60 shrink-0 w-5 text-center">
          {position}
        </span>
        <button
          type="button"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          title={t('Dra för att flytta (även mellan set)', 'Drag to move (also between sets)')}
          className="text-accent/40 hover:text-accent cursor-grab active:cursor-grabbing shrink-0 touch-none"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex flex-col shrink-0 -my-1">
          <button
            type="button"
            disabled={isFirst}
            onClick={(e) => {
              e.stopPropagation()
              onMoveUp()
            }}
            title={t('Flytta upp', 'Move up')}
            className="text-accent/50 hover:text-accent disabled:opacity-20 disabled:hover:text-accent/50"
          >
            <ChevronsUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={isLast}
            onClick={(e) => {
              e.stopPropagation()
              onMoveDown()
            }}
            title={t('Flytta ner', 'Move down')}
            className="text-accent/50 hover:text-accent disabled:opacity-20 disabled:hover:text-accent/50"
          >
            <ChevronsDown className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-decorative text-sm text-foreground truncate">
            {row.act_name || t('(Namnlöst moment)', '(Untitled segment)')}
          </div>
          {isManual ? (
            <div className="text-xs text-accent/50 italic truncate">
              {isConstant
                ? isBoardSegment
                  ? t('Board - Fast moment', 'Board - Constant segment')
                  : t('Fast moment', 'Constant segment')
                : t('Eget moment', 'Custom segment')}
            </div>
          ) : (
            <div className="text-xs text-foreground/50 truncate">
              {row.performer?.performer_name}
            </div>
          )}
        </div>
        {!isManual && !hasNotes && !isExpanded && (
          <span className="text-[10px] font-body font-semibold text-amber-400/80 border border-amber-400/30 rounded-full px-1.5 py-0.5 shrink-0">
            {t('Inga scenanteckningar', 'No stage notes')}
          </span>
        )}
        {/* Music is only mandatory for real acts — a custom/board row without a song is fine. */}
        {!isManual && tracks.length === 0 && !isExpanded && (
          <span className="text-[10px] font-body font-semibold text-amber-400/80 border border-amber-400/30 rounded-full px-1.5 py-0.5 shrink-0">
            {t('Ingen musik', 'No music')}
          </span>
        )}
        <div className="text-accent/50 shrink-0">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      {isExpanded && (
        <div
          className="border-t border-accent/10 bg-black/20 p-4 space-y-3 cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          {isManual && (
            <div className="space-y-1">
              <label className="form-label-gold block">{t('Titel', 'Title')}</label>
              <input
                type="text"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder={t('T.ex. Värdens sångnummer', "E.g. the host's song number")}
                className="w-full h-9 text-sm bg-black/40 border border-accent/20 rounded px-2 focus:border-accent text-white"
              />
            </div>
          )}
          {isManual ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="form-label-gold block">
                  {t('Musik: artist', 'Music: artist')}
                </label>
                <input
                  type="text"
                  value={draft.music_artist}
                  onChange={(e) => setDraft({ ...draft, music_artist: e.target.value })}
                  className="w-full h-9 text-sm bg-black/40 border border-accent/20 rounded px-2 focus:border-accent text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="form-label-gold block">{t('Musik: låt', 'Music: track')}</label>
                <input
                  type="text"
                  value={draft.music_title}
                  onChange={(e) => setDraft({ ...draft, music_title: e.target.value })}
                  className="w-full h-9 text-sm bg-black/40 border border-accent/20 rounded px-2 focus:border-accent text-white"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="form-label-gold block">{t('Musik', 'Music')}</label>
              {tracks.length === 0 ? (
                <p className="text-sm text-foreground/40 italic">
                  {t(
                    'Artisten har inte angett någon musik än.',
                    'The artist has not given any music yet.'
                  )}
                </p>
              ) : (
                <ul className="text-sm text-foreground/80 space-y-0.5">
                  {tracks.map((track) => {
                    const url = trackFileUrl(track)
                    return (
                      <li key={track.id}>
                        {track.title} — {track.artist}
                        {url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-xs text-accent hover:underline"
                          >
                            {t('Fil', 'File')}
                          </a>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}
          <div className="space-y-1">
            <label className="form-label-gold block">
              {t('Scenförberedelser', 'Stage preparations')}
            </label>
            <textarea
              value={draft.stage_preparations}
              onChange={(e) => setDraft({ ...draft, stage_preparations: e.target.value })}
              className="w-full min-h-[60px] text-sm bg-black/40 border border-accent/20 font-sans p-2 leading-relaxed rounded resize-y focus:border-accent text-white"
            />
          </div>
          <div className="space-y-1">
            <label className="form-label-gold block">
              {t('Plockning/städning', 'Pick up / cleaning')}
            </label>
            <textarea
              value={draft.pick_up_cleaning}
              onChange={(e) => setDraft({ ...draft, pick_up_cleaning: e.target.value })}
              className="w-full min-h-[60px] text-sm bg-black/40 border border-accent/20 font-sans p-2 leading-relaxed rounded resize-y focus:border-accent text-white"
            />
          </div>
          <div className="space-y-1">
            <label className="form-label-gold block">
              {t('Ljud & ljus (till tekniker)', 'Sound & light (for technician)')}
            </label>
            <textarea
              value={draft.act_notes}
              onChange={(e) => setDraft({ ...draft, act_notes: e.target.value })}
              className="w-full min-h-[60px] text-sm bg-black/40 border border-accent/20 font-sans p-2 leading-relaxed rounded resize-y focus:border-accent text-white"
            />
          </div>
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-accent/10">
            {isManual && !isConstant ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="btn-red text-xs py-2 px-4"
              >
                {t('Ta bort', 'Remove')}
              </button>
            ) : (
              <div />
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="btn-gold text-xs py-2 px-4 flex items-center gap-1.5"
            >
              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t('Spara', 'Save')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
