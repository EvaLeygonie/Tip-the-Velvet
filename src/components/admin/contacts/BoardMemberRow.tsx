import { useState } from 'react'
import { ChevronDown, ChevronUp, Mail, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import type { StaffVolunteers } from '@/types/types'

interface BoardMemberRowProps {
  row: StaffVolunteers
  onSave: (id: string, patch: Partial<StaffVolunteers>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onEmail: (row: StaffVolunteers) => void
}

// A trimmed-down StaffVolunteerRow.tsx — same open-to-edit shape and the same underlying
// staff_volunteers row, but without the fields that don't apply to a fixed, always-'board'
// row: no role picker (role is always 'board'), no link, no "has worked with us before"
// (that's about vetting new volunteers, not the board). Direct feedback 2026-09-22: keep
// name/email/phone/fee (board members do get a yearly bonus) and role_details as a free
// notes field. No per-event confirmation status either — board members aren't booked onto
// individual shows the way staff/volunteers are.
export const BoardMemberRow = ({ row, onSave, onDelete, onEmail }: BoardMemberRowProps) => {
  const { t } = useLanguage()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [draft, setDraft] = useState({
    name: row.name,
    email: row.email ?? '',
    phone: row.phone ?? '',
    fee: row.fee != null ? String(row.fee) : '',
    role_details: row.role_details ?? '',
  })

  const handleSave = async () => {
    if (!draft.name.trim()) {
      toast.error(t('Namn krävs.', 'Name is required.'))
      return
    }
    setIsSaving(true)
    try {
      await onSave(row.id, {
        name: draft.name.trim(),
        email: draft.email.trim() || null,
        phone: draft.phone.trim() || null,
        fee: draft.fee === '' ? null : Number(draft.fee),
        role_details: draft.role_details.trim() || null,
      })
      setIsExpanded(false)
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte spara.', 'Could not save.'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    const confirmed = window.confirm(
      t(
        `Är du säker på att du vill radera ${row.name}?`,
        `Are you sure you want to delete ${row.name}?`
      )
    )
    if (!confirmed) return
    try {
      await onDelete(row.id)
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte radera.', 'Could not delete.'))
    }
  }

  return (
    <div
      className="admin-panel velvet-surface transition-all duration-300 overflow-hidden cursor-pointer"
      style={{ padding: 0 }}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div className="grid grid-cols-12 gap-4 items-center flex-1 min-w-0">
          <div className="col-span-8 sm:col-span-5 flex items-center gap-3 min-w-0">
            <div className="text-accent/50 shrink-0">
              {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
            <div className="truncate">
              <div className="font-decorative text-base text-foreground tracking-wide truncate">
                {row.name || t('(Namnlös)', '(Unnamed)')}
              </div>
              {row.role_details && (
                <div className="text-accent italic text-xs font-heading truncate">
                  {row.role_details}
                </div>
              )}
            </div>
          </div>

          <div className="col-span-4 sm:col-span-2 text-sm text-foreground/60 font-body">
            <span className="block uppercase tracking-wider text-[10px] text-accent/50 font-semibold mb-0.5">
              {t('Arvode', 'Fee')}
            </span>
            <span className="block">{row.fee != null ? `${row.fee} SEK` : '—'}</span>
          </div>

          <div className="col-span-6 sm:col-span-3 text-sm text-foreground/60 font-body truncate">
            <span className="block uppercase tracking-wider text-[10px] text-accent/50 font-semibold mb-0.5">
              {t('E-post', 'Email')}
            </span>
            <span className="truncate block">{row.email || '—'}</span>
          </div>

          <div className="col-span-6 sm:col-span-2 text-sm text-foreground/60 font-body truncate">
            <span className="block uppercase tracking-wider text-[10px] text-accent/50 font-semibold mb-0.5">
              {t('Telefon', 'Phone')}
            </span>
            <span className="truncate block">{row.phone || '—'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (row.email) onEmail(row)
            }}
            disabled={!row.email}
            className="p-2 border rounded-md transition-colors shrink-0 bg-accent/10 border-accent/20 text-accent hover:bg-accent hover:text-black disabled:opacity-30 disabled:pointer-events-none"
            title={row.email ? t('Skicka mail', 'Send email') : undefined}
          >
            <Mail className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div
          className="border-t border-accent/10 bg-black/20 p-6 space-y-4 text-left cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="form-label-gold block">{t('Namn', 'Name')}</label>
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="w-full h-9 text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="form-label-gold block">{t('E-post', 'Email')}</label>
              <input
                type="email"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                className="w-full h-9 text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="form-label-gold block">{t('Telefon', 'Phone')}</label>
              <input
                type="text"
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                className="w-full h-9 text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="form-label-gold block">{t('Arvode (SEK)', 'Fee (SEK)')}</label>
              <input
                type="number"
                value={draft.fee}
                onChange={(e) => setDraft({ ...draft, fee: e.target.value })}
                className="w-full h-9 text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="form-label-gold block">{t('Anteckning', 'Note')}</label>
              <textarea
                value={draft.role_details}
                onChange={(e) => setDraft({ ...draft, role_details: e.target.value })}
                className="w-full h-20 text-sm bg-black/40 border border-accent/20 font-sans p-2 leading-relaxed rounded resize-none focus:border-accent text-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-accent/10">
            <button type="button" onClick={handleDelete} className="btn-red text-xs py-2 px-4">
              {t('Radera', 'Delete')}
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
