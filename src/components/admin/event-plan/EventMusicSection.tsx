import { useState } from 'react'
import { Save } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'

interface EventMusicSectionProps {
  // Before the show and between the acts.
  prePartyPlaylist: string | null
  afterpartyPlaylist: string | null
  onSavePrePartyPlaylist: (value: string) => Promise<void>
  onSaveAfterpartyPlaylist: (value: string) => Promise<void>
}

interface PlaylistFieldProps {
  label: string
  hint?: string
  value: string | null
  onSave: (value: string) => Promise<void>
}

// One save-on-click playlist input — shared by both slots below so the input/save/toast wiring
// exists in exactly one place.
const PlaylistField = ({ label, hint, value, onSave }: PlaylistFieldProps) => {
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
      <span className="block uppercase tracking-wider text-[10px] text-accent/50 font-semibold">
        {label}
        {hint && (
          <span className="ml-1.5 normal-case tracking-normal text-foreground/40">{hint}</span>
        )}
      </span>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('Länk till spellista...', 'Link to playlist...')}
          className="flex-1 h-9 text-sm bg-black/40 border border-accent/20 rounded px-2 text-foreground focus:border-accent"
        />
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

// The evening's two playlists on one row: the pre-party list (before the show and between the
// acts) and the after-party list. A booked DJ can cover the afterparty instead of a playlist —
// the DJ is added in the staff list below, next to "Övrigt".
export const EventMusicSection = ({
  prePartyPlaylist,
  afterpartyPlaylist,
  onSavePrePartyPlaylist,
  onSaveAfterpartyPlaylist,
}: EventMusicSectionProps) => {
  const { t } = useLanguage()

  return (
    <div className="space-y-3 pt-2">
      <h5 className="font-decorative text-base text-foreground/80 border-b border-accent/10 pb-2">
        {t('Musik', 'Music')}
      </h5>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <PlaylistField
          label={t('Pre-party', 'Pre-party')}
          hint={t('före showen & mellan akterna', 'before the show & between acts')}
          value={prePartyPlaylist}
          onSave={onSavePrePartyPlaylist}
        />
        <PlaylistField
          label={t('After-party', 'After-party')}
          value={afterpartyPlaylist}
          onSave={onSaveAfterpartyPlaylist}
        />
      </div>
    </div>
  )
}
