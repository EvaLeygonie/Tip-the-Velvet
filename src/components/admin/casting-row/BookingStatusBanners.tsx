import type { LucideIcon } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import type { CastingApplicationWithActs } from '@/types/types'

interface BookingStatusBannersProps {
  application: CastingApplicationWithActs
  isAwaitingConfirmation: boolean | null
  isFullyConfirmed: boolean | null
  isCancelled: boolean | null
  isRejectedAndSent: boolean | null
  roleLabel: string | null
  RoleIcon: LucideIcon
}

// The coloured status box at the top of an expanded row (waiting / booked / removed / declined).
export const BookingStatusBanners = ({
  application,
  isAwaitingConfirmation,
  isFullyConfirmed,
  isCancelled,
  isRejectedAndSent,
  roleLabel,
  RoleIcon,
}: BookingStatusBannersProps) => {
  const { t } = useLanguage()
  return (
    <>
      {application.initial_reply_sent && (
        <>
          {isAwaitingConfirmation && (
            <div className="p-3 rounded border text-xs font-mono flex items-center justify-between gap-2 bg-amber-500/10 border-amber-500/30 text-amber-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <div>
                  <span className="font-bold uppercase tracking-wider block">
                    {t('Väntar på överenskommelse', 'Awaiting agreement')}
                  </span>
                  <span className="text-foreground/60 font-sans block mt-0.5">
                    {t(
                      'Länken till förhandlingssidan har skickats ut. Väntar på artistens bekräftelse.',
                      'Negotiation link sent. Waiting for artist approval.'
                    )}
                  </span>
                </div>
              </div>
              {roleLabel && (
                <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-accent/15 text-accent px-2 py-1 rounded-full">
                  <RoleIcon className="h-3 w-3" />
                  {roleLabel}
                </span>
              )}
            </div>
          )}
          {isFullyConfirmed && (
            <div className="p-3 rounded border text-xs font-mono flex items-center justify-between gap-2 bg-emerald-500/10 border-emerald-500/40 text-emerald-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-bold uppercase tracking-wider">
                  {t('Artist bokad och bekräftad', 'Artist booked and confirmed')}
                </span>
              </div>
              {roleLabel && (
                <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-accent/15 text-accent px-2 py-1 rounded-full">
                  <RoleIcon className="h-3 w-3" />
                  {roleLabel}
                </span>
              )}
            </div>
          )}
          {isCancelled && (
            <div className="p-3 rounded border text-xs font-mono flex items-center justify-between gap-2 bg-red-500/10 border-red-600/40 text-red-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <div>
                  <span className="font-bold uppercase tracking-wider block">
                    {t('Artist borttagen från showen', 'Artist removed from the show')}
                  </span>
                  <span className="text-foreground/60 font-sans block mt-0.5">
                    {t(
                      'Bekräftad bokning avbokades av admin.',
                      'Confirmed booking was cancelled by admin.'
                    )}
                  </span>
                </div>
              </div>
              {roleLabel && (
                <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-accent/15 text-accent px-2 py-1 rounded-full">
                  <RoleIcon className="h-3 w-3" />
                  {roleLabel}
                </span>
              )}
            </div>
          )}
          {isRejectedAndSent && (
            <div className="p-3 rounded border text-xs font-mono flex items-center gap-2 bg-red-500/10 border-red-500/30 text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <div>
                <span className="font-bold uppercase tracking-wider block">
                  {t('Nekad & Svarat', 'Declined & Notified')}
                </span>
                <span className="text-foreground/60 font-sans block mt-0.5">
                  {t('Svarsmail om avslag har skickats ut.', 'Rejection email has been sent.')}
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}
