import { describe, expect, it, vi } from 'vitest'
import { createStageKittenPdf, type EventDocContext } from '@/lib/eventDocuments'

// lib/utils pulls in heic2any, which needs a browser Worker.
vi.mock('heic2any', () => ({ default: vi.fn() }))
// The PDF module also imports services that create a Supabase client; not needed here.
vi.mock('@/services/eventService', () => ({}))
vi.mock('@/services/eventInfoService', () => ({}))
vi.mock('@/services/vipListService', () => ({}))
vi.mock('@/lib/supabase', () => ({ supabase: {} }))

// A stand-in for jsPDF that only records which page every table cell (rect) is drawn on, so the
// layout logic can be checked without rendering anything. The whole PDF module is built around
// the jsPDF API, so any other method just returns the document.
const drawn = vi.hoisted(() => ({ rects: [] as number[] }))
vi.mock('jspdf', () => {
  class FakePdf {
    page = 1
    rect() {
      drawn.rects.push(this.page)
      return this
    }
    addPage() {
      this.page += 1
      return this
    }
    splitTextToSize(text: string) {
      return text.split('\n')
    }
    getNumberOfPages() {
      return this.page
    }
    getTextWidth() {
      return 10
    }
    constructor() {
      return new Proxy(this, {
        get: (target, prop) => (prop in target ? (target as never)[prop] : () => target),
      })
    }
  }
  return { jsPDF: FakePdf }
})

const t = (sv: string) => sv

// One act per call; notes of varying length so the tables differ in height.
const act = (i: number, noteLines: number) =>
  ({
    id: `a${i}`,
    set_number: i <= 7 ? 1 : 2,
    act_name: `Akt ${i}`,
    performer: { id: `p${i}`, performer_name: `Artist ${i}` },
    stage_preparations: Array.from({ length: noteLines }, (_, n) => `rad ${n}`).join('\n'),
    pick_up_cleaning: Array.from({ length: Math.ceil(noteLines / 2) }, (_, n) => `rad ${n}`).join(
      '\n'
    ),
  }) as unknown as EventDocContext['acts'][number]

describe('set list PDF', () => {
  it('never splits an act table across two pages', () => {
    drawn.rects.length = 0
    const acts = Array.from({ length: 14 }, (_, i) => act(i + 1, 2 + ((i * 5) % 9)))
    createStageKittenPdf({
      t,
      eventTitle: 'Test',
      acts,
      performers: [],
      groupedStaff: [],
      vipEntries: [],
      organizers: [],
      eventInfo: null,
    } as unknown as EventDocContext)

    // Every act draws 8 rects (4 rows × 2 cells): all 8 must be on the same page.
    expect(drawn.rects.length).toBe(14 * 8)
    for (let i = 0; i < drawn.rects.length; i += 8) {
      expect(new Set(drawn.rects.slice(i, i + 8)).size).toBe(1)
    }
    // And the test really exercises page breaks.
    expect(Math.max(...drawn.rects)).toBeGreaterThan(1)
  })
})
