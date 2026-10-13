import { Loader2 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface ContactRowFooterProps {
  isNew?: boolean
  isSaving: boolean
  onSave: () => void
  onDelete: () => void
  onCancelNew?: () => void
}

// Delete on the left; Cancel (new rows only) and Save on the right — same in every Contacts row.
export const ContactRowFooter = ({
  isNew = false,
  isSaving,
  onSave,
  onDelete,
  onCancelNew,
}: ContactRowFooterProps) => {
  const { t } = useLanguage()
  return (
    <div className="flex items-center justify-between gap-3 pt-2 border-t border-accent/10">
      {!isNew ? (
        <button type="button" onClick={onDelete} className="btn-red text-xs py-2 px-4">
          {t('Radera', 'Delete')}
        </button>
      ) : (
        <div />
      )}
      <div className="flex items-center gap-2">
        {isNew && onCancelNew && (
          <button
            type="button"
            onClick={onCancelNew}
            className="px-4 py-2 text-xs border border-accent/20 rounded text-foreground/70 hover:bg-white/5 transition-colors"
          >
            {t('Avbryt', 'Cancel')}
          </button>
        )}
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="btn-gold text-xs py-2 px-4 flex items-center gap-1.5"
        >
          {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {t('Spara', 'Save')}
        </button>
      </div>
    </div>
  )
}
