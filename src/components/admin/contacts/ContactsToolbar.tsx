import { useLanguage } from '@/contexts/LanguageContext'
import { Plus, X } from 'lucide-react'

interface ContactsToolbarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder: string
  filterValue?: string
  onFilterChange?: (value: string) => void
  filterOptions?: { value: string; label: string }[]
  filterAllLabel?: string
  // A single generic on/off filter slot — e.g. Staff & Volunteers' "already worked with us"
  // toggle — kept optional and neutrally named so other tabs can reuse it later instead of
  // each growing their own bespoke toggle button. Direct feedback 2026-09-21.
  toggleValue?: boolean
  onToggleChange?: (value: boolean) => void
  toggleLabel?: string
  onAdd: () => void
  addLabel: string
}

export const ContactsToolbar = ({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filterValue,
  onFilterChange,
  filterOptions,
  filterAllLabel,
  toggleValue,
  onToggleChange,
  toggleLabel,
  onAdd,
  addLabel,
}: ContactsToolbarProps) => {
  const { t } = useLanguage()
  const hasActiveFilter = Boolean(searchValue || filterValue || toggleValue)
  const clearAll = () => {
    onSearchChange('')
    onFilterChange?.('')
    onToggleChange?.(false)
  }
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between mb-4">
      <div className="flex flex-col sm:flex-row gap-3 flex-1">
        <div className="relative w-full sm:max-w-xs">
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full text-sm bg-black/40 border border-accent/20 rounded p-2 pr-8 focus:border-accent text-white"
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              title={t('Rensa sökningen', 'Clear the search')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground/50 hover:text-accent"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {filterOptions && onFilterChange && (
          <select
            value={filterValue}
            onChange={(e) => onFilterChange(e.target.value)}
            className="admin-select"
          >
            <option value="">{filterAllLabel}</option>
            {filterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
        {onToggleChange && (
          <button
            type="button"
            onClick={() => onToggleChange(!toggleValue)}
            className={
              toggleValue
                ? 'text-xs py-2 px-3 rounded border border-accent bg-accent text-black transition-colors shrink-0'
                : 'text-xs py-2 px-3 rounded border border-accent/20 text-accent/70 hover:border-accent/50 hover:text-accent transition-colors shrink-0'
            }
          >
            {toggleLabel}
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {hasActiveFilter && (
          <button
            type="button"
            onClick={clearAll}
            title={t('Rensa alla filter', 'Clear all filters')}
            aria-label={t('Rensa alla filter', 'Clear all filters')}
            className="p-2 rounded border border-red-500/60 text-red-400 hover:bg-red-500 hover:text-black transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button type="button" onClick={onAdd} className="btn-gold text-xs py-2 px-4 shrink-0">
          <Plus className="h-3.5 w-3.5" />
          {addLabel}
        </button>
      </div>
    </div>
  )
}
