import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Loader2, X } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export interface InlineAddPickerItem {
  id: string
  label: string
  sublabel?: string | null
  // Optional grouping (e.g. the candidate's own staff role) — items are shown under a small
  // header per distinct groupKey, in whatever order the groups first appear in the array the
  // caller returns. Callers that don't care about grouping (sponsors today) just omit these
  // and get the old flat list back, unchanged.
  groupKey?: string
  groupLabel?: string
}

interface InlineAddPickerProps {
  // Fetched fresh each time the picker opens rather than kept in AdminEventPlan.tsx's own
  // state — contacts/sponsors are global lists unrelated to the currently selected event,
  // and this stays a rarely-used action, so a fresh fetch per open is simpler than another
  // piece of page-level state to keep in sync.
  fetchItems: () => Promise<InlineAddPickerItem[]>
  // Receives the whole item (not just its id) so callers already have the name on hand for
  // things like confirmStaffForEvent's staffName param, without a second lookup.
  onSelect: (item: InlineAddPickerItem) => Promise<void>
  placeholder: string
  emptyMessage: string
  // Swaps the default small "+" circle for a caller-supplied trigger (e.g. a dashed
  // placeholder slot matching SponsorSlotGrid's empty-slot look) while keeping this
  // component's open/search/select state and modal untouched. Used by the Music section's
  // DJ slot, direct feedback 2026-09-21.
  renderTrigger?: (onOpen: () => void) => ReactNode
}

// A small "+" button that expands into a searchable list of existing contacts/sponsors —
// lets the board add someone directly into a specific Event Planning category (a role, a
// shift-less DJ slot, a sponsor slot) without leaving the page for Contacts. Direct
// request, 2026-09-02. Picking someone confirms them immediately via whatever onSelect
// does; there's no "create a brand new contact" path here on purpose — that still only
// happens on Contacts, same as before, to avoid duplicating that whole form inline.
//
// Portaled to document.body as a centered overlay (matching ContactMailModal/
// AddToEventPopover) rather than expanding in place — it used to render inline in the
// role-section header, which pushed every section below it down the page whenever opened.
// Direct feedback, 2026-09-20.
export const InlineAddPicker = ({
  fetchItems,
  onSelect,
  placeholder,
  emptyMessage,
  renderTrigger,
}: InlineAddPickerProps) => {
  const { t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [items, setItems] = useState<InlineAddPickerItem[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [selectingId, setSelectingId] = useState<string | null>(null)

  const handleOpen = async () => {
    setIsOpen(true)
    setLoading(true)
    try {
      setItems(await fetchItems())
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setQuery('')
  }

  const handlePick = async (item: InlineAddPickerItem) => {
    setSelectingId(item.id)
    try {
      await onSelect(item)
      handleClose()
    } finally {
      setSelectingId(null)
    }
  }

  const renderItem = (item: InlineAddPickerItem) => (
    <button
      key={item.id}
      type="button"
      onClick={() => handlePick(item)}
      disabled={selectingId !== null}
      className="w-full text-left text-xs py-1.5 px-2 rounded hover:bg-accent/10 transition-colors flex items-center justify-between gap-2 disabled:opacity-50"
    >
      <span className="truncate">{item.label}</span>
      <span className="flex items-center gap-1.5 shrink-0">
        {item.sublabel && (
          <span className="text-foreground/40 truncate max-w-[100px]">{item.sublabel}</span>
        )}
        {selectingId === item.id && <Loader2 className="h-3 w-3 animate-spin" />}
      </span>
    </button>
  )

  if (!isOpen) {
    if (renderTrigger) return <>{renderTrigger(handleOpen)}</>
    return (
      <button
        type="button"
        onClick={handleOpen}
        title={placeholder}
        className="p-1 rounded-full border border-accent/20 text-accent/70 hover:text-accent hover:border-accent/50 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    )
  }

  const filtered = items.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()))

  // Grouped by groupKey, preserving whichever order the caller's array puts the groups in
  // (fetchStaffCandidatesForRole puts the role being added to first, then the rest in the
  // app's usual role order) — this component has no opinion of its own about which group
  // matters most, it just renders the order it's handed.
  const hasGroups = filtered.some((i) => i.groupKey)
  const groups: { key: string; label: string; items: InlineAddPickerItem[] }[] = []
  if (hasGroups) {
    const indexByKey = new Map<string, number>()
    for (const item of filtered) {
      const key = item.groupKey ?? ''
      let idx = indexByKey.get(key)
      if (idx === undefined) {
        idx = groups.length
        indexByKey.set(key, idx)
        groups.push({ key, label: item.groupLabel ?? '', items: [] })
      }
      groups[idx].items.push(item)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={handleClose}
    >
      <div
        className="velvet-surface border border-accent/30 max-w-sm w-full p-4 space-y-2.5 rounded-lg shadow-2xl relative"
        style={{ backgroundColor: '#141111' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="flex-1 h-9 text-sm bg-black/40 border border-accent/20 rounded px-2 text-foreground focus:border-accent"
          />
          <button
            type="button"
            onClick={handleClose}
            className="text-foreground/50 hover:text-foreground/80 transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto space-y-2.5">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-accent/60" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-foreground/40 italic py-1">{emptyMessage}</p>
          ) : hasGroups ? (
            groups.map((group) => (
              <div key={group.key} className="space-y-1">
                {group.label && (
                  <div className="text-[10px] uppercase tracking-wider text-accent/50 font-semibold px-2">
                    {group.label}
                  </div>
                )}
                {group.items.map(renderItem)}
              </div>
            ))
          ) : (
            <div className="space-y-1">{filtered.map(renderItem)}</div>
          )}
        </div>
        <p className="text-[10px] text-foreground/30 italic">
          {t('Ny person? Lägg till via Kontakter.', 'New person? Add them via Contacts.')}
        </p>
      </div>
    </div>,
    document.body
  )
}
