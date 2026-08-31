import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import type { CreateStaffVolunteerInput, StaffVolunteerType, Event } from '@/types/types'
import {
  submitJoinApplication,
  submitStaffEventInterest,
  sendApplicationConfirmationEmail,
} from '@/services/applicationService'
import { getNearestUpcomingEvent } from '@/services/eventService'
import { Send, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatOtherLink, formatDate } from '@/lib/utils'

interface PostgrestError {
  code?: string
  message?: string
  details?: string
}

interface RoleOption {
  value: StaffVolunteerType
  sv: string
  en: string
}

export const JoinUsCard = () => {
  const { t, language } = useLanguage()

  const ROLE_OPTIONS: RoleOption[] = [
    { value: 'volunteer', sv: 'Volontär (allmänt)', en: 'Volunteer (General)' },
    { value: 'entertainment', sv: 'Underhållning/musik', en: 'Entertainment/music' },
    { value: 'dj', sv: 'DJ', en: 'DJ' },
    { value: 'stage_kitten', sv: 'Stage kitten/hand', en: 'Stage kitten/hand' },
    { value: 'doorman', sv: 'Dörrvärd / vakt', en: 'Doorman / Guard' },
    { value: 'technician', sv: 'Tekniker (Ljud/Ljus)', en: 'Technician (Sound/Light)' },
    { value: 'photographer', sv: 'Fotograf', en: 'Photographer' },
    { value: 'other', sv: 'Annat', en: 'Other' },
  ]

  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState<Partial<CreateStaffVolunteerInput>>({
    name: '',
    email: '',
    phone: '',
    role: '' as StaffVolunteerType,
    role_details: '',
    agreed_to_terms: false,
  })

  const [nearestEvent, setNearestEvent] = useState<Pick<
    Event,
    'id' | 'title' | 'event_start' | 'staff_recruitment_open'
  > | null>(null)
  const [interestedInEvent, setInterestedInEvent] = useState(false)

  useEffect(() => {
    const loadNearestEvent = async () => {
      try {
        const event = await getNearestUpcomingEvent()
        setNearestEvent(event)
      } catch (err) {
        console.error('Kunde inte hämta kommande event:', err)
      }
    }
    loadNearestEvent()
  }, [])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!agreed) return toast.error(t('Acceptera termer tack.', 'Please agree to the terms.'))
    if (!formData.name) return toast.error(t('Namn krävs.', 'Name is required.'))
    if (!formData.email) return toast.error(t('Mails krävs.', 'Email is required.'))
    if (!formData.role) return toast.error(t('Du måste välja en roll.', 'You must select a role.'))

    setSubmitting(true)

    const formattedOther = formatOtherLink(formData.link || '')

    const payload: CreateStaffVolunteerInput = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone || '',
      role: formData.role,
      role_details: formData.role_details || '',
      link: formattedOther || '',
      agreed_to_terms: true,
    }

    const applicantName = formData.name.trim()
    const applicantEmail = formData.email?.trim() || ''
    const applicantLanguage = language

    try {
      const created = await submitJoinApplication(payload)

      if (interestedInEvent && nearestEvent?.staff_recruitment_open) {
        try {
          await submitStaffEventInterest(nearestEvent.id, created.id)
        } catch (err) {
          console.error('Kunde inte spara eventintresse:', err)
        }
      }

      setFormData({
        name: '',
        email: '',
        phone: '',
        role: '' as StaffVolunteerType,
        role_details: '',
        agreed_to_terms: false,
      })
      setAgreed(false)
      setInterestedInEvent(false)

      const emailSuccess = await sendApplicationConfirmationEmail(
        applicantName,
        applicantEmail,
        applicantLanguage,
        'staff'
      )

      if (emailSuccess) {
        toast.success(
          t(
            'Ansökan skickad! Kolla din inkorg efter en bekräftelse.',
            'Application submitted! Please check your inbox for a confirmation.'
          )
        )
      } else {
        toast.success(
          t(
            'Din ansökan är sparad! Kunde inte skicka bekräftelsemail.',
            'Your application is saved! Could not send confirmation email.'
          ),
          { duration: 5000 }
        )
      }
    } catch (err: unknown) {
      const dbError = err as PostgrestError

      if (dbError?.code === '23505' || dbError?.message?.includes('unique_volunteer_role')) {
        toast.info(
          t(
            'Du har redan skickat in en ansökan för denna roll! Din ansökan är sparad.',
            'You have already submitted an application for this role! Your application is safe.'
          ),
          { duration: 6000 }
        )
      } else {
        toast.error(t('Någonting gick fel!', 'Something went wrong!'))
        console.error(err)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="application-card">
      <p className="text-sm text-foreground/70 italic leading-relaxed mb-4">
        {t(
          'Den här ansökan sparas i vårt kollektiv. Vi hör av oss så fort vi har en plats som passar dig — det kan ta ett tag, men vi glömmer dig inte!',
          "This application joins our general collective. We'll reach out as soon as we have a spot that fits — it might take a little while, but we won't forget you!"
        )}
      </p>

      {nearestEvent && !nearestEvent.staff_recruitment_open && (
        <p className="text-sm text-foreground/70 italic leading-relaxed">
          {t(
            `Inga fler volontärer behövs för ${nearestEvent.title} just nu, men skicka gärna in en ansökan ändå!`,
            `No more volunteers are needed for ${nearestEvent.title} right now, but please send in an application anyway!`
          )}
        </p>
      )}
      <div className="form-stack">
        {/* NAME & EMAIL */}
        <div className="form-row-2">
          <div className="form-field">
            <label className="form-label-block">{t('Namn *', 'Name *')}</label>
            <input
              type="text"
              name="name"
              placeholder={t('Ditt namn', 'Your full name')}
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label className="form-label-block">Email *</label>
            <input
              type="email"
              name="email"
              placeholder={t('ditt@mail.com', 'your@email.com')}
              value={formData.email || ''}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* NAME & ROLE */}
        <div className="form-row-2">
          <div className="form-field">
            <label className="form-label-block">{t('Roll *', 'Role *')}</label>
            <select name="role" value={formData.role || ''} onChange={handleChange}>
              <option value="" disabled hidden>
                {language === 'sv' ? '-- Välj din roll --' : '-- Select your role --'}
              </option>

              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {language === 'sv' ? opt.sv : opt.en}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label className="form-label-block">
              {t('Telefon (valfritt)', 'Phone (optional)')}
            </label>
            <input
              type="text"
              name="phone"
              placeholder={t('Ditt telefonnummer', 'Your phone number')}
              value={formData.phone || ''}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-field">
          <label className="form-label-block">{t('Roll beskrivning', 'Role description')}</label>
          <textarea
            name="role_details"
            placeholder={t('Berätta gärna mer!', 'Please tell us more!')}
            value={formData.role_details || ''}
            onChange={handleChange}
          />
        </div>

        <div className="form-field">
          <label className="form-label-block">
            {t(
              'Portfolio / Instagram / annan länk (valfritt)',
              'Portfolio / Instagram / other link(optional)'
            )}
          </label>
          <input
            type="text"
            name="link"
            placeholder={t(
              'Om du erbjuder kreativa tjänster och vill visa vad du gör!',
              "If you're offering creative services and want to show what you do!"
            )}
            value={formData.link || ''}
            onChange={handleChange}
          />
        </div>

        {nearestEvent && nearestEvent.staff_recruitment_open && (
          <div className="form-checkbox-row">
            <input
              type="checkbox"
              checked={interestedInEvent}
              onChange={(e) => setInterestedInEvent(e.target.checked)}
              className="mt-0.5 shrink-0"
            />
            <label className="text-sm text-foreground/90 leading-relaxed cursor-pointer font-medium">
              {t(
                `Jag är intresserad av att hjälpa till på ${nearestEvent.title} den ${formatDate(language, nearestEvent.event_start)}`,
                `I'm interested in helping at ${nearestEvent.title} on ${formatDate(language, nearestEvent.event_start)}`
              )}
            </label>
          </div>
        )}

        {/* GDPR */}
        <div className="form-checkbox-row">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 shrink-0"
          />
          <label className="text-sm text-foreground/90 leading-relaxed cursor-pointer font-medium">
            {t(
              'Genom att skicka in detta formulär godkänner du att Tip the Velvet (ekonomisk förening) sparar din ansökan i syfte av eventuellt samarbete. Vi delar aldrig din data med tredje part, och du kan när som helst kontakta oss för att få dina uppgifter raderade.',
              'By submitting this form, you agree to Tip the Velvet (economic association) storing your application for the purpose of possible collaboration. We never share your data with third parties, and you can contact us at any time to have your information deleted.'
            )}
          </label>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          className="w-full btn-gold font-body disabled:opacity-50"
          disabled={submitting || !agreed}
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Send className="h-4 w-4" />
              {t('Skicka ansökan', 'Submit Application')}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
