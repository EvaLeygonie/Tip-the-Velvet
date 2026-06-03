import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import type { CreateStaffVolunteerInput, StaffVolunteerType } from '@/types/types'
import { submitJoinApplication } from '@/services/applicationService'
import { Send, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export const JoinUsCard = () => {
  const { t, language } = useLanguage()

  interface RoleOption {
    value: StaffVolunteerType
    sv: string
    en: string
  }

  const ROLE_OPTIONS: RoleOption[] = [
    { value: 'volunteer', sv: 'Volontär', en: 'Volunteer' },
    { value: 'staff', sv: 'Personal / Bar / Servering', en: 'Staff / Bar / Service' },
    { value: 'photographer', sv: 'Fotograf', en: 'Photographer' },
    { value: 'technician', sv: 'Tekniker (Ljud/Ljus)', en: 'Technician (Sound/Light)' },
    { value: 'doorman', sv: 'Dörrvärd / Entré', en: 'Doorman / Entry' },
    { value: 'musician', sv: 'Musiker', en: 'Musician' },
    { value: 'entertainment', sv: 'Underhållning / Scen', en: 'Entertainment / Stage' },
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const sendConfirmEmail = async (name: string, email: string, language: string, type: string) => {
    try {
      const response = await fetch('/api/application-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, language, type }),
      })
      return response.ok
    } catch (error) {
      console.error('Nätverksfel vid sändning av mail:', error)
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!agreed) return toast.error(t('Acceptera termer tack.', 'Please agree to the terms.'))
    if (!formData.name) return toast.error(t('Namn krävs.', 'Name is required.'))
    if (!formData.email) return toast.error(t('Mails krävs.', 'Email is required.'))
    if (!formData.role) return toast.error(t('Du måste välja en roll.', 'You must select a role.'))

    setSubmitting(true)

    const payload: CreateStaffVolunteerInput = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone || '',
      role: formData.role,
      role_details: formData.role_details || '',
      agreed_to_terms: true,
    }

    const applicantName = formData.name.trim()
    const applicantEmail = formData.email?.trim() || ''
    const applicantLanguage = language

    try {
      await submitJoinApplication(payload)

      setFormData({
        name: '',
        email: '',
        phone: '',
        role: '' as StaffVolunteerType,
        role_details: '',
        agreed_to_terms: false,
      })
      setAgreed(false)

      const emailSuccess = await sendConfirmEmail(
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
            'Kunde inte skicka bekräftelsemail, men din ansökan är sparad.',
            'Could not send confirmation email, but your application is saved.'
          ),
          { duration: 5000 }
        )
      }
    } catch (err) {
      toast.error(t('Någonting gick fel!', 'Something went wrong!'))
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="application-card">
      <div className="form-stack">
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
        {/* PHONE & EMAIL */}
        <div className="form-row-2">
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
          <div className="form-field">
            <label className="form-label-block">{t('Telefon', 'Phone')}</label>
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
          <label className="form-label-block">{t('Roll beskrivning', 'Role description')}</label>
          <textarea
            name="role_details"
            placeholder={t('Berätta gärna mer!', 'Please tell us more!')}
            value={formData.role_details || ''}
            onChange={handleChange}
          />
        </div>

        {/* GDPR */}
        <div className="form-checkbox-row">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5"
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
