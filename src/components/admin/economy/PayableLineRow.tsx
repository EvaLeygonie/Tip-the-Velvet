import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { PartCell } from '@/components/admin/economy/PartCell'
import { PartPanel } from '@/components/admin/economy/PartPanel'
import type { PayableLine, PayableWithFiles } from '@/lib/payables'
import type { PayablePatchInput } from '@/services/payablesService'
import type { PayableFile } from '@/types/types'

interface PayableLineRowProps {
  line: PayableLine
  onPatch: (id: string, patch: PayablePatchInput) => Promise<void>
  onUpload: (row: PayableWithFiles, files: File[]) => Promise<void>
  onOpenFile: (file: PayableFile) => Promise<void>
  onDeleteFile: (row: PayableWithFiles, file: PayableFile) => Promise<void>
  // Hides a system row (with its travel) or deletes a row added by hand
  onRemoveLine: (line: PayableLine) => Promise<void>
  onRemoveTravel: (travel: PayableWithFiles) => Promise<void>
  // Adds (or brings back) the travel row of a person; returns it so the panel can open
  onAddTravel: (job: PayableWithFiles) => Promise<PayableWithFiles | null>
  autoFocusLabel?: boolean
}

// One name on the list: the name with its gold role tag on the left, then the job slot and the
// travel slot on the right. Every line has both slots so the list stays even; the travel icon is
// quiet when nothing is booked for travel.
export const PayableLineRow = ({
  line,
  onPatch,
  onUpload,
  onOpenFile,
  onDeleteFile,
  onRemoveLine,
  onRemoveTravel,
  onAddTravel,
  autoFocusLabel,
}: PayableLineRowProps) => {
  const { t } = useLanguage()
  const { main, travel } = line
  const [open, setOpen] = useState<'job' | 'travel' | null>(null)
  const [labelDraft, setLabelDraft] = useState(main.label)

  const isManual = main.source_type === null
  // A person from the system can be given travel; a row added by hand has nothing to attach it to.
  const travelSlot = line.hasTravelSlot && !isManual
  const activeTravel = travel && !travel.dismissed ? travel : null
  const repayName = [main.advanced_by, activeTravel?.advanced_by].find(Boolean)

  const handleTravelPress = async () => {
    if (activeTravel) {
      setOpen(open === 'travel' ? null : 'travel')
      return
    }
    const added = await onAddTravel(main)
    if (added) setOpen('travel')
  }

  const saveLabel = () => {
    const next = labelDraft.trim()
    if (next !== main.label) void onPatch(main.id, { label: next })
  }

  return (
    <div className="admin-panel velvet-surface overflow-hidden" style={{ padding: 0 }}>
      <div className="p-3 flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex-1 min-w-[180px] text-left">
          {isManual ? (
            <input
              type="text"
              value={labelDraft}
              autoFocus={autoFocusLabel}
              onChange={(e) => setLabelDraft(e.target.value)}
              onBlur={saveLabel}
              placeholder={t('Vad gäller det?', 'What is it for?')}
              aria-label={t('Beskrivning', 'Description')}
              className="w-full bg-transparent border-0 border-b border-accent/20 px-0 py-1 font-decorative text-sm text-foreground focus:outline-none focus:border-accent"
            />
          ) : (
            <span className="font-decorative text-sm text-foreground block truncate">
              {main.label}
            </span>
          )}
          {main.tag && (
            <span className="inline-block mt-1 text-[10px] uppercase tracking-widest text-accent border border-accent/40 bg-accent/10 rounded-full px-2 py-0.5">
              {main.tag}
            </span>
          )}
          {repayName && (
            <p className="text-[11px] text-sky-300 mt-1">
              {t(`Betala tillbaka ${repayName}`, `Repay ${repayName}`)}
            </p>
          )}
        </div>

        <PartCell
          key={`job-${main.id}`}
          kind="job"
          row={main}
          hasSlot
          open={open === 'job'}
          personName={main.label || t('raden', 'the row')}
          onToggle={() => setOpen(open === 'job' ? null : 'job')}
          onPatch={onPatch}
        />
        <PartCell
          key={`travel-${activeTravel?.id ?? 'none'}`}
          kind="travel"
          row={activeTravel}
          hasSlot={travelSlot}
          open={open === 'travel'}
          personName={main.label}
          onToggle={() => void handleTravelPress()}
          onPatch={onPatch}
        />
      </div>

      {open === 'job' && (
        <PartPanel
          key={`panel-job-${main.id}`}
          kind="job"
          row={main}
          personName={main.label}
          isManualMain={isManual}
          onPatch={onPatch}
          onUpload={onUpload}
          onOpenFile={onOpenFile}
          onDeleteFile={onDeleteFile}
          onRemove={() => onRemoveLine(line)}
          removeLabel={isManual ? t('Ta bort raden', 'Delete row') : t('Behövs inte', 'Not needed')}
        />
      )}
      {open === 'travel' && activeTravel && (
        <PartPanel
          key={`panel-travel-${activeTravel.id}`}
          kind="travel"
          row={activeTravel}
          personName={main.label}
          isManualMain={false}
          onPatch={onPatch}
          onUpload={onUpload}
          onOpenFile={onOpenFile}
          onDeleteFile={onDeleteFile}
          onRemove={() => onRemoveTravel(activeTravel)}
          removeLabel={t('Ingen resa', 'No travel')}
        />
      )}
    </div>
  )
}
