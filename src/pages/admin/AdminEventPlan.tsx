import { useLanguage } from '@/contexts/LanguageContext'

const AdminEventPlan = () => {
  const { t } = useLanguage()
  return (
    <>
      <div className="page-standard">
        <h1>{t('Eventplan', 'Event Plan')}</h1>
        <p>
          {t(
            'Här kan du se en översikt över alla planerade evenemang och deras status.',
            'Here you can see an overview of all planned events and their status.'
          )}
        </p>
      </div>
    </>
  )
}

export default AdminEventPlan
