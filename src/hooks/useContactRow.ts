import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { useConfirm } from '@/contexts/ConfirmContext'

interface UseContactRowOptions<P> {
  id: string
  name: string
  isNew?: boolean
  onSave: (id: string, patch: P, isNew: boolean) => Promise<void>
  onDelete: (id: string) => Promise<void>
  // Shown when the database refuses the delete because something still points at the row
  // (foreign key violation). Rows without any such link can leave it out.
  linkedDeleteMessage?: { sv: string; eng: string }
  // Lets a row turn a known save error into its own message (e.g. a unique constraint).
  saveErrorMessage?: (err: { code?: string; message?: string }) => string | null
}

// The open/save/delete behaviour every Contacts row shares (staff, board, sponsors, venues,
// clubs): the expand state, a save that collapses the row, and a confirmed delete. Each row
// keeps its own draft fields and builds the patch it wants saved.
export const useContactRow = <P>({
  id,
  name,
  isNew = false,
  onSave,
  onDelete,
  linkedDeleteMessage,
  saveErrorMessage,
}: UseContactRowOptions<P>) => {
  const { t } = useLanguage()
  const confirm = useConfirm()
  const [isExpanded, setIsExpanded] = useState(isNew)
  const [isSaving, setIsSaving] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Closing the tall open form shrinks the page and the browser would jump the scroll
  // position, so keep this row where it is on screen.
  const collapseInPlace = () => {
    const top = rootRef.current?.getBoundingClientRect().top ?? 0
    setIsExpanded(false)
    requestAnimationFrame(() => {
      const newTop = rootRef.current?.getBoundingClientRect().top ?? top
      window.scrollBy(0, newTop - top)
    })
  }

  // `build` returns the patch to save, or null to stop (after showing its own message, e.g.
  // a missing required field or a failed upload). `afterSave` runs once the save has succeeded.
  const save = async (build: () => P | null | Promise<P | null>, afterSave?: () => void) => {
    setIsSaving(true)
    try {
      const patch = await build()
      if (patch === null) return
      await onSave(id, patch, isNew)
      afterSave?.()
      if (!isNew) collapseInPlace()
    } catch (err) {
      console.error(err)
      const message = saveErrorMessage?.(err as { code?: string; message?: string })
      toast.error(message ?? t('Kunde inte spara.', 'Could not save.'))
    } finally {
      setIsSaving(false)
    }
  }

  const remove = async () => {
    const confirmed = await confirm({
      message: t(
        `Är du säker på att du vill radera ${name}?`,
        `Are you sure you want to delete ${name}?`
      ),
      destructive: true,
    })
    if (!confirmed) return
    try {
      await onDelete(id)
    } catch (err) {
      console.error(err)
      if (linkedDeleteMessage && (err as { code?: string })?.code === '23503') {
        toast.error(t(linkedDeleteMessage.sv, linkedDeleteMessage.eng))
      } else {
        toast.error(t('Kunde inte radera.', 'Could not delete.'))
      }
    }
  }

  return {
    isExpanded,
    setIsExpanded,
    toggle: () => setIsExpanded((open) => !open),
    isSaving,
    rootRef,
    save,
    remove,
  }
}
