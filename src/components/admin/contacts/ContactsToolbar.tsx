import { Plus } from 'lucide-react'

interface ContactsToolbarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder: string
  filterValue?: string
  onFilterChange?: (value: string) => void
  filterOptions?: { value: string; label: string }[]
  filterAllLabel?: string
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
      </div>
      <button type="button" onClick={onAdd} className="btn-gold text-xs py-2 px-4 shrink-0">
        <Plus className="h-3.5 w-3.5" />
        {addLabel}
      </button>
    </div>
  )
}
