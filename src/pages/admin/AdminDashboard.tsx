import { useLanguage } from '@/contexts/LanguageContext'

const AdminDashboard = () => {
  const { t } = useLanguage()
  return (
    <>
      <div className="page-standard">
        <h1>Admin Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-secondary rounded-lg p-6">
            <h2>{t('Event Editor', 'Event Editor')}</h2>
            <p>
              {t(
                'Här kan du skapa och redigera evenemang.',
                'Here you can create and edit events.'
              )}
            </p>
          </div>
          <div className="bg-secondary rounded-lg p-6">
            <h2>{t('Castings', 'Castings')}</h2>
            <p>
              {t(
                'Hantera casting calls och ansökningar.',
                'Manage casting calls and applications.'
              )}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default AdminDashboard
