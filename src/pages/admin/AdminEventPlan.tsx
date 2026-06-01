import { useLanguage } from '@/contexts/LanguageContext'

export const AdminEventPlan = () => {
  const { t } = useLanguage()
  return (
    <>
      <div className="page-standard">
        <div className="bg-glow-spot" />
        <h1>{t('Eventplan', 'Event Plan')}</h1>
        <div className="gold-divider" />
        <p className="subtitle">
          {t(
            'Här kommer vi att visa en översikt över alla planerade evenemang och deras status. Draft event ses bara här',
            'Here you can see an overview of all planned events and their status. Draft events are only visible on this page'
          )}
        </p>
      </div>
    </>
  )
}
