import { useLanguage } from '@/contexts/LanguageContext'
import { ArtistForm } from '@/components/applications/ArtistForm'

export const AddPerformer = () => {
  const { t } = useLanguage()

  return (
    <>
      <div className="page-shell">
        <header className="header !mb-0 !pb-5">
          <h1>Hall of Fame</h1>

          <div className="gold-divider" />

          <p className="subtitle">
            {t(
              'Hej! Du har fått denna länken för att du uppträtt på Tip the Velvet. Vi är stolta över samarbetet och vill gärna visa upp dig i vårt "Hall of Fame" (under "Artist" fliken på webbsidan). Om du vill synas där får du gärna fylla i formuläret nedan! En detaljsida kommer visa bilder från uppträdande du gjort på vår scen!',
              'Hi! You have received this link because you performed at Tip the Velvet. We are proud to have worked with you and would love to show you off in our "Hall of Fame" (under the "Performers" tab on the website). If you would like to be featured there, please fill out the form below! A detail page will show a gallery with your act pictures from our events!'
            )}
          </p>
          <p className="text-accent font-heading font-medium tracking-wide text-base md:text-xl  max-w-2xl mx-auto">
            {t(
              'Kontaktuppgifter delas såklart inte till publiken och samlas endast i syfte av enklare framtida samaerbeten! Om du har frågor, maila oss gärna på: ',
              'Your contact info will of course not be made public. If you have questions, feel free to contact us at: '
            )}
            <a href="mailto:velvet.gbg@gmail.com" className="underline hover:text-accent/80 ">
              <span>velvet.gbg@gmail.com</span>
            </a>
          </p>
        </header>

        <div className="mx-auto px-4 relative">
          <div className="middle-glow" />
          <div className="max-w-3xl mx-auto space-y-8 md:space-y-10">
            <ArtistForm />
          </div>
        </div>
      </div>
    </>
  )
}
