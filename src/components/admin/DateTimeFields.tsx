interface DateTimeFieldsProps {
  // 'YYYY-MM-DDTHH:mm' (local time), or empty
  value: string | null | undefined
  onDateChange: (date: string) => void
  onTimeChange: (time: string) => void
}

// A date picker and a separate time field instead of one native datetime-local input, whose
// popup forces a time (defaulting to "now") while you are still just choosing the date.
export const DateTimeFields = ({ value, onDateChange, onTimeChange }: DateTimeFieldsProps) => {
  const date = value?.slice(0, 10) ?? ''
  const time = value?.slice(11, 16) ?? ''
  return (
    <div className="flex items-center gap-2 sm:justify-end">
      <input
        type="date"
        value={date}
        onChange={(e) => onDateChange(e.target.value)}
        className="editor-input !w-[7.25rem] !max-w-none shrink-0 !border-none !bg-transparent !p-0 !text-left text-xs [color-scheme:dark]"
      />
      <input
        type="time"
        value={time}
        disabled={!date}
        onChange={(e) => onTimeChange(e.target.value)}
        className="editor-input !w-[3.75rem] !max-w-none shrink-0 !border-none !bg-transparent !p-0 [&::-webkit-calendar-picker-indicator]:hidden !text-left text-xs [color-scheme:dark]"
      />
    </div>
  )
}
