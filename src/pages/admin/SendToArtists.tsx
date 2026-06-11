import { useLanguage } from '@/contexts/LanguageContext'
import { ArtistForm } from '@/components/applications/ArtistForm'

export const SendToArtists = () => {
  const { t } = useLanguage()

  return (
    <>
      <div className="page-shell">
        <header className="header !mb-0 !pb-5">
          <h1>Hall of Fame</h1>

          <div className="gold-divider" />

          <p className="subtitle">
            {t(
              'Hej! Du har fått denna länken för att du uppträtt på Tip the Velvet. Vi vill gärna ha med dig i vårt "Hall of Fame" under "Artist" fliken på webbsidan. Om du vill vsynas där får du gärna fylla i formuläret nedan! Tanken är att senare skapa detaljsidor där bilder från uppträdande på vår scen kan visas per artist och per akt! Om du har frågor, maila oss gärna på: ',
              'Hi! You have received this link because you performed at Tip the Velvet. We would love to include you in our "Hall of Fame" under the "Artist" tab on the website. If you would like to be featured there, please fill out the form below! The idea is to later create detail pages where photos from performances on our stage can be displayed by artist and by act! If you have questions, feel free to contact us at: '
            )}
            <a href="mailto:velvet.gbg@gmail.com" className="text-accent hover:text-accent/80 ">
              <span>velvet.gbg@gmail.com</span>
            </a>
          </p>
        </header>

        <div className="mx-auto px-4 relative">
          <div className="middle-glow" />
          <ArtistForm />
        </div>
      </div>
    </>
  )
}
