import { useLanguage } from '@/contexts/LanguageContext'

export const AdminCasting = () => {
  const { t } = useLanguage()
  return (
    <>
      <div className="page-shell">
        <div className="bg-glow-spot" />
        <h1>{t('Casting hantering', 'Casting handling')}</h1>
        <div className="gold-divider" />
        <p className="subtitle">
          {t(
            'Här kommer vi att se en sorterbar lista på alla castingansökningar, där vi kan klicka in på varje ansökan för att se mer detaljerad information. Möjlighet att lägga anteckningar på varje samt sortera i "ja", "kanske" och "nej" listor.',
            'Here you can see a sortable list of all casting applications, where you can click on each application to see more detailed information and manage them. Ability to add notes to each application and sort them into "yes", "maybe", and "no" lists.'
          )}
        </p>
      </div>
    </>
  )
}
