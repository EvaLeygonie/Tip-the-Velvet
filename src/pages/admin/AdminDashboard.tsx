import { useLanguage } from '@/contexts/LanguageContext'

export const AdminDashboard = () => {
  const { t } = useLanguage()
  return (
    <>
      <div className="page-shell">
        <div className="bg-glow-spot" />
        <h1>Dashboard</h1>
        <div className="gold-divider" />

        <p className="subtitle">
          {t(
            'Här kommer vi att visa en översikt över uppgifter som behöver uppmärksamhet, såsom nya ansökningar, kommande event och andra administrativa uppgifter.',
            'Here we will display an overview of tasks that need attention, such as new applications, upcoming events, and other administrative tasks.'
          )}
        </p>
      </div>
    </>
  )
}
