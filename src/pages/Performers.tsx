import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import type { Performer, PublicPerformer } from '@/types/types'
import { PerformerCard } from '@/components/performers/performerCard'
import {
  fetchPerformers,
  togglePerformerVisibility,
  deletePerformer,
} from '@/services/performerService'
import { supabase } from '@/lib/supabase'
import { Images, Eye, EyeOff, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export const Performers = () => {
  const [performers, setPerformers] = useState<(Performer | PublicPerformer)[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { t } = useLanguage()

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const data = await fetchPerformers(!!user)
        setPerformers(data)
      } catch (err) {
        console.error('Error fetching performers:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user]) // Trigga om ifall admin loggar in eller ut under sessionen

  const handleApprove = async (reactEvent: React.MouseEvent, performer: Performer) => {
    reactEvent.preventDefault()
    reactEvent.stopPropagation() // Stoppar länken från att triggas!

    const newVisibility = !performer.is_approved

    try {
      await togglePerformerVisibility(performer.id, newVisibility)

      setPerformers((prev) =>
        prev.map((p) => (p.id === performer.id ? { ...p, is_approved: newVisibility } : p))
      )

      toast.success(
        newVisibility
          ? t('Artist godkänd och synlig!', 'Performer approved and visible!')
          : t('Artist dold!', 'Performer hidden!')
      )
    } catch (err) {
      console.error('Toggle approval error:', err)
      toast.error(
        t('Något gick fel vid ändring av synlighet', 'Something went wrong toggling visibility')
      )
    }
  }

  const handleDelete = async (reactEvent: React.MouseEvent, performer: Performer) => {
    reactEvent.preventDefault()
    reactEvent.stopPropagation() // Stoppar länken!

    if (
      !confirm(
        t(
          'Är du säker på att du vill radera den här artisten?',
          'Are you sure you want to delete this performer?'
        )
      )
    )
      return

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) throw new Error(t('Inte inloggad', 'Not logged in'))

    try {
      await deletePerformer(performer.id, performer.promo_image_id || '')
      setPerformers((prev) => prev.filter((p) => p.id !== performer.id))

      toast.success(t('Artist raderad!', 'Performer deleted!'))
    } catch (err) {
      console.error('Delete performer error:', err)
      toast.error(
        t('Något gick fel vid radering av artisten', 'Something went wrong deleting the performer')
      )
    }
  }

  if (loading)
    return (
      <div className="loading-container">
        <p className="loading-text">{t('Laddar...', 'Loading...')}</p>
      </div>
    )

  return (
    <>
      <div className="page-shell">
        <div className="bg-glow-spot" />
        <header className="header !mb-0 !pb-5">
          <div className="section-header-triad">
            <div className="hidden md:block"></div>

            <h1 className="!pb-0">Hall of Fame</h1>

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
              'Här vill vi hylla de fantastiska artister som uppträtt på vår scen!',
              'Here we want to honor the fabulous performers who have graced our stage with their art!'
            )}
          </p>
        </header>

        <section className="container-wide page-section !mt-0">
          {performers.length === 0 && (
            <div className="empty-state empty-state-lg">
              <Images className="w-12 h-12" />
              <p className="font-decorative uppercase tracking-widest text-sm">
                {t('Inga artister att visa ännu', 'No performers to show yet')}
              </p>
            </div>
          )}

          {performers.length > 0 && (
            <div className="card-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {performers.map((e) => {
                // INTEGRATION: Deklarera artisten som en flexibel union-typ för mappen
                const performerItem = e as Performer | PublicPerformer

                return (
                  <div key={performerItem.id} className="relative group z-0">
                    <PerformerCard performer={performerItem as Performer} />

                    {user && (
                      <>
                        <button
                          onClick={(reactEvent) =>
                            handleApprove(reactEvent, performerItem as Performer)
                          }
                          className={`absolute top-2 right-2 p-1.5 rounded-full transition-all z-10 shadow-md ${
                            (performerItem as Performer).is_approved
                              ? 'bg-accent text-black hover:bg-accent-light'
                              : 'bg-black/80 text-white/50 hover:text-white'
                          }`}
                        >
                          {(performerItem as Performer).is_approved ? (
                            <Eye size={14} />
                          ) : (
                            <EyeOff size={14} />
                          )}
                        </button>

                        <button
                          onClick={(reactEvent) =>
                            handleDelete(reactEvent, performerItem as Performer)
                          }
                          className="absolute top-2 left-2 p-1.5 rounded-full transition-all bg-red-950/90 hover:bg-red-600 text-red-200 shadow-md z-10"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </>
  )
}
