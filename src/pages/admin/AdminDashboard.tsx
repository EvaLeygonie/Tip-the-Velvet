import { useState, useEffect } from 'react'
import { Users, Gift } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { getStaffVolunteers, getSponsors } from '@/services/contactsService'
import { staffRoleLabel, sponsorTypeLabel } from '@/lib/contactLabels'
import { formatDate } from '@/lib/utils'
import type { StaffVolunteers, Sponsors } from '@/types/types'

const NEW_WINDOW_DAYS = 7

// created_at is the only timestamp either table has — no reviewed/seen flag exists yet, so
// "new" is a plain rolling window rather than "since you last looked."
const isRecent = (createdAt: string): boolean => {
  const cutoff = Date.now() - NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000
  return new Date(createdAt).getTime() >= cutoff
}

export const AdminDashboard = () => {
  const { t, language } = useLanguage()
  const [staffVolunteers, setStaffVolunteers] = useState<StaffVolunteers[]>([])
  const [sponsors, setSponsors] = useState<Sponsors[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [staff, sponsorRows] = await Promise.all([getStaffVolunteers(), getSponsors()])
        setStaffVolunteers(staff)
        setSponsors(sponsorRows)
      } catch (err) {
        console.error('Kunde inte hämta nya ansökningar:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const newStaff = staffVolunteers
    .filter((row) => isRecent(row.created_at))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
  const newSponsors = sponsors
    .filter((row) => isRecent(row.created_at))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))

  return (
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

      {!loading && (
        <div className="max-w-3xl mx-auto mt-8 space-y-2">
          <h3 className="font-decorative text-lg text-foreground/90">
            {t(
              `Nya ansökningar (senaste ${NEW_WINDOW_DAYS} dagarna)`,
              `New applications (last ${NEW_WINDOW_DAYS} days)`
            )}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm text-foreground/70">
                <Users className="h-4 w-4 text-accent/60" />
                {t('Personal & volontärer', 'Staff & volunteers')}
                <span className="text-xs font-mono px-2 py-0.5 rounded-full border bg-accent/10 border-accent/30 text-accent">
                  {newStaff.length}
                </span>
              </div>
              {newStaff.length === 0 ? (
                <p className="text-sm text-foreground/40 italic">
                  {t('Inga nya ännu.', 'None yet.')}
                </p>
              ) : (
                <div className="space-y-1.5">
                  {newStaff.map((row) => (
                    <div
                      key={row.id}
                      className="admin-panel velvet-surface p-2.5 flex items-center gap-2 text-sm"
                    >
                      <span className="flex-1 min-w-0 truncate text-foreground">{row.name}</span>
                      <span className="text-accent italic text-xs shrink-0">
                        {staffRoleLabel(t, row.role)}
                      </span>
                      <span className="text-foreground/40 text-xs shrink-0">
                        {formatDate(language, row.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm text-foreground/70">
                <Gift className="h-4 w-4 text-accent/60" />
                {t('Sponsorer', 'Sponsors')}
                <span className="text-xs font-mono px-2 py-0.5 rounded-full border bg-accent/10 border-accent/30 text-accent">
                  {newSponsors.length}
                </span>
              </div>
              {newSponsors.length === 0 ? (
                <p className="text-sm text-foreground/40 italic">
                  {t('Inga nya ännu.', 'None yet.')}
                </p>
              ) : (
                <div className="space-y-1.5">
                  {newSponsors.map((row) => (
                    <div
                      key={row.id}
                      className="admin-panel velvet-surface p-2.5 flex items-center gap-2 text-sm"
                    >
                      <span className="flex-1 min-w-0 truncate text-foreground">{row.name}</span>
                      {row.sponsor_type && (
                        <span className="text-accent italic text-xs shrink-0">
                          {sponsorTypeLabel(t, row.sponsor_type)}
                        </span>
                      )}
                      <span className="text-foreground/40 text-xs shrink-0">
                        {formatDate(language, row.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
