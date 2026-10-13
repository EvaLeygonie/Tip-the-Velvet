import { useState } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { sendAdminEmail } from '@/services/emailService'
import type { MailDefaults } from '@/lib/mailDefaults'

export interface MailRecipient {
  email: string
  name: string
  language: 'sv' | 'eng'
}

interface GroupMailModalProps {
  title: string
  recipients: MailRecipient[]
  defaults: MailDefaults
  onClose: () => void
}

const inputClass = 'velvet-input'

// One editable email per language to a whole group; each recipient gets the version in their
// own saved language.
export const GroupMailModal = ({ title, recipients, defaults, onClose }: GroupMailModalProps) => {
  const { t } = useLanguage()
  const [sending, setSending] = useState(false)
  const [subjectSv, setSubjectSv] = useState(defaults.subjectSv)
  const [subjectEng, setSubjectEng] = useState(defaults.subjectEng)
  const [bodySv, setBodySv] = useState(defaults.bodySv)
  const [bodyEng, setBodyEng] = useState(defaults.bodyEng)

  const handleSend = async () => {
    setSending(true)
    try {
      const results = await Promise.all(
        recipients.map((r) => {
          const sv = r.language === 'sv'
          return sendAdminEmail({
            to: r.email,
            name: r.name,
            subject: sv ? subjectSv : subjectEng,
            bodyText: sv ? bodySv : bodyEng,
            language: sv ? 'sv' : 'en',
            fromName: 'Tip the Velvet',
            greeting: sv ? 'Hej!' : 'Hey!',
          })
        })
      )
      const failed = results.filter((r) => !r.ok).length
      if (failed === 0) {
        toast.success(t('Mailet är skickat!', 'Email sent!'))
        onClose()
      } else {
        toast.error(
          t(
            `${failed} av ${recipients.length} mail kunde inte skickas.`,
            `${failed} of ${recipients.length} emails could not be sent.`
          )
        )
      }
    } finally {
      setSending(false)
    }
  }

  const textareaClass = 'velvet-field'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
      <div className="admin-panel velvet-surface bg-background w-full max-w-3xl p-5 space-y-3 max-h-[90vh] overflow-y-auto">
        <h4 className="font-decorative text-lg text-accent text-center">
          {title} ({recipients.length})
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="form-label-gold block">
              {t('Ämne (svenska)', 'Subject (Swedish)')}
            </span>
            <input
              value={subjectSv}
              onChange={(e) => setSubjectSv(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="space-y-1">
            <span className="form-label-gold block">
              {t('Ämne (engelska)', 'Subject (English)')}
            </span>
            <input
              value={subjectEng}
              onChange={(e) => setSubjectEng(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="space-y-1">
            <span className="form-label-gold block">{t('Text (svenska)', 'Text (Swedish)')}</span>
            <textarea
              rows={9}
              value={bodySv}
              onChange={(e) => setBodySv(e.target.value)}
              className={textareaClass}
            />
          </label>
          <label className="space-y-1">
            <span className="form-label-gold block">{t('Text (engelska)', 'Text (English)')}</span>
            <textarea
              rows={9}
              value={bodyEng}
              onChange={(e) => setBodyEng(e.target.value)}
              className={textareaClass}
            />
          </label>
        </div>
        <p className="text-xs text-foreground/50">
          {t(
            'Varje mottagare får mailet på sitt sparade språk.',
            'Each recipient gets the email in their saved language.'
          )}
        </p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-gold-outline text-xs py-2 px-4">
            {t('Avbryt', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending}
            className="btn-gold text-xs py-2 px-4"
          >
            {sending ? t('Skickar…', 'Sending…') : t('Skicka', 'Send')}
          </button>
        </div>
      </div>
    </div>
  )
}
