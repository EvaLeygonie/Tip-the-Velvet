import { useState } from 'react'
import { ChevronDown, Paperclip, Plus } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { PartPanel } from '@/components/admin/economy/PartPanel'
import {
  PAYABLE_SECTIONS,
  activeParts,
  dueBadge,
  paidTogglePatches,
  formatKr,
  summarizeLine,
  todayIso,
  type LineBadge,
  type PayableLine,
  type PayableWithFiles,
  type RowFile,
} from '@/lib/payables'
import type { PayablePatchInput } from '@/services/payablesService'
import type { PayableFile } from '@/types/types'

interface PayableLineRowProps {
  line: PayableLine
  onPatch: (id: string, patch: PayablePatchInput) => Promise<void>
  onUpload: (row: PayableWithFiles, files: File[]) => Promise<void>
  onOpenFile: (file: RowFile) => Promise<void>
  onDownloadFile: (file: RowFile) => Promise<void>
  onDownloadMany: (row: PayableWithFiles) => Promise<void>
  onDeleteFile: (row: PayableWithFiles, file: PayableFile) => Promise<void>
  // Hides a system row (with its travel) or deletes a row added by hand
  onRemoveLine: (line: PayableLine) => Promise<void>
  onRemoveTravel: (travel: PayableWithFiles) => Promise<void>
  // Adds (or brings back) the travel row of a person; returns it so the row can open
  onAddTravel: (job: PayableWithFiles) => Promise<PayableWithFiles | null>
  autoFocusLabel?: boolean
}

const BADGE_STYLE: Record<LineBadge, string> = {
  awaiting: 'border-red-500/50 text-red-400 bg-red-500/10',
  invoice: 'border-accent/50 text-accent bg-accent/10',
  partial: 'border-sky-400/50 text-sky-300 bg-sky-400/10',
  owed: 'border-orange-400/50 text-orange-300 bg-orange-400/10',
  topay: 'border-violet-400/50 text-violet-300 bg-violet-400/10',
  details: 'border-red-500/50 text-red-400 bg-red-500/10',
  paid: 'border-emerald-500/50 text-emerald-400 bg-emerald-500/15',
}

// One name on the list. Closed, every row has the same columns in the same places: the name with
// its gold role tag, everything to pay that person (job and travel added together), one status
// badge, the number of files and an arrow. Pressing the row opens the details, where the job and
// the travel each have their own amount.
export const PayableLineRow = ({
  line,
  onPatch,
  onUpload,
  onOpenFile,
  onDownloadFile,
  onDownloadMany,
  onDeleteFile,
  onRemoveLine,
  onRemoveTravel,
  onAddTravel,
  autoFocusLabel,
}: PayableLineRowProps) => {
  const { t } = useLanguage()
  const { main } = line
  const [open, setOpen] = useState(false)
  const [labelDraft, setLabelDraft] = useState(main.label)
  const [tagDraft, setTagDraft] = useState(main.tag ?? '')
  const [tagFocused, setTagFocused] = useState(false)

  const isManual = main.source_type === null
  // A person from the system can be given travel; a row added by hand has nothing to attach it to.
  const travelSlot = line.hasTravelSlot && !isManual
  const parts = activeParts(line)
  const sectionInfo = PAYABLE_SECTIONS.find((x) => x.key === main.section)
  // A row's own label wins; otherwise the badge names its section
  const tagText =
    main.tag?.trim() || (sectionInfo ? t(sectionInfo.badgeSv, sectionInfo.badgeEng) : '')
  const activeTravel = parts.find((p) => p !== main) ?? null
  const summary = summarizeLine(line)
  const due = dueBadge(line, todayIso())
  const { badge, repayName } = summary

  const badgeText: Record<LineBadge, string> = {
    awaiting: t('Väntar på faktura', 'Awaiting invoice'),
    invoice: t('Faktura mottagen', 'Invoice received'),
    partial: t('Delvis betald', 'Partly paid'),
    topay: t('Väntar på betalning', 'Awaiting payment'),
    details: t('Väntar på uppgifter', 'Awaiting details'),
    paid: t('✓ Betald', '✓ Paid'),
    owed: t(`Ska betalas till ${repayName}`, `Owed to ${repayName}`),
  }
  const allPaid = parts.every((p) => p.paid_on)
  const somePaid = parts.some((p) => p.paid_on)

  const togglePaid = () => {
    for (const { id, patch } of paidTogglePatches(summary, todayIso())) void onPatch(id, patch)
  }

  const handleAddTravel = async () => {
    const added = await onAddTravel(main)
    if (added) setOpen(true)
  }

  // Presses on the name field and the badge do their own thing; anywhere else toggles the row.
  const handleHeaderPress = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('input, button, a')) return
    setOpen((o) => !o)
  }

  // The badge of a row the board added: its own text, or the section's name when left empty
  const defaultTag = sectionInfo ? t(sectionInfo.badgeSv, sectionInfo.badgeEng) : ''
  const saveTag = () => {
    setTagFocused(false)
    const next = tagDraft.trim()
    const stored = next === '' || next === defaultTag ? null : next
    if (stored !== (main.tag ?? null)) void onPatch(main.id, { tag: stored })
  }

  const saveLabel = () => {
    const next = labelDraft.trim()
    if (next !== main.label) void onPatch(main.id, { label: next })
  }

  return (
    <div className="admin-panel velvet-surface" style={{ padding: 0 }}>
      <div
        onClick={handleHeaderPress}
        className="p-3 flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-2 cursor-pointer"
      >
        <input
          type="checkbox"
          checked={allPaid}
          ref={(el) => {
            if (el) el.indeterminate = somePaid && !allPaid
          }}
          onChange={togglePaid}
          aria-label={t(`${main.label} betald`, `${main.label} paid`)}
          title={allPaid ? t('Betald', 'Paid') : t('Markera som betald', 'Mark as paid')}
          className="h-5 w-5 shrink-0 accent-[#F9C31F] cursor-pointer"
        />

        <div className="flex-1 min-w-[140px] flex items-center gap-2 text-left">
          <span className="hidden sm:flex w-28 shrink-0">
            {isManual ? (
              <input
                type="text"
                value={tagFocused ? tagDraft : tagDraft.trim() || defaultTag}
                onFocus={() => setTagFocused(true)}
                onChange={(e) => setTagDraft(e.target.value)}
                onBlur={saveTag}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                maxLength={24}
                title={t('Tryck för att byta etikett', 'Press to change the badge')}
                aria-label={t('Etikett', 'Badge')}
                className="!w-full !p-0 !px-2 !py-0.5 !rounded-full !bg-accent/10 !border-accent/40 text-[10px] uppercase tracking-widest text-accent text-center truncate"
              />
            ) : (
              tagText && (
                <span className="w-full text-center truncate text-[10px] uppercase tracking-widest text-accent border border-accent/40 bg-accent/10 rounded-full px-2 py-0.5">
                  {tagText}
                </span>
              )
            )}
          </span>
          {isManual ? (
            <input
              type="text"
              value={labelDraft}
              autoFocus={autoFocusLabel}
              onChange={(e) => setLabelDraft(e.target.value)}
              onBlur={saveLabel}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              placeholder={t('Vad gäller det?', 'What is it for?')}
              title={t('Tryck för att byta namn', 'Press to rename')}
              aria-label={t('Beskrivning', 'Description')}
              style={{ width: `${Math.max(labelDraft.length, 15) + 2}ch` }}
              className="!w-auto !max-w-full !min-w-0 !p-0 !bg-transparent !border-0 !border-b !border-transparent hover:!border-accent/30 focus:!border-accent !rounded-none !shadow-none font-decorative text-sm text-foreground truncate"
            />
          ) : (
            <span className="font-decorative text-sm text-foreground truncate">{main.label}</span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3 shrink-0">
          <span className="w-28 flex justify-end">
            {due && (
              <span
                title={
                  due.daysLeft < 0
                    ? t(
                        `Förföll för ${-due.daysLeft} dagar sedan`,
                        `Was due ${-due.daysLeft} days ago`
                      )
                    : t(`${due.daysLeft} dagar kvar`, `${due.daysLeft} days left`)
                }
                className={`text-[11px] border rounded-full px-2.5 py-0.5 whitespace-nowrap ${
                  due.urgent
                    ? 'border-red-500/50 text-red-400 bg-red-500/10'
                    : 'border-accent/50 text-accent bg-accent/10'
                }`}
              >
                {due.daysLeft < 0 ? t('Förfallen', 'Overdue') : t('Förfaller', 'Due')}{' '}
                {new Date(`${due.dueOn}T00:00:00`).toLocaleDateString(t('sv-SE', 'en-GB'), {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            )}
          </span>

          <span className="w-24 flex flex-col items-end leading-tight">
            <span className="font-decorative text-base text-foreground">
              {summary.total > 0 ? formatKr(summary.total) : '–'}
            </span>
            {activeTravel && (
              <span className="text-[10px] text-foreground/40">
                {formatKr(Number(main.amount ?? 0))} + {formatKr(Number(activeTravel.amount ?? 0))}
              </span>
            )}
          </span>

          <span
            className="w-9 flex items-center justify-end gap-1 text-xs text-foreground/60"
            title={t(`${summary.files} filer`, `${summary.files} files`)}
          >
            {summary.files > 0 && (
              <>
                <Paperclip className="h-3.5 w-3.5" />
                {summary.files}
              </>
            )}
          </span>

          <span
            className={`w-40 text-center text-[11px] border rounded-full px-3 py-1 truncate ${BADGE_STYLE[badge]}`}
          >
            {badgeText[badge]}
          </span>

          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={
              open
                ? t(`Stäng detaljer, ${main.label}`, `Close details, ${main.label}`)
                : t(`Visa detaljer, ${main.label}`, `Show details, ${main.label}`)
            }
            className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-foreground/50 hover:text-accent"
          >
            <ChevronDown className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {open && (
        <>
          <PartPanel
            key={`panel-job-${main.id}`}
            kind="job"
            row={main}
            showKindTitle={activeTravel !== null}
            onPatch={onPatch}
            onUpload={onUpload}
            onOpenFile={onOpenFile}
            onDownloadFile={onDownloadFile}
            onDownloadMany={onDownloadMany}
            onDeleteFile={onDeleteFile}
            onRemove={() => onRemoveLine(line)}
            removeLabel={
              isManual ? t('Ta bort raden', 'Delete row') : t('Behövs inte', 'Not needed')
            }
          />
          {activeTravel && (
            <PartPanel
              key={`panel-travel-${activeTravel.id}`}
              kind="travel"
              row={activeTravel}
              showKindTitle
              onPatch={onPatch}
              onUpload={onUpload}
              onOpenFile={onOpenFile}
              onDownloadFile={onDownloadFile}
              onDownloadMany={onDownloadMany}
              onDeleteFile={onDeleteFile}
              onRemove={() => onRemoveTravel(activeTravel)}
              removeLabel={t('Ingen resa', 'No travel')}
            />
          )}
          {travelSlot && !activeTravel && (
            <div className="border-t border-accent/10 px-3 py-3 bg-black/20 last:rounded-b-xl">
              <button
                type="button"
                onClick={() => void handleAddTravel()}
                className="flex items-center gap-1 text-xs text-accent/80 border border-dashed border-accent/30 rounded-full px-3 py-1.5 hover:text-accent hover:border-accent/60"
              >
                <Plus className="h-3.5 w-3.5" />
                {t('Lägg till resa', 'Add travel')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
