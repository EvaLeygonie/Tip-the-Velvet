import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { parseAmount } from '@/lib/payables'
import type { EventTicketSales } from '@/services/eventService'

interface TicketSalesFieldsProps {
  value: EventTicketSales
  onSave: (next: EventTicketSales) => void
}

const FIELD = '!py-2 text-sm'

const draftOf = (n: number | null) => (n === null ? '' : String(n))

// The figures typed in by hand once the show is over: how many tickets were sold out of how many
// there were, and what the sales brought into the account after the platform's fees. The platform
// (and its fees and payout rhythm) changes over time, so the income is kept as money received, not
// worked out from counts.
export const TicketSalesFields = ({ value, onSave }: TicketSalesFieldsProps) => {
  const { t } = useLanguage()
  const [soldDraft, setSoldDraft] = useState(draftOf(value.tickets_sold))
  const [availableDraft, setAvailableDraft] = useState(draftOf(value.available_tickets))
  const [priceDraft, setPriceDraft] = useState(draftOf(value.tickets_price))
  const [incomeDraft, setIncomeDraft] = useState(draftOf(value.ticket_payout))

  const saveCount = (key: 'tickets_sold' | 'available_tickets', draft: string) => {
    const parsed = parseAmount(draft)
    const next = parsed === null ? null : Math.round(parsed)
    if (next !== value[key]) onSave({ ...value, [key]: next })
  }

  const savePrice = () => {
    const next = parseAmount(priceDraft)
    if (next !== value.tickets_price) onSave({ ...value, tickets_price: next })
  }

  const saveIncome = () => {
    const next = parseAmount(incomeDraft)
    if (next !== value.ticket_payout) onSave({ ...value, ticket_payout: next })
  }

  const commitOnEnter = (e: React.KeyboardEvent<HTMLInputElement>) =>
    e.key === 'Enter' && e.currentTarget.blur()

  const fill =
    value.tickets_sold !== null && value.available_tickets
      ? Math.round((value.tickets_sold / value.available_tickets) * 100)
      : null

  return (
    <div>
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-4 max-w-3xl mx-auto">
        <div>
          <label className="form-label-gold" htmlFor="tickets-sold">
            {t('Sålda biljetter', 'Tickets sold')}
          </label>
          <input
            id="tickets-sold"
            type="text"
            inputMode="numeric"
            value={soldDraft}
            onChange={(e) => setSoldDraft(e.target.value)}
            onBlur={() => saveCount('tickets_sold', soldDraft)}
            onKeyDown={commitOnEnter}
            placeholder="0"
            className={FIELD}
          />
        </div>
        <div>
          <label className="form-label-gold" htmlFor="tickets-available">
            {t('Tillgängliga biljetter', 'Available tickets')}
          </label>
          <input
            id="tickets-available"
            type="text"
            inputMode="numeric"
            value={availableDraft}
            onChange={(e) => setAvailableDraft(e.target.value)}
            onBlur={() => saveCount('available_tickets', availableDraft)}
            onKeyDown={commitOnEnter}
            placeholder="0"
            className={FIELD}
          />
        </div>
        <div>
          <label className="form-label-gold" htmlFor="ticket-price">
            {t('Biljettpris (kr)', 'Ticket price (SEK)')}
          </label>
          <input
            id="ticket-price"
            type="text"
            inputMode="decimal"
            value={priceDraft}
            onChange={(e) => setPriceDraft(e.target.value)}
            onBlur={savePrice}
            onKeyDown={commitOnEnter}
            placeholder="0"
            className={FIELD}
          />
        </div>
        <div>
          <label className="form-label-gold" htmlFor="ticket-income">
            {t('Biljettintäkt (kr)', 'Ticket income (SEK)')}
          </label>
          <input
            id="ticket-income"
            type="text"
            inputMode="decimal"
            value={incomeDraft}
            onChange={(e) => setIncomeDraft(e.target.value)}
            onBlur={saveIncome}
            onKeyDown={commitOnEnter}
            placeholder="0"
            className={FIELD}
          />
        </div>
      </div>
      {fill !== null && (
        <p className="mt-3 text-sm text-center text-accent">
          {t(
            `${value.tickets_sold} av ${value.available_tickets} biljetter sålda (${fill}% av kapaciteten)`,
            `${value.tickets_sold} of ${value.available_tickets} tickets sold (${fill}% of capacity)`
          )}
        </p>
      )}
    </div>
  )
}
