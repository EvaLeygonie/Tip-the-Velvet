import { createPortal } from 'react-dom'
import { Mail } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import type { CastingApplicationWithActs } from '@/types/types'

interface CastingMailModalProps {
  application: CastingApplicationWithActs
  // The offer terms printed in the mail (only shown for "yes").
  offerFee: number
  travelFormatted: string
  accomFormatted: string
  subject: string
  onSubjectChange: (value: string) => void
  body: string
  onBodyChange: (value: string) => void
  isSending: boolean
  onSend: () => void
  onClose: () => void
}

// Draft-and-send dialog for the offer / decline / follow-up email to an applicant.
export const CastingMailModal = ({
  application,
  offerFee,
  travelFormatted,
  accomFormatted,
  subject,
  onSubjectChange,
  body,
  onBodyChange,
  isSending,
  onSend,
  onClose,
}: CastingMailModalProps) => {
  const { t } = useLanguage()
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 text-left"
      onClick={() => onClose()}
    >
      <div
        className="velvet-surface border border-accent/30 max-w-lg w-full p-6 space-y-4 rounded-lg shadow-2xl relative"
        style={{ backgroundColor: '#141111' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h4 className="font-decorative text-lg text-accent text-center">
            {application.review_status === 'yes'
              ? t('Förbered erbjudande-länk', 'Prepare offer link')
              : application.review_status === 'maybe'
                ? t('Förbered intressemail', 'Prepare follow-up email')
                : t('Förbered svarsmail', 'Prepare reply email')}
          </h4>
          <p className="text-xs text-muted-foreground text-center">
            {t('Mottagare:', 'Recipient:')}{' '}
            <span className="text-foreground font-mono">{application.email}</span> (
            {application.performer_name})
          </p>
        </div>

        {application.review_status === 'yes' && (
          <div className="p-3 bg-black/40 border border-accent/20 rounded text-xs space-y-1 text-foreground/80 font-mono">
            <div className="text-gold font-bold uppercase">
              {t('Villkor som medföljer i mailet:', 'Terms included in mail:')}
            </div>
            <div>
              • {t('Gage:', 'Fee:')} {offerFee} SEK
            </div>
            <div>
              • {t('Resersättning:', 'Travel:')} {travelFormatted}
            </div>
            <div>
              • {t('Boende:', 'Accommodation:')} {accomFormatted}
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[11px] uppercase tracking-wider text-gold font-mono block">
            {t('Ämnesrad', 'Subject')}
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            className="velvet-field"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] uppercase tracking-wider text-gold font-mono block">
            {t('Mailtext', 'Email Text')}
          </label>
          <textarea
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            className="velvet-textarea h-44 resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-accent/10">
          <button
            type="button"
            onClick={() => onClose()}
            className="px-4 py-2 text-xs border border-accent/20 rounded text-foreground/70 hover:bg-white/5 transition-colors"
            disabled={isSending}
          >
            {t('Avbryt', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={onSend}
            className="btn-gold text-xs py-2 px-4 flex items-center gap-1.5"
            disabled={isSending}
          >
            <Mail className="h-3.5 w-3.5" />
            {isSending ? t('Skickar...', 'Sending...') : t('Skicka mail', 'Send email')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
