import { groupIndexOf, groupsOf } from './builderDoc'
import type { Block } from './builderDoc'
import type { QuestionType } from '@/types/operations'

/**
 * What a finished drag means. Kept apart from the drag library so every case (a library item dropped between blocks, a block
 * moved into another section, a whole section moved) is a plain function that can be tested.
 */

export const LIBRARY_PREFIX = 'lib:'
export const CANVAS_END = 'canvas-end'

export const libraryId = (type: QuestionType): string => `${LIBRARY_PREFIX}${type}`
export const isLibraryId = (id: string): boolean => id.startsWith(LIBRARY_PREFIX)
export const libraryType = (id: string): QuestionType => id.slice(LIBRARY_PREFIX.length) as QuestionType

export type DropResult =
  | { kind: 'insert'; blockType: QuestionType; index: number }
  | { kind: 'move'; key: string; toIndex: number }
  | { kind: 'reorderGroups'; from: number; to: number }
  | null

/**
 * @param activeId        a block key, or `lib:<type>` for an item dragged out of the library
 * @param overId          a block key, `canvas-end`, or null when dropped on nothing
 * @param pointerBelowMid for a library drop on a block: was the dragged item below that block's middle (so: insert after it)
 */
export function resolveDrop(activeId: string, overId: string | null, blocks: Block[], pointerBelowMid: boolean): DropResult {
  if (overId === null || overId === activeId) return null

  if (isLibraryId(activeId)) {
    const blockType = libraryType(activeId)
    if (overId === CANVAS_END) return { kind: 'insert', blockType, index: blocks.length }
    const overIndex = blocks.findIndex((b) => b.key === overId)
    if (overIndex < 0) return null

    return { kind: 'insert', blockType, index: overIndex + (pointerBelowMid ? 1 : 0) }
  }

  const active = blocks.find((b) => b.key === activeId)
  if (!active) return null

  if (active.type === 'section') {
    const from = groupIndexOf(blocks, activeId)
    const groups = groupsOf(blocks)
    const to = overId === CANVAS_END ? groups.length - 1 : groupIndexOf(blocks, overId)
    if (from < 0 || to < 0 || from === to) return null

    return { kind: 'reorderGroups', from, to }
  }

  const toIndex = overId === CANVAS_END ? blocks.length - 1 : blocks.findIndex((b) => b.key === overId)
  if (toIndex < 0) return null

  return { kind: 'move', key: activeId, toIndex }
}
