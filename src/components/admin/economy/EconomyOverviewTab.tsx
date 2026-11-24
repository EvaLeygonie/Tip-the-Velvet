import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { PAYABLE_SECTIONS, formatKr, summarizeEvents, type OverviewRow } from '@/lib/payables'
import { getEconomyOverviewData } from '@/services/payablesService'

interface EconomyOverviewTabProps {
  // Opens one show on the "One event" tab
  onOpenEvent: (eventId: string) => void
}

// One colour per bill section, so the same section is the same colour in every bar
const SECTION_COLORS: Record<string, string> = {
  artists: '#E57373',
  staff: '#7FB3D5',
  venue: '#F9C31F',
  decor: '#C9A0DC',
  print: '#8FD6A0',
  transport: '#F4A261',
  other: '#ABA0A0',
}

const formatDate = (iso: string | null) => (iso ? iso.split('T')[0] : '')

// What is still missing for a show, in the order the board would fix it
const rowNotes = (row: OverviewRow, t: (sv: string, eng: string) => string): string[] => {
  const notes: string[] = []
  if (row.income === null) notes.push(t('Biljettintäkt saknas', 'Ticket income missing'))
  if (row.bills === 0) notes.push(t('Inga kostnader inlagda', 'No costs entered'))
  if (row.billsWithoutAmount > 0)
    notes.push(
      t(`${row.billsWithoutAmount} saknar belopp`, `${row.billsWithoutAmount} without amount`)
    )
  if (row.unpaidBills > 0) notes.push(t(`${row.unpaidBills} obetalda`, `${row.unpaidBills} unpaid`))
  return notes
}

// All shows side by side: tickets, what the ticket sales brought in, what the bills add up to and
// the result. Everything is read from the same data as the per-show tab, nothing is typed twice.
export const EconomyOverviewTab = ({ onOpenEvent }: EconomyOverviewTabProps) => {
  const { t } = useLanguage()
  const [rows, setRows] = useState<OverviewRow[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    getEconomyOverviewData()
      .then(({ events, bills }) => {
        if (!cancelled) setRows(summarizeEvents(events, bills))
      })
      .catch((err) => {
        console.error('Kunde inte hämta översikten:', err)
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const totals = useMemo(() => {
    // Only shows with a result count, so the totals are never skewed by a show missing its bills
    const complete = (rows ?? []).filter((r) => r.result !== null)
    return {
      shows: complete.length,
      tickets: complete.reduce((n, r) => n + (r.event.tickets_sold ?? 0), 0),
      income: complete.reduce((n, r) => n + (r.income ?? 0), 0),
      costs: complete.reduce((n, r) => n + r.costs, 0),
      result: complete.reduce((n, r) => n + (r.result ?? 0), 0),
    }
  }, [rows])

  if (failed) {
    return (
      <div className="callout-panel max-w-xl">
        <p className="text-info">
          {t('Kunde inte läsa översikten.', 'Could not load the overview.')}
        </p>
      </div>
    )
  }

  if (!rows) {
    return (
      <div className="flex justify-center py-16" role="status">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        <span className="sr-only">{t('Laddar...', 'Loading...')}</span>
      </div>
    )
  }

  const maxCost = Math.max(1, ...rows.map((r) => r.costs))
  const th = 'px-3 py-2 text-xs uppercase tracking-wider text-foreground/60 font-normal'
  const td = 'px-3 py-3 border-t border-accent/10'

  return (
    <div className="max-w-5xl mx-auto px-4 space-y-8 pb-16">
      <section className="admin-panel p-5 sm:p-6" aria-label={t('Sammanfattning', 'Summary')}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {[
            { label: t('Shower med resultat', 'Shows with a result'), value: String(totals.shows) },
            { label: t('Biljetter sålda', 'Tickets sold'), value: String(totals.tickets) },
            { label: t('Intäkt', 'Income'), value: formatKr(totals.income) },
            {
              label: t('Resultat', 'Result'),
              value: formatKr(totals.result),
              tone: totals.result >= 0 ? 'text-emerald-400' : 'text-red-400',
            },
          ].map((k) => (
            <div key={k.label}>
              <div className="text-xs uppercase tracking-widest text-foreground/60">{k.label}</div>
              <div className={`font-decorative text-2xl mt-1 ${k.tone ?? 'text-foreground'}`}>
                {k.value}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        className="admin-panel p-5 sm:p-6"
        aria-label={t('Shower sida vid sida', 'Shows side by side')}
      >
        <h3 className="font-decorative text-lg text-accent uppercase tracking-wider mb-4">
          {t('Shower sida vid sida', 'Shows side by side')}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left">
                <th className={th}>{t('Show', 'Show')}</th>
                <th className={`${th} text-right`}>{t('Biljetter', 'Tickets')}</th>
                <th className={`${th} text-right`}>{t('Pris', 'Price')}</th>
                <th className={`${th} text-right`}>{t('Intäkt', 'Income')}</th>
                <th className={`${th} text-right`}>{t('Kostnader', 'Costs')}</th>
                <th className={`${th} text-right`}>{t('Resultat', 'Result')}</th>
                <th className={th}>{t('Saknas', 'Missing')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const notes = rowNotes(r, t)
                return (
                  <tr key={r.event.id}>
                    <td className={td}>
                      <button
                        type="button"
                        onClick={() => onOpenEvent(r.event.id)}
                        className="text-left font-semibold hover:text-accent transition-colors"
                      >
                        {r.event.title}
                      </button>
                      <div className="text-xs text-foreground/50">
                        {formatDate(r.event.event_start)}
                      </div>
                    </td>
                    <td className={`${td} text-right`}>{r.event.tickets_sold ?? '–'}</td>
                    <td className={`${td} text-right`}>
                      {r.event.tickets_price ? formatKr(r.event.tickets_price) : '–'}
                    </td>
                    <td className={`${td} text-right`}>
                      {r.income === null ? '–' : formatKr(r.income)}
                    </td>
                    <td className={`${td} text-right`}>{r.bills > 0 ? formatKr(r.costs) : '–'}</td>
                    <td
                      className={`${td} text-right font-semibold ${
                        r.result === null
                          ? 'text-foreground/50'
                          : r.result >= 0
                            ? 'text-emerald-400'
                            : 'text-red-400'
                      }`}
                    >
                      {r.result === null ? '–' : formatKr(r.result)}
                    </td>
                    <td className={`${td} text-xs text-amber-400`}>
                      {notes.length > 0 ? notes.join(' · ') : ''}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section
        className="admin-panel p-5 sm:p-6"
        aria-label={t('Vart pengarna gick', 'Where the money went')}
      >
        <h3 className="font-decorative text-lg text-accent uppercase tracking-wider mb-4">
          {t('Vart pengarna gick', 'Where the money went')}
        </h3>
        <div className="flex flex-wrap gap-x-4 gap-y-2 mb-5">
          {PAYABLE_SECTIONS.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-2 text-xs">
              <span
                className="inline-block h-3 w-3 rounded-sm"
                style={{ background: SECTION_COLORS[s.key] }}
              />
              {t(s.sv, s.eng)}
            </span>
          ))}
        </div>
        <div className="space-y-4">
          {rows
            .filter((r) => r.bills > 0)
            .map((r) => (
              <div key={r.event.id}>
                <div className="flex justify-between gap-3 mb-1 text-sm">
                  <span className="font-semibold">{r.event.title}</span>
                  <span className="text-foreground/60">{formatKr(r.costs)}</span>
                </div>
                <div
                  className="flex h-5 rounded-md overflow-hidden bg-white/5"
                  role="img"
                  aria-label={PAYABLE_SECTIONS.filter((s) => r.costsBySection[s.key] > 0)
                    .map((s) => `${t(s.sv, s.eng)} ${formatKr(r.costsBySection[s.key])}`)
                    .join(', ')}
                >
                  {PAYABLE_SECTIONS.filter((s) => r.costsBySection[s.key] > 0).map((s) => (
                    <div
                      key={s.key}
                      title={`${t(s.sv, s.eng)}: ${formatKr(r.costsBySection[s.key])}`}
                      style={{
                        width: `${(r.costsBySection[s.key] / maxCost) * 100}%`,
                        background: SECTION_COLORS[s.key],
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>
      </section>
    </div>
  )
}
