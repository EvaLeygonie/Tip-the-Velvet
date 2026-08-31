import { useState } from 'react'
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { staffRoleLabel } from '@/lib/contactLabels'
import { updateEventStaffRoleDetails, removeStaffFromEvent } from '@/services/contactsService'
import type { AdminEventStaffRow } from '@/services/eventService'

interface EventStaffRowProps {
  row: AdminEventStaffRow
  eventId: string
  onRemoved: (id: string) => void
  onUpdated: (id: string, roleDetails: string | null) => void
}

// Event Planning's operational view of one confirmed assignment — editing the logistics
// note and removing them from this event. Everything else about the contact (name/email/
// which roles they hold) is still only editable via Contacts.
export const EventStaffRow = ({ row, eventId, onRemoved, onUpdated }: EventStaffRowProps) => {
  const { t } = useLanguage()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [draft, setDraft] = useState(row.role_details ?? '')

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const value = draft.trim() || null
      await updateEventStaffRoleDetails(row.id, value)
      onUpdated(row.id, value)
      toast.success(t('Sparat!', 'Saved!'))
      setIsExpanded(false)
    } catch (err) {
      toast.error(t('Kunde inte spara.', 'Could not save.'))
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemove = async () => {
    const confirmed = window.confirm(
      t(
        `Ta bort ${row.staff.name} från eventet?`,
        `Remove ${row.staff.name} from the event?`
      )
    )
    if (!confirmed) return
    try {
      await removeStaffFromEvent(eventId, row.staff.id, row.role)
      onRemoved(row.id)
      toast.success(t('Borttagen från eventet.', 'Removed from the event.'))
    } catch (err) {
      toast.error(t('Kunde inte ta bort.', 'Could not remove.'))
      console.error(err)
    }
  }

  return (
    <div
      className="admin-panel velvet-surface transition-all duration-300 overflow-hidden cursor-pointer"
      style={{ padding: 0 }}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="p-3 flex items-center gap-3">
        <div className="text-accent/50 shrink-0">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
        <span className="font-decorative text-sm text-foreground flex-1 min-w-0 truncate">
          {row.staff.name}
        </span>
        <span className="text-accent italic text-xs font-heading shrink-0">
          {staffRoleLabel(t, row.role)}
        </span>
        {row.role_details && !isExpanded && (
          <span className="text-xs text-foreground/50 italic truncate max-w-[180px] shrink-0 hidden sm:block">
            {row.role_details}
          </span>
        )}
      </div>

      {isExpanded && (
        <div
          className="border-t border-accent/10 bg-black/20 p-4 space-y-3 cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-1">
            <label className="form-label-gold block">{t('Anteckning', 'Note')}</label>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full min-h-[70px] text-sm bg-black/40 border border-accent/20 font-sans p-2 leading-relaxed rounded resize-y focus:border-accent text-white"
            />
          </div>
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-accent/10">
            <button type="button" onClick={handleRemove} className="btn-red text-xs py-2 px-4">
              {t('Ta bort från event', 'Remove from event')}
            </button>
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
