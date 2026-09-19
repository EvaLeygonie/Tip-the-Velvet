import { useState, type ReactNode } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { createManualShowSegment, reorderShowProgram } from '@/services/eventService'
import { ShowProgramRow } from './ShowProgramRow'
import type { AdminEventActRow } from '@/services/eventService'

interface ShowProgramBoardProps {
  acts: AdminEventActRow[]
  eventId: string
  onUpdated: (id: string, patch: Partial<AdminEventActRow>) => void
  onRemoved: (id: string) => void
  onAdded: (row: AdminEventActRow) => void
  onReordered: (acts: AdminEventActRow[]) => void
}

const SET_CONTAINER_ID: Record<1 | 2, string> = { 1: 'set-1', 2: 'set-2' }

const findSetNumber = (
  id: string,
  set1: AdminEventActRow[],
  set2: AdminEventActRow[]
): 1 | 2 | null => {
  if (id === SET_CONTAINER_ID[1]) return 1
  if (id === SET_CONTAINER_ID[2]) return 2
  if (set1.some((a) => a.id === id)) return 1
  if (set2.some((a) => a.id === id)) return 2
  return null
}

// A set's droppable region, wrapping its SortableContext — needed so dragging into an empty
// set (or past its last row) still registers as a valid drop target, not just dragging
// directly onto another row.
const SetDropZone = ({ id, children }: { id: string; children: ReactNode }) => {
  const { setNodeRef } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className="space-y-2 min-h-[3rem]">
      {children}
    </div>
  )
}

// Two sets with a break in between — the show always runs in two halves. Any segment (real
// act or manual/constant) can be moved within or across the divide two ways: dragging
// (dnd-kit's standard multi-container sortable pattern, one shared DndContext over both
// sets' SortableContexts) or the row's own up/down arrows, which also cross the divide at
// the edges — see handleMove. Both were kept side by side per direct feedback 2026-09-21
// that drag-and-drop alone was too fiddly to land precisely; the arrows are the reliable
// fallback. display_order stays one global sequence spanning both sets (Set 1 entirely
// before Set 2), same as before this feature, so PDFs/position numbers keep reading it as
// one flat ordered list; set_number is purely a grouping tag layered on top.
export const ShowProgramBoard = ({
  acts,
  eventId,
  onUpdated,
  onRemoved,
  onAdded,
  onReordered,
}: ShowProgramBoardProps) => {
  const { t } = useLanguage()
  const [addingTo, setAddingTo] = useState<1 | 2 | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const set1 = acts.filter((a) => a.set_number === 1)
  const set2 = acts.filter((a) => a.set_number === 2)

  // Pointer-first collision detection: resolve to whatever droppable the cursor is literally
  // over, falling back to closestCenter only when the pointer isn't over anything (e.g. right
  // at the very edge of a set). Plain closestCenter alone picked the nearest item by
  // center-distance even across the visual gap between Set 1 and Set 2, which made drops
  // land somewhere other than where the cursor actually was — direct feedback 2026-09-21
  // that drags "don't stick" where dropped.
  const collisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args)
    return pointerCollisions.length > 0 ? pointerCollisions : closestCenter(args)
  }

  // Shared by drag-and-drop and the up/down arrows below — recomputes one global
  // display_order sequence (Set 1's rows, in order, then Set 2's) from two already-ordered
  // per-set arrays, applies it locally, and persists it.
  const commitSets = (newSet1: AdminEventActRow[], newSet2: AdminEventActRow[]) => {
    const combined = [...newSet1, ...newSet2].map((a, index) => ({
      ...a,
      display_order: index,
    }))
    onReordered(combined)
    reorderShowProgram(
      combined.map((a) => ({ id: a.id, display_order: a.display_order, set_number: a.set_number }))
    ).catch((err) => console.error('Kunde inte spara ny ordning:', err))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeSet = findSetNumber(String(active.id), set1, set2)
    const overSet = findSetNumber(String(over.id), set1, set2)
    if (!activeSet || !overSet) return

    if (activeSet === overSet) {
      // Same-set reorder: arrayMove on that one list. (Previously this shared code path with
      // the cross-set branch below, which spliced the active item out of what turned out to
      // be the *same array reference* as the destination list before computing the insertion
      // index — silently shifting every index after it. That off-by-one was the root cause
      // of drops landing in the wrong place.)
      const rows = activeSet === 1 ? set1 : set2
      const oldIndex = rows.findIndex((a) => a.id === active.id)
      const newIndex = rows.findIndex((a) => a.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return
      const reordered = arrayMove(rows, oldIndex, newIndex)
      commitSets(activeSet === 1 ? reordered : set1, activeSet === 1 ? set2 : reordered)
    } else {
      const sourceRows = [...(activeSet === 1 ? set1 : set2)]
      const destRows = [...(overSet === 1 ? set1 : set2)]
      const activeIndex = sourceRows.findIndex((a) => a.id === active.id)
      if (activeIndex === -1) return
      const [movedItem] = sourceRows.splice(activeIndex, 1)
      const overIndex = destRows.findIndex((a) => a.id === over.id)
      const insertAt = overIndex === -1 ? destRows.length : overIndex
      destRows.splice(insertAt, 0, { ...movedItem, set_number: overSet })

      commitSets(activeSet === 1 ? sourceRows : destRows, activeSet === 1 ? destRows : sourceRows)
    }
  }

  // Up/down arrows — a plain, always-reliable fallback alongside drag-and-drop. Re-added per
  // direct feedback 2026-09-21 (drag-and-drop alone was fiddly to land precisely). Normally
  // swaps with the adjacent item in the same set; at the very top of Set 2 or bottom of
  // Set 1, "up"/"down" now also crosses the divide — landing at the near edge of the other
  // set (its first item's row from Set 1's last, or vice versa) rather than being a no-op,
  // per direct feedback that the arrows should be able to move a row between sets too.
  const handleMove = (id: string, direction: -1 | 1) => {
    const inSet1 = set1.some((a) => a.id === id)
    const setNumber: 1 | 2 = inSet1 ? 1 : 2
    const rows = inSet1 ? set1 : set2
    const index = rows.findIndex((a) => a.id === id)
    if (index === -1) return
    const otherIndex = index + direction

    if (otherIndex >= 0 && otherIndex < rows.length) {
      // Normal same-set swap.
      const a = rows[index]
      const b = rows[otherIndex]
      const swapped = [...rows]
      swapped[index] = b
      swapped[otherIndex] = a
      commitSets(setNumber === 1 ? swapped : set1, setNumber === 1 ? set2 : swapped)
      return
    }

    // At an edge — cross into the other set if there is one to cross into.
    if (direction === 1 && setNumber === 1) {
      const item = set1[index]
      commitSets(
        set1.filter((a) => a.id !== id),
        [{ ...item, set_number: 2 }, ...set2]
      )
    } else if (direction === -1 && setNumber === 2) {
      const item = set2[index]
      commitSets(
        [...set1, { ...item, set_number: 1 }],
        set2.filter((a) => a.id !== id)
      )
    }
    // Otherwise (top of Set 1 going up, or bottom of Set 2 going down): nothing to cross
    // into, so it's a genuine no-op — same as isFirst/isLast already disabling the button.
  }

  const handleAddSegment = async (setNumber: 1 | 2) => {
    setAddingTo(setNumber)
    try {
      const row = await createManualShowSegment(eventId, setNumber)
      onAdded(row)
    } catch (err) {
      console.error(err)
    } finally {
      setAddingTo(null)
    }
  }

  const renderSet = (setNumber: 1 | 2, rows: AdminEventActRow[], offset: number) => (
    <div className="space-y-2">
      <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
        <SetDropZone id={SET_CONTAINER_ID[setNumber]}>
          {rows.map((row, index) => (
            <ShowProgramRow
              key={row.id}
              row={row}
              position={offset + index + 1}
              // Only the very first row of Set 1 and the very last row of Set 2 are
              // genuine dead ends — every other edge (Set 1's last row, Set 2's first)
              // crosses into the other set instead of being disabled, see handleMove.
              isFirst={setNumber === 1 && index === 0}
              isLast={setNumber === 2 && index === rows.length - 1}
              onMoveUp={() => handleMove(row.id, -1)}
              onMoveDown={() => handleMove(row.id, 1)}
              onRemoved={onRemoved}
              onUpdated={onUpdated}
            />
          ))}
        </SetDropZone>
      </SortableContext>
      <button
        type="button"
        onClick={() => handleAddSegment(setNumber)}
        disabled={addingTo === setNumber}
        className="w-full h-9 border border-dashed border-accent/15 rounded flex items-center justify-center gap-1.5 text-xs text-foreground/40 italic hover:border-accent/40 hover:text-accent/70 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        {t('Lägg till moment', 'Add segment')}
      </button>
    </div>
  )

  return (
    <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        <h4 className="font-decorative text-lg text-accent text-center">{t('Set 1', 'Set 1')}</h4>
        {renderSet(1, set1, 0)}
      </div>

      <div className="flex items-center gap-3 py-4">
        <div className="gold-divider" />
        <span className="text-xs uppercase tracking-widest text-foreground/40 shrink-0">
          {t('Paus', 'Break')}
        </span>
        <div className="gold-divider" />
      </div>

      <div className="space-y-4">
        <h4 className="font-decorative text-lg text-accent text-center">{t('Set 2', 'Set 2')}</h4>
        {renderSet(2, set2, set1.length)}
      </div>
    </DndContext>
  )
}
