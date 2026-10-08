import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { groupByEmail, joinNames } from '@/lib/emailGrouping'
import type { Language } from '@/types/types'

export interface MailRecipient {
  name: string
  email: string
  // Which of the two drafts this person gets. Missing → Swedish, same as the db default.
  language?: Language
  // What `{name}` in the greeting resolves to when it should differ from `name` (e.g. a
  // volunteer's first name only). Falls back to `name`.
  greetingName?: string
  // Only set for the staff/volunteer email path — see AdminContacts.tsx's onSent handler.
  staffId?: string
}

// One language's version of the email. `greeting` may contain `{name}`, filled in per
// recipient — it's a field of its own rather than baked into `body` so it renders exactly
// once (as the edge function's own greeting header).
export interface MailDraft {
  subject: string
  greeting: string
  body: string
}

interface ContactMailModalProps {
  isOpen: boolean
  onClose: () => void
  recipients: MailRecipient[]
  defaultSv: MailDraft
  defaultEng: MailDraft
  // Fired once the whole send batch settles (not per-recipient) — a bulk send emails each
  // recipient individually (Resend's `to` only takes one address per call), so callers doing
  // something per success (e.g. markStaffContacted) get one batch to work through instead of
  // being called once per recipient.
  onSent?: (results: { recipient: MailRecipient; ok: boolean }[]) => void
}

const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'sv', label: 'Svenska' },
  { value: 'eng', label: 'English' },
]

export const ContactMailModal = ({
  isOpen,
  onClose,
  recipients,
  defaultSv,
  defaultEng,
  onSent,
}: ContactMailModalProps) => {
  const { t } = useLanguage()
  const [drafts, setDrafts] = useState<Record<Language, MailDraft>>({
    sv: defaultSv,
    eng: defaultEng,
  })
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    const resetDrafts = () => {
      if (isOpen) setDrafts({ sv: defaultSv, eng: defaultEng })
    }
    resetDrafts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const updateDraft = (lang: Language, field: keyof MailDraft, value: string) =>
    setDrafts((prev) => ({ ...prev, [lang]: { ...prev[lang], [field]: value } }))

  const groups = groupByEmail(recipients)
  const sharedInboxCount = recipients.length - groups.length
  const countFor = (lang: Language) => groups.filter((g) => g.language === lang).length

  // A group email shows both languages (the point is writing both once); a single-recipient
  // email only needs the draft that person will actually get.
  const visibleLanguages = LANGUAGES.filter(
    ({ value }) => recipients.length !== 1 || countFor(value) > 0
  )

  const handleSend = async () => {
    setIsSending(true)
    try {
      const groupOks = await Promise.all(
        groups.map((group) => {
          const draft = drafts[group.language]
          return fetch('/api/send-casting-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: group.email,
              name: joinNames(
                group.members.map((m) => m.name),
                group.language
              ),
              subject: draft.subject,
              bodyText: draft.body,
              // The edge function's own language value is 'en', not 'eng'.
              language: group.language === 'eng' ? 'en' : 'sv',
              fromName: 'Tip the Velvet',
              greeting: draft.greeting.replaceAll(
                '{name}',
                joinNames(
                  group.members.map((m) => m.greetingName ?? m.name),
                  group.language
                )
              ),
            }),
          }).then((res) => res.ok)
        })
      )
      // Report per person (not per email) so callers still mark everyone in a shared-inbox
      // group as contacted.
      const results = groups.flatMap((group, i) =>
        group.members.map((recipient) => ({ recipient, ok: groupOks[i] }))
      )
      const oks = results.map((r) => r.ok)
      const successCount = oks.filter(Boolean).length
      onSent?.(results)
      if (successCount === recipients.length) {
        toast.success(
          recipients.length === 1
            ? t('Mail skickat!', 'Email sent!')
            : t(`Mail skickat till ${successCount}.`, `Email sent to ${successCount}.`)
        )
        onClose()
      } else {
        toast.error(
          t(
            `Skickat till ${successCount}/${recipients.length} — resten misslyckades.`,
            `Sent to ${successCount}/${recipients.length} — the rest failed.`
          )
        )
      }
    } catch (err) {
      console.error('Kunde inte skicka mail:', err)
      toast.error(t('Kunde inte skicka mail.', 'Could not send email.'))
    } finally {
      setIsSending(false)
    }
  }

  if (!isOpen || typeof window === 'undefined') return null

  const recipientSummary =
    recipients.length === 1
      ? `${recipients[0].name} (${recipients[0].email})`
      : t(`${recipients.length} mottagare`, `${recipients.length} recipients`)
  const sharedInboxNote =
    sharedInboxCount > 0
      ? t(
          `${sharedInboxCount} delar mailadress med någon annan och får ett gemensamt mail.`,
          `${sharedInboxCount} share an email address and will get one joint email.`
        )
      : null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 text-left"
      onClick={onClose}
    >
      <div
        className={`velvet-surface border border-accent/30 w-full p-6 space-y-4 rounded-lg shadow-2xl relative max-h-[90vh] overflow-y-auto ${
          visibleLanguages.length > 1 ? 'max-w-4xl' : 'max-w-lg'
        }`}
        style={{ backgroundColor: '#141111' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h4 className="font-decorative text-lg text-accent text-center">
            {t('Skicka mail', 'Send email')}
          </h4>
          <p className="text-xs text-muted-foreground text-center">
            {t('Till', 'To')}: {recipientSummary}
          </p>
          {sharedInboxNote && (
            <p className="text-[11px] text-accent/70 text-center mt-1">{sharedInboxNote}</p>
          )}
        </div>

        <div
          className={`grid gap-6 ${visibleLanguages.length > 1 ? 'grid-cols-1 md:grid-cols-2' : ''}`}
        >
          {visibleLanguages.map(({ value, label }) => {
            const count = countFor(value)
            const draft = drafts[value]
            return (
              <div key={value} className={`space-y-4 ${count === 0 ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between border-b border-accent/10 pb-1">
                  <span className="font-decorative text-sm text-accent">{label}</span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {count === 0
                      ? t('Inga mottagare', 'No recipients')
                      : t(`${count} mottagare`, `${count} recipients`)}
                  </span>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono block">
                    {t('Ämnesrad', 'Subject')}
                  </label>
                  <input
                    type="text"
                    value={draft.subject}
                    onChange={(e) => updateDraft(value, 'subject', e.target.value)}
                    className="w-full text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono block">
                    {t('Hälsning', 'Greeting')}
                  </label>
                  <input
                    type="text"
                    value={draft.greeting}
                    onChange={(e) => updateDraft(value, 'greeting', e.target.value)}
                    className="w-full text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono block">
                    {t('Mailtext', 'Email Text')}
                  </label>
                  <textarea
                    value={draft.body}
                    onChange={(e) => updateDraft(value, 'body', e.target.value)}
                    className="w-full h-40 text-sm bg-black/40 border border-accent/20 font-sans p-2 leading-relaxed rounded resize-none focus:border-accent text-white"
                  />
                </div>
              </div>
            )
          })}
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
            disabled={isSending || recipients.length === 0}
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
