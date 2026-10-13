import { describe, it, expect, vi } from 'vitest'

// lib/utils pulls in heic2any, which needs a browser Worker.
vi.mock('heic2any', () => ({ default: vi.fn() }))

import { buildCastingMailDraft } from '../lib/castingMail'
import type { CastingApplicationWithActs } from '../types/types'

const application = (overrides: Partial<CastingApplicationWithActs> = {}) =>
  ({
    id: 'app-1',
    access_token: 'tok-1',
    performer_name: 'Mimi Velvet',
    review_status: 'yes',
    casting_application_acts: [
      { id: 'a1', act_title: 'Fire Act', is_selected: true },
      { id: 'a2', act_title: 'Fan Dance', is_selected: false },
    ],
    ...overrides,
  }) as unknown as CastingApplicationWithActs

const terms = {
  isSv: false,
  offerFee: 2000,
  needsTravel: true,
  travelAmount: 500,
  needsAccom: false,
  lineupRole: 'performer' as const,
}

describe('buildCastingMailDraft', () => {
  it('writes the offer with its terms and the booking link for a yes', () => {
    const draft = buildCastingMailDraft({ application: application(), ...terms })
    expect(draft.defaultBody).toContain('Fee: 2000 SEK')
    expect(draft.defaultBody).toContain('Travel costs: 500 SEK')
    expect(draft.defaultBody).toContain('Accommodation: Not provided')
    expect(draft.defaultBody).toContain('/casting/confirm/app-1?token=tok-1')
  })

  it('only names the chosen acts in an offer, but all submitted acts in a decline', () => {
    const yes = buildCastingMailDraft({ application: application(), ...terms })
    expect(yes.defaultBody).toContain('Fire Act')
    expect(yes.defaultBody).not.toContain('Fan Dance')
    const no = buildCastingMailDraft({
      application: application({ review_status: 'no' }),
      ...terms,
    })
    expect(no.defaultBody).toContain('Fire Act')
    expect(no.defaultBody).toContain('Fan Dance')
  })

  it('mentions host and headliner roles but not the default performer role', () => {
    const host = buildCastingMailDraft({ application: application(), ...terms, lineupRole: 'host' })
    expect(host.defaultBody).toContain("booked as this show's Host")
    const plain = buildCastingMailDraft({ application: application(), ...terms })
    expect(plain.defaultBody).not.toContain('Role:')
  })

  it('describes travel that is offered but not yet priced, and no travel', () => {
    const open = buildCastingMailDraft({ application: application(), ...terms, travelAmount: 0 })
    expect(open.travelFormatted).toBe('Offered (to be discussed)')
    const none = buildCastingMailDraft({ application: application(), ...terms, needsTravel: false })
    expect(none.travelFormatted).toBe('No travel compensation')
  })

  it('writes Swedish when the applicant language is Swedish', () => {
    const draft = buildCastingMailDraft({ application: application(), ...terms, isSv: true })
    expect(draft.defaultBody).toContain('Gage: 2000 SEK')
  })

  it('has no draft for a pending application', () => {
    const draft = buildCastingMailDraft({
      application: application({ review_status: 'pending' }),
      ...terms,
    })
    expect(draft.defaultBody).toBe('')
  })
})
