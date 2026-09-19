import { Plus } from 'lucide-react'

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
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between mb-4">
      <div className="flex flex-col sm:flex-row gap-3 flex-1">
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full sm:max-w-xs text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white"
        />
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
      <button type="button" onClick={onAdd} className="btn-gold text-xs py-2 px-4 shrink-0">
        <Plus className="h-3.5 w-3.5" />
        {addLabel}
      </button>
    </div>
  )
}
