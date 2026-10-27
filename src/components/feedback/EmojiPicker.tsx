import { useEffect, useRef, useState } from 'react'
import { Smile } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

// A small hand-picked set (the mood of a night out) instead of a full emoji library: enough for a
// review, and guests can still paste or type any other emoji with their own keyboard.
const EMOJIS = [
  '❤️',
  '🖤',
  '💜',
  '💖',
  '😍',
  '🥰',
  '🤩',
  '😊',
  '😂',
  '🥳',
  '😘',
  '🤗',
  '🔥',
  '✨',
  '🌟',
  '💫',
  '👏',
  '🙌',
  '💪',
  '🎉',
  '🎭',
  '🎪',
  '💃',
  '🪩',
  '🎶',
  '🥂',
  '👑',
  '🎩',
  '🦋',
  '💋',
  '🌹',
  '🙏',
]

interface EmojiPickerProps {
  onPick: (emoji: string) => void
}

// The button sits in the corner of a text field (the parent is positioned relative to it) and opens
// a grid above itself. Picking an emoji hands it to onPick, which inserts it where the cursor is.
export const EmojiPicker = ({ onPick }: EmojiPickerProps) => {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('touchstart', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('touchstart', close)
    }
  }, [open])

  return (
    <div ref={rootRef} className="absolute bottom-2 right-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={t('Lägg till en emoji', 'Add an emoji')}
        aria-label={t('Lägg till en emoji', 'Add an emoji')}
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center rounded-full text-accent/70 transition-colors hover:bg-accent/10 hover:text-accent"
      >
        <Smile className="h-5 w-5" />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute bottom-full right-0 z-30 mb-2 grid w-64 grid-cols-8 gap-0.5 rounded-lg border border-accent/30 bg-background p-2 shadow-2xl"
        >
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onPick(emoji)}
              className="flex h-7 w-7 items-center justify-center rounded text-lg leading-none transition-colors hover:bg-accent/15"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
