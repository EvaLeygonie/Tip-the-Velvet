import { createPortal } from 'react-dom'
import { TriangleAlert, Loader2 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface CancelBookingModalProps {
  performerName: string
  isCancelling: boolean
  onConfirm: () => void
  onClose: () => void
}

// Last-chance confirmation before removing an already-confirmed artist from the show.
export const CancelBookingModal = ({
  performerName,
  isCancelling,
  onConfirm,
  onClose,
}: CancelBookingModalProps) => {
  const { t } = useLanguage()
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 text-left"
      onClick={() => !isCancelling && onClose()}
    >
      <div
        className="velvet-surface border border-red-600/40 max-w-md w-full p-6 space-y-4 rounded-lg shadow-2xl relative"
        style={{ backgroundColor: '#141111' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 justify-center text-red-400">
          <TriangleAlert className="h-5 w-5" />
          <h4 className="font-decorative text-lg text-center">
            {t('Ta bort artist från showen?', 'Remove artist from the show?')}
          </h4>
        </div>
        <p className="text-sm text-foreground/80 text-center">
          {t(
            `${performerName} har redan bekräftat sin plats. Att fortsätta tar bort dem från bokningen permanent — deras plats i lineupen och akter för det här eventet raderas. Om det var en helt ny artistprofil (ingen historik vid andra event) raderas den också.`,
            `${performerName} has already confirmed their spot. Continuing will permanently remove them from the booking — their lineup slot and acts for this event will be deleted. If their profile was brand new (no history at other events), it will be deleted too.`
          )}
        </p>
        <p className="text-xs text-foreground/50 text-center italic">
          {t('Detta går inte att ångra.', 'This cannot be undone.')}
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs border border-accent/20 rounded text-foreground/70 hover:bg-white/5 transition-colors"
            disabled={isCancelling}
          >
            {t('Avbryt', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="text-xs py-2 px-4 flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-60"
            disabled={isCancelling}
          >
            {isCancelling ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <TriangleAlert className="h-3.5 w-3.5" />
            )}
            {isCancelling
              ? t('Tar bort...', 'Removing...')
              : t('Ja, ta bort artisten', 'Yes, remove artist')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
