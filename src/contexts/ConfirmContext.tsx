/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '@/contexts/LanguageContext'

export interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  // Red confirm button, and focus starts on Cancel so Enter can't delete by accident.
  destructive?: boolean
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | undefined>(undefined)

interface PendingConfirm extends ConfirmOptions {
  resolve: (confirmed: boolean) => void
}

// A drop-in, on-brand replacement for window.confirm:
//   const confirm = useConfirm()
//   if (!(await confirm({ message: '...', destructive: true }))) return
export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useLanguage()
  const [pending, setPending] = useState<PendingConfirm | null>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)

  const confirm = useCallback<ConfirmFn>(
    (options) =>
      new Promise<boolean>((resolve) => {
        setPending((previous) => {
          // A second confirm while one is open counts as cancelling the first.
          previous?.resolve(false)
          return { ...options, resolve }
        })
      }),
    []
  )

  const settle = useCallback((confirmed: boolean) => {
    setPending((current) => {
      current?.resolve(confirmed)
      return null
    })
  }, [])

  useEffect(() => {
    if (!pending) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') settle(false)
    }
    window.addEventListener('keydown', onKeyDown)
    ;(pending.destructive ? cancelRef : confirmRef).current?.focus()
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [pending, settle])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending &&
        createPortal(
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 text-left"
            onClick={() => settle(false)}
          >
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              aria-describedby="confirm-message"
              className="velvet-surface border border-accent/30 w-fit min-w-[16rem] max-w-sm px-4 py-5 space-y-4 rounded-lg shadow-2xl"
              style={{ backgroundColor: '#141111' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h4 id="confirm-title" className="font-decorative text-lg text-accent text-center">
                {pending.title ?? t('Är du säker?', 'Are you sure?')}
              </h4>
              <p id="confirm-message" className="text-sm text-foreground/80 text-center">
                {pending.message}
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  ref={cancelRef}
                  type="button"
                  onClick={() => settle(false)}
                  className="btn-action !min-w-[7rem] text-accent border-accent/40 bg-accent/5 hover:bg-accent hover:text-black"
                >
                  {pending.cancelLabel ?? t('Avbryt', 'Cancel')}
                </button>
                <button
                  ref={confirmRef}
                  type="button"
                  onClick={() => settle(true)}
                  className={`${pending.destructive ? 'btn-red' : 'btn-gold'} !min-w-[7rem]`}
                >
                  {pending.confirmLabel ??
                    (pending.destructive ? t('Radera', 'Delete') : t('Bekräfta', 'Confirm'))}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </ConfirmContext.Provider>
  )
}

export const useConfirm = (): ConfirmFn => {
  const context = useContext(ConfirmContext)
  if (!context) throw new Error('useConfirm must be used within a ConfirmProvider')
  return context
}
