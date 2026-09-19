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
          className="flex-1 h-10 text-sm bg-black/40 border border-accent/20 rounded px-2 text-foreground focus:border-accent"
        />
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn-gold !w-10 h-10 aspect-square p-0 flex items-center justify-center shrink-0"
          title={t('Spara spellista', 'Save playlist')}
        >
          <Save className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// Music for the whole evening in one place — before doors, the intermission between acts, and
// the afterparty — rather than scattered across tabs. The afterparty slot keeps its DJ roster
// grouped underneath it specifically, since that's the one slot a human DJ can also cover (see
// StaffingCoverageStrip's "DJ" card, which treats either a booked DJ or a saved playlist here
// as coverage). Pulled out of the regular role-grouped list (which only renders a section when
// it has confirmed rows) into its own always-visible section, since the playlist fields need
// to be reachable even with 0 DJs assigned. Originally "Afterparty"-only, direct request
// 2026-09-02; widened to all three slots per direct request 2026-09-19.
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

      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between">
          <span className="block uppercase tracking-wider text-[10px] text-accent/50 font-semibold">
            {t('Efterfest (länk eller "DJ")', 'Afterparty (link or "DJ")')}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full border bg-accent/10 border-accent/30 text-accent">
              {djRows.length}
            </span>
            <InlineAddPicker
              fetchItems={fetchDjCandidates}
              onSelect={onAddDj}
              placeholder={t('Sök kontakt...', 'Search contacts...')}
              emptyMessage={t('Inga fler kontakter att lägga till.', 'No more contacts to add.')}
            />
          </div>
        </div>
        <PlaylistField value={afterpartyPlaylist} onSave={onSaveAfterpartyPlaylist} />
      </div>

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
        <p className="text-xs text-foreground/40 italic pt-1">
          {t(
            'Ingen DJ tillagd — lägg till via Kontakter om en behövs.',
            'No DJ added — add one via Contacts if one is needed.'
          )}
        </p>
      )}
    </div>
  )
}
