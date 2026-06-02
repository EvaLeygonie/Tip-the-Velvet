import { useLanguage } from '@/contexts/LanguageContext'

export const AdminContacts = () => {
  const { t } = useLanguage()
  return (
    <>
      <div className="page-shell">
        <div className="bg-glow-spot" />
        <h1>{t('Kontakter', 'Contacts')}</h1>
        <div className="gold-divider" />
        <p className="subtitle">
          {t(
            'Här kommer vi kunna ladda upp info om samt se listor på arbetare, volontärer och andra kontakter som har skickats in via kontaktformuläret, samt även lokaler vi har varit på och sponsorer.',
            'Here you can upload information about and view lists of workers, volunteers, and other contacts that have been submitted via the contact form, as well as venues we have been at and sponsors.'
          )}
        </p>
      </div>
    </>
  )
}
