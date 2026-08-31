import { useState } from 'react'
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { formatOtherLink } from '@/lib/utils'
import type { Club } from '@/types/types'

interface ClubRowProps {
  row: Club
  isNew?: boolean
  onSave: (id: string, patch: Partial<Club>, isNew: boolean) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onCancelNew?: (id: string) => void
  // True when at least one sponsor row is linked back to this club (sponsors.club_id) —
  // see admin-portal-roadmap.md's clubs design: a club that also sponsors gets its own
  // sponsor row rather than being duplicated, so this is just a "yes, both" indicator.
  isLinkedSponsor?: boolean
}

export const ClubRow = ({
  row,
  isNew = false,
  onSave,
  onDelete,
  onCancelNew,
  isLinkedSponsor,
}: ClubRowProps) => {
  const { t } = useLanguage()
  const [isExpanded, setIsExpanded] = useState(isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [draft, setDraft] = useState({
    name: row.name,
    organizers: row.organizers ?? '',
    instagram_link: row.instagram_link ?? '',
    website: row.website ?? '',
    location: row.location ?? '',
    region: row.region ?? '',
    notes: row.notes ?? '',
  })

  const handleSave = async () => {
    if (!draft.name.trim()) {
      toast.error(t('Namn krävs.', 'Name is required.'))
      return
    }
    setIsSaving(true)
    try {
      await onSave(
        row.id,
        {
          name: draft.name.trim(),
          organizers: draft.organizers.trim() || null,
          instagram_link: draft.instagram_link.trim() || null,
          website: draft.website.trim() ? formatOtherLink(draft.website.trim()) : null,
          location: draft.location.trim() || null,
          region: draft.region.trim() || null,
          notes: draft.notes.trim() || null,
        },
        isNew
      )
      if (!isNew) setIsExpanded(false)
    } catch (err: unknown) {
      toast.error(t('Kunde inte spara.', 'Could not save.'))
      console.error(err)
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
    } catch (err: unknown) {
      const dbError = err as { code?: string }
      if (dbError?.code === '23503') {
        toast.error(
          t(
            'Kan inte radera — klubben är kopplad till en sponsor.',
            "Can't delete — this club is still linked to a sponsor."
          )
        )
      } else {
        toast.error(t('Kunde inte radera.', 'Could not delete.'))
        console.error(err)
      }
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
          <div className="col-span-12 sm:col-span-4 flex items-center gap-3 min-w-0">
            <div className="text-accent/50 shrink-0">
              {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
            <div className="truncate">
              <div className="font-decorative text-base text-foreground tracking-wide truncate flex items-center gap-1.5">
                <span className="truncate">{row.name || t('(Namnlös)', '(Unnamed)')}</span>
                {isLinkedSponsor && (
                  <span className="shrink-0 not-italic font-body font-semibold text-[10px] text-green-400">
                    {t('Sponsrar oss', 'Also sponsors us')}
                  </span>
                )}
              </div>
              {row.region && (
                <div className="text-accent italic text-xs font-heading truncate">{row.region}</div>
              )}
            </div>
          </div>

          <div className="col-span-6 sm:col-span-4 text-sm text-foreground/60 font-body truncate">
            <span className="block uppercase tracking-wider text-[10px] text-accent/50 font-semibold mb-0.5">
              {t('Arrangörer', 'Organizers')}
            </span>
            <span className="truncate block">{row.organizers || '—'}</span>
          </div>

          <div className="col-span-6 sm:col-span-4 text-sm text-foreground/60 font-body truncate">
            <span className="block uppercase tracking-wider text-[10px] text-accent/50 font-semibold mb-0.5">
              {t('Plats', 'Location')}
            </span>
            <span className="truncate block">{row.location || '—'}</span>
          </div>
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
              <label className="form-label-gold block">{t('Arrangörer', 'Organizers')}</label>
              <input
                type="text"
                value={draft.organizers}
                onChange={(e) => setDraft({ ...draft, organizers: e.target.value })}
                className="w-full h-9 text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="form-label-gold block">Instagram</label>
              <input
                type="text"
                placeholder="https://instagram.com/..."
                value={draft.instagram_link}
                onChange={(e) => setDraft({ ...draft, instagram_link: e.target.value })}
                className="w-full h-9 text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="form-label-gold block">{t('Webbsida', 'Website')}</label>
              <input
                type="text"
                placeholder="https://..."
                value={draft.website}
                onChange={(e) => setDraft({ ...draft, website: e.target.value })}
                className="w-full h-9 text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="form-label-gold block">{t('Plats', 'Location')}</label>
              <input
                type="text"
                value={draft.location}
                onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                className="w-full h-9 text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="form-label-gold block">{t('Region', 'Region')}</label>
              <input
                type="text"
                placeholder={t('t.ex. Sverige, Norden', 'e.g. Sweden, Nordic')}
                value={draft.region}
                onChange={(e) => setDraft({ ...draft, region: e.target.value })}
                className="w-full h-9 text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="form-label-gold block">{t('Anteckningar', 'Notes')}</label>
            <textarea
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              className="w-full h-20 text-sm bg-black/40 border border-accent/20 font-sans p-2 leading-relaxed rounded resize-none focus:border-accent text-white"
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-accent/10">
            {!isNew ? (
              <button type="button" onClick={handleDelete} className="btn-red text-xs py-2 px-4">
                {t('Radera', 'Delete')}
              </button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              {isNew && onCancelNew && (
                <button
                  type="button"
                  onClick={() => onCancelNew(row.id)}
                  className="px-4 py-2 text-xs border border-accent/20 rounded text-foreground/70 hover:bg-white/5 transition-colors"
                >
                  {t('Avbryt', 'Cancel')}
                </button>
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
        </div>
      )}
    </div>
  )
}
