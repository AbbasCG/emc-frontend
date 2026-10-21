import type { FormTypeSlug, QuestionType } from '@/types/operations'
import {
  addStep,
  changeType,
  duplicateBlock,
  ensureFirstBreak,
  groupsOf,
  insertAt,
  makeBlock,
  moveBlock,
  moveBy,
  moveSectionBy,
  moveStep,
  moveToSection,
  moveToStep,
  removeBlock,
  removeSection,
  reorderGroups,
  stripReferences,
} from './builderDoc'
import type { Block, BuilderDoc } from './builderDoc'

/**
 * The builder's state: the document plus its undo history.
 *
 * History boundaries: every structural edit (insert, delete, duplicate, move, change type) is one undo step. Typing into one
 * field is one step per burst (edits to the same field within `COALESCE_MS` of each other merge), so undo takes back "what I
 * typed", not one character. Undo and redo only ever move between documents; they never touch what is published or answered,
 * because the document is only the DRAFT. Saving does not clear history: undoing after a save simply makes the draft differ
 * from what was saved, and the next save stores the older state.
 */

export const COALESCE_MS = 1200
export const HISTORY_LIMIT = 100

export type BuilderState = {
  doc: BuilderDoc
  past: BuilderDoc[]
  future: BuilderDoc[]
  selectedKey: string | null
  /** The last edit that may still absorb the next one (same tag, soon enough). */
  lastEdit: { tag: string; at: number } | null
}

export type BlockPatch = Partial<Omit<Block, 'key' | 'serverId' | 'type'>>
export type MetaPatch = Partial<{ title: string; description: string; formType: FormTypeSlug; reviewStep: boolean }>

export type BuilderAction =
  | { type: 'insert'; blockType: QuestionType; index?: number; afterKey?: string | null; at: number }
  | { type: 'remove'; key: string; at: number }
  | { type: 'duplicate'; key: string; at: number }
  | { type: 'move'; key: string; toIndex: number; at: number }
  | { type: 'moveBy'; key: string; delta: number; at: number }
  | { type: 'moveToSection'; key: string; sectionKey: string | null; at: number }
  | { type: 'moveSectionBy'; sectionKey: string; delta: number; at: number }
  | { type: 'reorderGroups'; from: number; to: number; at: number }
  /** Steps: add one at the end, give the first stage a break of its own, move a whole step, move a question to another step. */
  | { type: 'addStep'; at: number }
  | { type: 'titleFirstStep'; at: number }
  | { type: 'moveStep'; breakKey: string; delta: -1 | 1; at: number }
  | { type: 'moveToStep'; key: string; stepKey: string; at: number }
  | { type: 'edit'; key: string; patch: BlockPatch; field: string; at: number }
  | { type: 'changeType'; key: string; blockType: QuestionType; at: number }
  | { type: 'editMeta'; patch: MetaPatch; field: string; at: number }
  | { type: 'select'; key: string | null }
  | { type: 'undo' }
  | { type: 'redo' }
  /** Replace the whole document (load the latest from the server, a restored version). History starts over. */
  | { type: 'replace'; doc: BuilderDoc }
  /** The server stored these blocks: remember the ids it gave them, in the present and in every undo step. */
  | { type: 'saved'; serverIds: Record<string, number>; hasAnswers?: Record<string, boolean> }

export function initialState(doc: BuilderDoc): BuilderState {
  return { doc, past: [], future: [], selectedKey: null, lastEdit: null }
}

function commit(state: BuilderState, doc: BuilderDoc, at: number, tag: string | null, selectedKey: string | null = state.selectedKey): BuilderState {
  if (doc === state.doc) return state
  const merge = tag !== null && state.lastEdit !== null && state.lastEdit.tag === tag && at - state.lastEdit.at <= COALESCE_MS
  const past = merge ? state.past : [...state.past, state.doc].slice(-HISTORY_LIMIT)

  return { doc, past, future: [], selectedKey, lastEdit: tag === null ? null : { tag, at } }
}

const insertionIndex = (doc: BuilderDoc, action: Extract<BuilderAction, { type: 'insert' }>, selectedKey: string | null): number => {
  if (action.index !== undefined) return action.index
  const after = action.afterKey ?? selectedKey
  if (after) {
    const i = doc.blocks.findIndex((b) => b.key === after)
    if (i >= 0) {
      // After a section heading goes INTO that section, at its start; after anything else goes right below it.
      return i + 1
    }
  }

  return doc.blocks.length
}

function withBlocks(doc: BuilderDoc, blocks: Block[]): BuilderDoc {
  return blocks === doc.blocks ? doc : { ...doc, blocks }
}

function mapBlocks(doc: BuilderDoc, fn: (b: Block) => Block): BuilderDoc {
  let changed = false
  const blocks = doc.blocks.map((b) => {
    const next = fn(b)
    if (next !== b) changed = true

    return next
  })

  return changed ? { ...doc, blocks } : doc
}

export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  const { doc } = state

  switch (action.type) {
    case 'insert': {
      const block = makeBlock(action.blockType)
      const index = insertionIndex(doc, action, state.selectedKey)

      return commit(state, { ...doc, blocks: insertAt(doc.blocks, index, block) }, action.at, null, block.key)
    }

    case 'remove': {
      const target = doc.blocks.find((b) => b.key === action.key)
      if (!target) return state
      const remaining = target.type === 'section' ? removeSection(doc.blocks, action.key) : removeBlock(doc.blocks, action.key)
      // A rule that read a deleted block cannot read it any more: those conditions go with it (undo brings them back with the block).
      const gone = new Set(doc.blocks.filter((b) => !remaining.some((r) => r.key === b.key)).map((b) => b.key))
      const blocks = stripReferences(remaining, gone)
      const selectedKey = state.selectedKey && blocks.some((b) => b.key === state.selectedKey) ? state.selectedKey : null

      return commit(state, { ...doc, blocks }, action.at, null, selectedKey)
    }

    case 'duplicate': {
      const { blocks, keys } = duplicateBlock(doc.blocks, action.key)

      return commit(state, { ...doc, blocks }, action.at, null, keys[0] ?? state.selectedKey)
    }

    case 'move':
      return commit(state, withBlocks(doc, moveBlock(doc.blocks, action.key, action.toIndex)), action.at, null)

    case 'moveBy':
      return commit(state, withBlocks(doc, moveBy(doc.blocks, action.key, action.delta)), action.at, null)

    case 'moveToSection':
      return commit(state, withBlocks(doc, moveToSection(doc.blocks, action.key, action.sectionKey)), action.at, null)

    case 'moveSectionBy':
      return commit(state, withBlocks(doc, moveSectionBy(doc.blocks, action.sectionKey, action.delta)), action.at, null)

    case 'reorderGroups':
      return commit(state, withBlocks(doc, reorderGroups(doc.blocks, action.from, action.to)), action.at, null)

    case 'addStep': {
      const { blocks, key } = addStep(doc.blocks, () => makeBlock('page_break', { label: `خطوة ${doc.blocks.filter((b) => b.type === 'page_break').length + 2}` }))

      return commit(state, { ...doc, blocks }, action.at, null, key)
    }

    case 'titleFirstStep': {
      const { blocks, key } = ensureFirstBreak(doc.blocks, () => makeBlock('page_break', { label: 'الخطوة الأولى' }))

      return commit(state, withBlocks(doc, blocks), action.at, null, key ?? state.selectedKey)
    }

    case 'moveStep':
      return commit(state, withBlocks(doc, moveStep(doc.blocks, action.breakKey, action.delta)), action.at, null)

    case 'moveToStep':
      return commit(state, withBlocks(doc, moveToStep(doc.blocks, action.key, action.stepKey)), action.at, null)

    case 'edit': {
      const unchanged = (b: Block) => (Object.keys(action.patch) as (keyof BlockPatch)[]).every((k) => JSON.stringify(b[k]) === JSON.stringify(action.patch[k]))
      const next = mapBlocks(doc, (b) => (b.key === action.key && !unchanged(b) ? { ...b, ...action.patch } : b))

      return commit(state, next, action.at, `edit:${action.key}:${action.field}`)
    }

    case 'changeType':
      return commit(state, mapBlocks(doc, (b) => (b.key === action.key ? changeType(b, action.blockType) : b)), action.at, null)

    case 'editMeta': {
      const next = { ...doc, ...action.patch }
      const same = (Object.keys(action.patch) as (keyof MetaPatch)[]).every((k) => doc[k] === action.patch[k])

      return commit(state, same ? doc : next, action.at, `meta:${action.field}`)
    }

    case 'select':
      return state.selectedKey === action.key ? state : { ...state, selectedKey: action.key }

    case 'undo': {
      if (state.past.length === 0) return state
      const previous = state.past[state.past.length - 1]
      const selectedKey = state.selectedKey && previous.blocks.some((b) => b.key === state.selectedKey) ? state.selectedKey : null

      return { doc: previous, past: state.past.slice(0, -1), future: [doc, ...state.future], selectedKey, lastEdit: null }
    }

    case 'redo': {
      if (state.future.length === 0) return state
      const [next, ...rest] = state.future
      const selectedKey = state.selectedKey && next.blocks.some((b) => b.key === state.selectedKey) ? state.selectedKey : null

      return { doc: next, past: [...state.past, doc], future: rest, selectedKey, lastEdit: null }
    }

    case 'replace':
      return initialState(action.doc)

    case 'saved': {
      const apply = (d: BuilderDoc): BuilderDoc =>
        mapBlocks(d, (b) => {
          const id = action.serverIds[b.key]
          const answered = action.hasAnswers?.[b.key]
          if ((id === undefined || id === b.serverId) && (answered === undefined || answered === b.hasAnswers)) return b

          return { ...b, serverId: id ?? b.serverId, hasAnswers: answered ?? b.hasAnswers }
        })

      return { ...state, doc: apply(state.doc), past: state.past.map(apply), future: state.future.map(apply) }
    }
  }
}

/** True when a block has a heading at or before it, i.e. there is something to move it between. */
export const hasSections = (doc: BuilderDoc): boolean => groupsOf(doc.blocks).some((g) => g.section !== null)

export const canUndo = (state: BuilderState): boolean => state.past.length > 0
export const canRedo = (state: BuilderState): boolean => state.future.length > 0
