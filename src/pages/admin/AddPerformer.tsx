import { ArtistForm } from '@/components/applications/ArtistForm'
import { useLanguage } from '@/contexts/LanguageContext'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

export const AddPerformer = () => {
  const { slug } = useParams()
  const { t } = useLanguage()

  return (
    <>
      <div className="page-shell">
        <div className="bg-glow-spot" />
        <header className="header !mb-0 !pb-5">
          <div className="section-header-triad">
            <div className="header-side-content md:justify-start">
              <Link to="/performers">
                <ArrowLeft className="text-accent hover:scale-105" />
              </Link>
            </div>

            <h1>{t('Lägg till artist', 'Add performer')}</h1>

            <div className="hidden md:block"></div>
          </div>

          <div className="gold-divider" />
        </header>

        <div className="mx-auto px-4 relative mt-5">
          <div className="middle-glow" />
          <div className="max-w-3xl mx-auto space-y-8 md:space-y-10">
            <ArtistForm editSlug={slug} />
          </div>
        </div>
      </div>
    </>
  )
}
