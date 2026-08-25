import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'

interface ContactMailModalProps {
  isOpen: boolean
  onClose: () => void
  recipientName: string
  recipientEmail: string
  defaultSubject: string
  defaultBody: string
}

export const ContactMailModal = ({
  isOpen,
  onClose,
  recipientName,
  recipientEmail,
  defaultSubject,
  defaultBody,
}: ContactMailModalProps) => {
  const { t } = useLanguage()
  const [subject, setSubject] = useState(defaultSubject)
  const [body, setBody] = useState(defaultBody)
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    const resetDraft = () => {
      if (isOpen) {
        setSubject(defaultSubject)
        setBody(defaultBody)
      }
    }
    resetDraft()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const handleSend = async () => {
    setIsSending(true)
    try {
      const response = await fetch('/api/send-casting-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientEmail,
          name: recipientName,
          subject,
          bodyText: body,
          language: 'sv',
          fromName: 'Tip the Velvet',
        }),
      })
      if (!response.ok) throw new Error('Failed to send')
      toast.success(t('Mail skickat!', 'Email sent!'))
      onClose()
    } catch (err) {
      console.error('Kunde inte skicka mail:', err)
      toast.error(t('Kunde inte skicka mail.', 'Could not send email.'))
    } finally {
      setIsSending(false)
    }
  }

  if (!isOpen || typeof window === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 text-left"
      onClick={onClose}
    >
      <div
        className="velvet-surface border border-accent/30 max-w-lg w-full p-6 space-y-4 rounded-lg shadow-2xl relative"
        style={{ backgroundColor: '#141111' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h4 className="font-decorative text-lg text-accent text-center">
            {t('Skicka mail', 'Send email')}
          </h4>
          <p className="text-xs text-muted-foreground text-center">
            {t('Till', 'To')}: {recipientName} ({recipientEmail})
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono block">
            {t('Ämnesrad', 'Subject')}
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono block">
            {t('Mailtext', 'Email Text')}
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full h-40 text-sm bg-black/40 border border-accent/20 font-sans p-2 leading-relaxed rounded resize-none focus:border-accent text-white"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-accent/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs border border-accent/20 rounded text-foreground/70 hover:bg-white/5 transition-colors"
            disabled={isSending}
          >
            {t('Avbryt', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={isSending}
            className="btn-gold text-xs py-2 px-4 flex items-center gap-1.5"
          >
            {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {t('Skicka', 'Send')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
