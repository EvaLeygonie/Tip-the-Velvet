import { useLanguage } from '@/contexts/LanguageContext'
import { dietaryCategoryLabel } from '@/lib/contactLabels'
import type { DietaryCategory } from '@/types/types'

const OPTIONS: DietaryCategory[] = ['all_eater', 'vegetarian', 'vegan']

interface DietaryCategoryPickerProps {
  value: DietaryCategory | null
  onChange: (value: DietaryCategory) => void
  className?: string
}

// Shared 3-way category picker — used inline on both the Artister roster (every confirmed
// performer eats) and the Bemanning row's expanded state (only staff/volunteers flagged
// needs_food). Fires immediately on change rather than needing a separate save step, since
// it's one field with no surrounding form.
export const DietaryCategoryPicker = ({
  value,
  onChange,
  className,
}: DietaryCategoryPickerProps) => {
  const { t } = useLanguage()

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value as DietaryCategory)}
      onClick={(e) => e.stopPropagation()}
      // w-auto used to size tight enough in Firefox that its custom dropdown-arrow glyph
      // overlapped the last character of "Eats everything" (the longest option) — a fixed
      // width with more right padding gives the arrow its own real space instead of
      // guessing at auto-sizing. Direct feedback 2026-10-07 (screenshot from Firefox
      // Developer Edition).
      className={`w-36 text-xs bg-black/40 border border-accent/20 rounded py-1 pl-2 pr-7 focus:border-accent text-white ${className ?? ''}`}
    >
      <option value="" disabled>
        {t('Mat...', 'Food...')}
      </option>
      {OPTIONS.map((opt) => (
        <option key={opt} value={opt}>
          {dietaryCategoryLabel(t, opt)}
        </option>
      ))}
    </select>
  )
}
