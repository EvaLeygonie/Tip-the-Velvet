import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import type { Performer } from '@/types/types'
import { PerformerCard } from '@/components/performers/performerCard'
import { fetchPerformers } from '@/services/performerService'

export const Performers = () => {
  const [performers, setPerformers] = useState<Performer[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { t } = useLanguage()

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const data = await fetchPerformers()
        setPerformers(data)
      } catch (err) {
        console.error('Error fetching performers:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading)
    return (
      <div className="loading-container">
        <p className="loading-text">{t('Laddar...', 'Loading...')}</p>
      </div>
    )

  return (
    <>
      <div className="page-shell">
        <header className="header !mb-0 !pb-5">
          <div className="section-header-triad">
            <div className="hidden md:block"></div>

            <h1 className="!pb-0">{t('Artister', 'Performers')}</h1>

            <div className="header-side-content md:justify-end">
              {user && (
                <Link to="/hall-of-fame-form">
                  <button className="btn-admin">
                    <span className="text-lg">+</span>
                    {t('Lägg till Artist', 'Add Performer')}
                  </button>
                </Link>
              )}
            </div>
          </div>
          <div className="gold-divider" />

          <p className="subtitle pt-2">
            {t(
              'Här vill vi hylla dom fantastiska artisterna som uppträtt på vår scen!',
              'Here we want to honor the fabulous performers who have gracecd our stage with their art!'
            )}
          </p>
        </header>

        <section className="container-wide page-section !mt-0">
          <div className="card-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {performers.map((e) => (
              <PerformerCard key={e.id} performer={e} />
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
