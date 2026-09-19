import { useState } from 'react'
import { Save } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { EventStaffRow } from './EventStaffRow'
import { InlineAddPicker, type InlineAddPickerItem } from './InlineAddPicker'
import type { AdminEventStaffRow } from '@/services/eventService'

interface EventMusicSectionProps {
  djRows: AdminEventStaffRow[]
  eventId: string
  beforePlaylist: string | null
  intermissionPlaylist: string | null
  afterpartyPlaylist: string | null
  onRemoved: (id: string) => void
  onUpdated: (id: string, patch: Partial<AdminEventStaffRow>) => void
  onSaveBeforePlaylist: (value: string) => Promise<void>
  onSaveIntermissionPlaylist: (value: string) => Promise<void>
  onSaveAfterpartyPlaylist: (value: string) => Promise<void>
  fetchDjCandidates: () => Promise<InlineAddPickerItem[]>
  onAddDj: (item: InlineAddPickerItem) => Promise<void>
}

interface PlaylistFieldProps {
  label?: string
  value: string | null
  onSave: (value: string) => Promise<void>
}

// One save-on-click playlist input — shared by all three slots below so the input/save/toast
// wiring exists in exactly one place.
const PlaylistField = ({ label, value, onSave }: PlaylistFieldProps) => {
  const { t } = useLanguage()
  const [draft, setDraft] = useState(value ?? '')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(draft)
      toast.success(t('Spellista sparad!', 'Playlist saved!'))
    } catch (err) {
      toast.error(t('Kunde inte spara spellistan.', 'Could not save the playlist.'))
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-1.5">
      {label && (
        <span className="block uppercase tracking-wider text-[10px] text-accent/50 font-semibold">
          {label}
        </span>
      )}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('Länk till spellista...', 'Link to playlist...')}
          className="flex-1 h-9 text-sm bg-black/40 border border-accent/20 rounded px-2 text-foreground focus:border-accent"
        />
        {/* A plain small icon button, not btn-gold — that class's min-h-[44px]/glow/hover-
            scale is built for standalone actions and looked oversized and clumsy stacked
            next to a compact playlist input. Direct feedback 2026-09-21. */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="h-9 w-9 shrink-0 rounded border border-accent/20 bg-accent/10 text-accent flex items-center justify-center transition-colors hover:bg-accent hover:text-black disabled:opacity-50"
          title={t('Spara spellista', 'Save playlist')}
        >
          <Save className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

// Music for the whole evening in one place — before doors, the intermission between acts, and
// the afterparty — rather than scattered across tabs. The afterparty slot sits next to a
// single DJ slot, since that's the one moment a human DJ can also cover (see
// StaffingCoverageStrip's "DJ" card, which treats either a booked DJ or a saved playlist here
// as coverage). Pulled out of the regular role-grouped list (which only renders a section when
// it has confirmed rows) into its own always-visible section, since the playlist fields need
// to be reachable even with 0 DJs assigned. Originally "Afterparty"-only, direct request
// 2026-09-02; widened to all three slots per direct request 2026-09-19; laid out as 2x2 (two
// playlists per row) with the DJ as a single sponsor-style slot instead of a header "+" picker,
// direct feedback 2026-09-21 — the wide single-column layout wasted the extra page width the
// admin pages just gained.
export const EventMusicSection = ({
  djRows,
  eventId,
  beforePlaylist,
  intermissionPlaylist,
  afterpartyPlaylist,
  onRemoved,
  onUpdated,
  onSaveBeforePlaylist,
  onSaveIntermissionPlaylist,
  onSaveAfterpartyPlaylist,
  fetchDjCandidates,
  onAddDj,
}: EventMusicSectionProps) => {
  const { t } = useLanguage()

  return (
    <div className="space-y-3 pt-2">
      <h5 className="font-decorative text-base text-foreground/80 border-b border-accent/10 pb-2">
        {t('Musik', 'Music')}
      </h5>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <PlaylistField
          label={t('Före showen', 'Before the show')}
          value={beforePlaylist}
          onSave={onSaveBeforePlaylist}
        />
        <PlaylistField
          label={t('Mellanakt', 'Intermission')}
          value={intermissionPlaylist}
          onSave={onSaveIntermissionPlaylist}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <PlaylistField
          label={t('Efterfest', 'Afterparty')}
          value={afterpartyPlaylist}
          onSave={onSaveAfterpartyPlaylist}
        />

        <div className="space-y-1.5">
          <span className="block uppercase tracking-wider text-[10px] text-accent/50 font-semibold">
            {t('DJ', 'DJ')}
          </span>
          {djRows.length > 0 ? (
            <div className="space-y-2">
              {djRows.map((row) => (
                <EventStaffRow
                  key={row.id}
                  row={row}
                  eventId={eventId}
                  onRemoved={onRemoved}
                  onUpdated={onUpdated}
                />
              ))}
            </div>
          ) : (
            <InlineAddPicker
              fetchItems={fetchDjCandidates}
              onSelect={onAddDj}
              placeholder={t('Sök kontakt...', 'Search contacts...')}
              emptyMessage={t('Inga fler kontakter att lägga till.', 'No more contacts to add.')}
              renderTrigger={(onOpen) => (
                <button
                  type="button"
                  onClick={onOpen}
                  className="w-full h-9 border border-dashed border-accent/15 rounded flex items-center justify-center text-xs text-foreground/30 italic hover:border-accent/40 hover:text-accent/60 transition-colors"
                >
                  {t('Tom plats — lägg till DJ', 'Empty slot — add DJ')}
                </button>
              )}
            />
          )}
        </div>
      </div>
    </div>
  )
}
