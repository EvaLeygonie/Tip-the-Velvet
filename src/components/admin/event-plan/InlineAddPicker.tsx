import { useState } from 'react'
import { Plus, Loader2, X } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export interface InlineAddPickerItem {
  id: string
  label: string
  sublabel?: string | null
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
}

// A small "+" button that expands into a searchable list of existing contacts/sponsors —
// lets the board add someone directly into a specific Event Planning category (a role, a
// shift-less DJ slot, a sponsor slot) without leaving the page for Contacts. Direct
// request, 2026-09-02. Picking someone confirms them immediately via whatever onSelect
// does; there's no "create a brand new contact" path here on purpose — that still only
// happens on Contacts, same as before, to avoid duplicating that whole form inline.
export const InlineAddPicker = ({
  fetchItems,
  onSelect,
  placeholder,
  emptyMessage,
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

  if (!isOpen) {
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

  return (
    <div className="w-full admin-panel velvet-surface border border-accent/20 p-2.5 space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="flex-1 h-8 text-xs bg-black/40 border border-accent/20 rounded px-2 text-foreground focus:border-accent"
        />
        <button
          type="button"
          onClick={handleClose}
          className="text-foreground/50 hover:text-foreground/80 transition-colors shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="max-h-40 overflow-y-auto space-y-1">
        {loading ? (
          <div className="flex justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin text-accent/60" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-foreground/40 italic py-1">{emptyMessage}</p>
        ) : (
          filtered.map((item) => (
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
          ))
        )}
      </div>
      <p className="text-[10px] text-foreground/30 italic">
        {t('Ny person? Lägg till via Kontakter.', 'New person? Add them via Contacts.')}
      </p>
    </div>
  )
}
