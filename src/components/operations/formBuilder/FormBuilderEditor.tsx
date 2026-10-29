import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { Announcements, DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { updateFormDefinition } from '@/api/formsApi'
import type { OpsFormDefinition, QuestionType } from '@/types/operations'
import BlockProperties from './BlockProperties'
import BuilderCanvas from './BuilderCanvas'
import type { DropIndicator } from './BuilderCanvas'
import BuilderLibrary from './BuilderLibrary'
import BuilderPreviewModal from './BuilderPreviewModal'
import BuilderToolbar, { SaveIndicator } from './BuilderToolbar'
import { docFromForm, docIssues, groupsOf, ruleProblems, ruleWarnings } from './builderDoc'
import LogicPanel from './LogicPanel'
import StepsPanel from './StepsPanel'
import { builderReducer, canRedo, canUndo, initialState } from './builderState'
import type { BlockPatch, MetaPatch } from './builderState'
import { CANVAS_END, isLibraryId, libraryType, resolveDrop } from './dropResolver'
import { TYPE_SPECS } from './questionTypes'
import { useDraftAutosave } from './useDraftAutosave'
import type { SaveStatus } from './useDraftAutosave'

type Panel = 'library' | 'canvas' | 'properties'

const PANEL_LABELS: Record<Panel, string> = { library: 'العناصر', canvas: 'النموذج', properties: 'الخصائص' }

/** What the right-hand column shows: the block's properties, its visibility rule and the form's rules, or the steps. */
type Side = 'properties' | 'logic' | 'steps'

const SIDE_LABELS: Record<Side, string> = { properties: 'الخصائص', logic: 'المنطق', steps: 'الخطوات' }

const A11Y_INSTRUCTIONS = {
  draggable: 'لبدء السحب اضغط مفتاح المسافة، ثم استخدم الأسهم للتحرك، واضغط المسافة مرة أخرى للإفلات أو Escape للإلغاء.',
}

type Props = {
  form: OpsFormDefinition
  /** Without edit rights the editor shows the form and the preview, and offers nothing that changes it. */
  readOnly?: boolean
  /** The server stored the draft (or the editor took the latest one): the page keeps its copy of the form current. */
  onFormSaved?: (form: OpsFormDefinition) => void
  /** Reports the save state, so the page can hold back publishing while edits are unsaved. */
  onStatusChange?: (status: SaveStatus) => void
}

const isEditable = (el: EventTarget | null): boolean => {
  const node = el as HTMLElement | null
  if (!node || !node.tagName) return false

  return node.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(node.tagName)
}

/**
 * The form builder: a library of blocks, the form itself, and the settings of the selected block.
 *
 * It edits a DRAFT. Everything is kept in one document with an undo history (builderState); the document is stored by autosave
 * and by hand (useDraftAutosave), never touching the published version. Blocks are added by clicking or dragging them in,
 * and moved by dragging, by keyboard, or with the buttons on the selected block.
 */
export default function FormBuilderEditor({ form, readOnly = false, onFormSaved, onStatusChange }: Props) {
  const [state, dispatch] = useReducer(builderReducer, form, (f) => initialState(docFromForm(f)))
  const { doc, selectedKey } = state
  const [panel, setPanel] = useState<Panel>('canvas')
  const [side, setSide] = useState<Side>('properties')
  const [previewing, setPreviewing] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [indicator, setIndicator] = useState<DropIndicator>(null)
  const [notice, setNotice] = useState<{ text: string; undoable: boolean } | null>(null)
  const [confirming, setConfirming] = useState<'load' | 'overwrite' | null>(null)

  const issues = useMemo(() => docIssues(doc), [doc])
  const issueCount = Object.keys(issues).length
  // Rules: what the server would refuse on save (shown as problems, and autosave waits for them), and what only publishing refuses.
  const problems = useMemo(() => ruleProblems(doc.blocks), [doc.blocks])
  const warnings = useMemo(() => ruleWarnings(doc.blocks), [doc.blocks])
  const warningCount = Object.values(warnings).reduce((n, list) => n + list.length, 0)
  const selected = doc.blocks.find((b) => b.key === selectedKey) ?? null
  const now = () => Date.now()

  // ── Saving ────────────────────────────────────────────────────────────────

  const onSaved = useCallback(
    (saved: OpsFormDefinition, keys: string[]) => {
      const serverIds: Record<string, number> = {}
      const hasAnswers: Record<string, boolean> = {}
      saved.questions.forEach((q, i) => {
        const key = keys[i]
        if (!key) return
        serverIds[key] = q.id
        hasAnswers[key] = Boolean(q.has_answers)
      })
      dispatch({ type: 'saved', serverIds, hasAnswers })
      onFormSaved?.(saved)
    },
    [onFormSaved],
  )

  const onLoadLatest = useCallback(
    (latest: OpsFormDefinition) => {
      dispatch({ type: 'replace', doc: docFromForm(latest) })
      onFormSaved?.(latest)
      setConfirming(null)
      setNotice({ text: 'تم تحميل آخر نسخة من المسودة. تعديلاتك غير المحفوظة لم تُحفظ.', undoable: false })
    },
    [onFormSaved],
  )

  const save = useCallback((payload: Parameters<typeof updateFormDefinition>[1], options: Parameters<typeof updateFormDefinition>[2]) => updateFormDefinition(form.id, payload, options), [form.id])

  const autosave = useDraftAutosave({
    doc,
    issueCount,
    initialRevision: form.draft_revision,
    save,
    onSaved,
    onLoadLatest,
    enabled: !readOnly,
  })

  useEffect(() => {
    onStatusChange?.(autosave.status)
  }, [autosave.status, onStatusChange])

  // ── Editing ───────────────────────────────────────────────────────────────

  const insert = useCallback((blockType: QuestionType, index?: number) => {
    dispatch({ type: 'insert', blockType, index, at: now() })
    setPanel('canvas')
  }, [])

  const remove = useCallback(
    (key: string) => {
      const block = doc.blocks.find((b) => b.key === key)
      if (!block) return
      const inside = block.type === 'section' ? (groupsOf(doc.blocks).find((g) => g.section?.key === key)?.end ?? 0) - (groupsOf(doc.blocks).find((g) => g.section?.key === key)?.start ?? 0) - 1 : 0
      dispatch({ type: 'remove', key, at: now() })
      const what = block.type === 'section' ? `القسم${inside > 0 ? ` و${inside} ${inside === 1 ? 'عنصراً' : 'عناصر'} بداخله` : ''}` : 'العنصر'
      setNotice({
        text: `تم حذف ${what}.${block.hasAnswers ? ' تبقى الإجابات المسجّلة ظاهرة في الإرسالات.' : ''}`,
        undoable: true,
      })
    },
    [doc.blocks],
  )

  const edit = useCallback((key: string, patch: BlockPatch, field: string) => dispatch({ type: 'edit', key, patch, field, at: now() }), [])
  const editMeta = useCallback((patch: MetaPatch, field: string) => dispatch({ type: 'editMeta', patch, field, at: now() }), [])

  const move = useCallback(
    (key: string, delta: -1 | 1) => {
      const block = doc.blocks.find((b) => b.key === key)
      dispatch(block?.type === 'section' ? { type: 'moveSectionBy', sectionKey: key, delta, at: now() } : { type: 'moveBy', key, delta, at: now() })
    },
    [doc.blocks],
  )

  const undo = useCallback(() => dispatch({ type: 'undo' }), [])
  const redo = useCallback(() => dispatch({ type: 'redo' }), [])

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 8000)

    return () => clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    if (readOnly) return
    const onKey = (e: KeyboardEvent) => {
      if (isEditable(e.target) || !(e.ctrlKey || e.metaKey)) return
      const k = e.key.toLowerCase()
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((k === 'z' && e.shiftKey) || k === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKey)

    return () => window.removeEventListener('keydown', onKey)
  }, [readOnly, undo, redo])

  // ── Dragging ──────────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const belowMiddle = (event: DragOverEvent | DragEndEvent): boolean => {
    const dragged = event.active.rect.current.translated
    const target = event.over?.rect
    if (!dragged || !target) return false

    return dragged.top + dragged.height / 2 > target.top + target.height / 2
  }

  const titleOf = (id: string): string => {
    if (isLibraryId(id)) return TYPE_SPECS[libraryType(id)].label
    const block = doc.blocks.find((b) => b.key === id)

    return block ? block.label.trim() || TYPE_SPECS[block.type].label : 'العنصر'
  }

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id))
    if (!isLibraryId(String(event.active.id))) dispatch({ type: 'select', key: String(event.active.id) })
  }

  const onDragOver = (event: DragOverEvent) => {
    const active = String(event.active.id)
    const over = event.over ? String(event.over.id) : null
    if (isLibraryId(active) && over && over !== CANVAS_END) setIndicator({ key: over, position: belowMiddle(event) ? 'after' : 'before' })
    else setIndicator(null)
  }

  const onDragEnd = (event: DragEndEvent) => {
    const active = String(event.active.id)
    const result = resolveDrop(active, event.over ? String(event.over.id) : null, doc.blocks, belowMiddle(event))
    setActiveId(null)
    setIndicator(null)
    if (!result) return
    if (result.kind === 'insert') insert(result.blockType, result.index)
    else if (result.kind === 'move') dispatch({ type: 'move', key: result.key, toIndex: result.toIndex, at: now() })
    else dispatch({ type: 'reorderGroups', from: result.from, to: result.to, at: now() })
  }

  const cancelDrag = () => {
    setActiveId(null)
    setIndicator(null)
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) => `تم التقاط «${titleOf(String(active.id))}».`,
    onDragOver: ({ active, over }) => (over ? `«${titleOf(String(active.id))}» فوق «${over.id === CANVAS_END ? 'نهاية النموذج' : titleOf(String(over.id))}».` : undefined),
    onDragEnd: ({ active, over }) => (over ? `أُفلت «${titleOf(String(active.id))}» عند «${over.id === CANVAS_END ? 'نهاية النموذج' : titleOf(String(over.id))}».` : `أُفلت «${titleOf(String(active.id))}» في مكانه.`),
    onDragCancel: ({ active }) => `أُلغي سحب «${titleOf(String(active.id))}».`,
  }

  const draggingSectionKey = activeId && !isLibraryId(activeId) && doc.blocks.find((b) => b.key === activeId)?.type === 'section' ? activeId : null

  // ── Rendering ─────────────────────────────────────────────────────────────

  const shownIssues = autosave.status === 'error' && autosave.failure ? { ...autosave.failure.blockErrors, ...issues } : issues
  const titleError = issues.__title ?? autosave.failure?.fieldErrors.title

  return (
    <div dir="rtl" className="space-y-3" data-testid="form-builder">
      <BuilderToolbar
        status={autosave.status}
        issueCount={issueCount}
        lastSavedAt={autosave.lastSavedAt}
        canUndo={canUndo(state)}
        canRedo={canRedo(state)}
        readOnly={readOnly}
        onUndo={undo}
        onRedo={redo}
        onSave={() => void autosave.saveNow()}
        onPreview={() => setPreviewing(true)}
      />

      {!readOnly && form.status === 'active' && (
        <p role="note" className="rounded-xl bg-sky-50 px-4 py-2.5 text-right text-xs font-bold leading-6 text-sky-800">
          هذا النموذج منشور. تعديلاتك تُحفظ في المسودة فقط ولا يراها المجيبون حتى تنشرها كإصدار جديد.
        </p>
      )}

      {autosave.conflict && (
        <div role="alert" data-testid="conflict-banner" className="space-y-3 rounded-2xl bg-red-50 p-4 text-right ring-1 ring-red-200">
          <p className="text-sm font-black text-red-800">
            {autosave.conflict.last_editor ? `عدّل ${autosave.conflict.last_editor.name} هذه المسودة` : 'عُدّلت هذه المسودة من شخص آخر'} بعد أن فتحتها. لم يُحفظ شيء من تعديلاتك الأخيرة، ولم يتغير شيء في النسخة المنشورة.
          </p>
          <div className="flex flex-wrap gap-2">
            {confirming === 'load' ? (
              <button type="button" onClick={() => autosave.loadLatest()} className="rounded-xl bg-red-700 px-4 py-2 text-xs font-black text-white">
                تأكيد: تجاهل تعديلاتي وحمّل آخر نسخة
              </button>
            ) : (
              <button type="button" onClick={() => setConfirming('load')} className="rounded-xl bg-white px-4 py-2 text-xs font-black text-deepBlue ring-1 ring-deepBlue/15">
                تحميل آخر نسخة
              </button>
            )}
            {confirming === 'overwrite' ? (
              <button type="button" onClick={() => { setConfirming(null); void autosave.overwrite() }} className="rounded-xl bg-red-700 px-4 py-2 text-xs font-black text-white">
                تأكيد: استبدال عمل الآخر بنسختي
              </button>
            ) : (
              <button type="button" onClick={() => setConfirming('overwrite')} className="rounded-xl bg-white px-4 py-2 text-xs font-black text-red-700 ring-1 ring-red-200">
                حفظ نسختي فوقها
              </button>
            )}
            {confirming && (
              <button type="button" onClick={() => setConfirming(null)} className="rounded-xl px-4 py-2 text-xs font-black text-slate-600">
                رجوع
              </button>
            )}
          </div>
        </div>
      )}

      {autosave.status === 'error' && autosave.failure && !autosave.conflict && (
        <p role="alert" data-testid="save-error" className="rounded-xl bg-red-50 px-4 py-3 text-right text-sm font-bold text-red-700 ring-1 ring-red-200">
          {autosave.failure.message}
          {autosave.failure.retryable && autosave.failure.attempts <= 3 ? ' سنعيد المحاولة تلقائياً، ويمكنك إعادتها الآن من زر «إعادة المحاولة».' : ''}
          {' '}تعديلاتك ما زالت أمامك ولن تضيع.
        </p>
      )}

      {notice && (
        <p role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-100 px-4 py-2 text-right text-xs font-bold text-deepBlue">
          <span>{notice.text}</span>
          {notice.undoable && (
            <button type="button" onClick={() => { undo(); setNotice(null) }} className="rounded-lg bg-white px-3 py-1 text-[11px] font-black text-customBlue ring-1 ring-customBlue/30">
              تراجع
            </button>
          )}
        </p>
      )}

      <div role="tablist" aria-label="أجزاء المحرر" className="flex gap-1 rounded-xl bg-slate-100 p-1 xl:hidden">
        {(Object.keys(PANEL_LABELS) as Panel[]).map((p) => (
          <button key={p} type="button" role="tab" aria-selected={panel === p} onClick={() => setPanel(p)} className={`flex-1 rounded-lg py-1.5 text-xs font-black ${panel === p ? 'bg-white text-deepBlue shadow-sm' : 'text-slate-500'}`}>
            {PANEL_LABELS[p]}
          </button>
        ))}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={cancelDrag}
        accessibility={{ announcements, screenReaderInstructions: A11Y_INSTRUCTIONS }}
      >
        <div className="grid items-start gap-4 xl:grid-cols-[13rem_minmax(0,1fr)_21rem]">
          {!readOnly && (
            <div className={`${panel === 'library' ? 'block' : 'hidden'} xl:sticky xl:top-16 xl:block xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto`}>
              <BuilderLibrary onInsert={(type) => insert(type)} />
            </div>
          )}
          <div className={`${panel === 'canvas' ? 'block' : 'hidden'} min-w-0 xl:block ${readOnly ? 'xl:col-span-2' : ''}`}>
            <BuilderCanvas
              doc={doc}
              selectedKey={selectedKey}
              issues={shownIssues}
              indicator={indicator}
              draggingSectionKey={draggingSectionKey}
              readOnly={readOnly}
              titleError={titleError}
              onSelect={(key) => dispatch({ type: 'select', key })}
              onMeta={editMeta}
              onMove={move}
              onDuplicate={(key) => dispatch({ type: 'duplicate', key, at: now() })}
              onDelete={remove}
              onInsertAt={(type, index) => insert(type, index)}
              onMoveToSection={(key, sectionKey) => dispatch({ type: 'moveToSection', key, sectionKey, at: now() })}
            />
          </div>
          <div className={`${panel === 'properties' ? 'block' : 'hidden'} space-y-3 xl:sticky xl:top-16 xl:block xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto`}>
            <div role="tablist" aria-label="لوحة الإعدادات" className="flex gap-1 rounded-xl bg-slate-100 p-1">
              {(Object.keys(SIDE_LABELS) as Side[]).map((s) => (
                <button key={s} type="button" role="tab" id={`side-tab-${s}`} aria-selected={side === s} aria-controls={`side-panel-${s}`} onClick={() => setSide(s)} className={`relative flex-1 rounded-lg py-1.5 text-xs font-black ${side === s ? 'bg-white text-deepBlue shadow-sm' : 'text-slate-500'}`}>
                  {SIDE_LABELS[s]}
                  {s === 'logic' && warningCount > 0 && <span aria-label={`${warningCount} تحذير`} className="absolute -top-1 end-1 inline-flex size-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-white">{warningCount}</span>}
                </button>
              ))}
            </div>
            <div role="tabpanel" id={`side-panel-${side}`} aria-labelledby={`side-tab-${side}`}>
              {side === 'properties' && (
                <BlockProperties
                  block={selected}
                  readOnly={readOnly}
                  issue={selected ? (shownIssues[selected.key] ?? null) : null}
                  onEdit={(patch, field) => selected && edit(selected.key, patch, field)}
                  onChangeType={(blockType) => selected && dispatch({ type: 'changeType', key: selected.key, blockType, at: now() })}
                />
              )}
              {side === 'logic' && (
                <LogicPanel
                  doc={doc}
                  selected={selected}
                  readOnly={readOnly}
                  problems={problems}
                  warnings={warnings}
                  onSelect={(key) => dispatch({ type: 'select', key })}
                  onChangeRule={(key, rule) => edit(key, { logic: rule }, 'logic')}
                />
              )}
              {side === 'steps' && (
                <StepsPanel
                  doc={doc}
                  selectedKey={selectedKey}
                  readOnly={readOnly}
                  onSelect={(key) => dispatch({ type: 'select', key })}
                  onAddStep={() => dispatch({ type: 'addStep', at: now() })}
                  onTitleFirstStep={() => dispatch({ type: 'titleFirstStep', at: now() })}
                  onMoveStep={(breakKey, delta) => dispatch({ type: 'moveStep', breakKey, delta, at: now() })}
                  onRemoveStep={(key) => remove(key)}
                  onMoveToStep={(key, stepKey) => dispatch({ type: 'moveToStep', key, stepKey, at: now() })}
                  onEditStep={(key, patch, field) => edit(key, patch, field)}
                  onToggleReview={(on) => editMeta({ reviewStep: on }, 'reviewStep')}
                  onOpenRule={(key) => { dispatch({ type: 'select', key }); setSide('logic') }}
                />
              )}
            </div>
          </div>
        </div>
        <DragOverlay dropAnimation={null}>
          {activeId ? (
            <div dir="rtl" className="rounded-xl bg-white px-4 py-2 text-xs font-black text-deepBlue shadow-xl ring-2 ring-customBlue">
              {titleOf(activeId)}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* The page scrolls inside a shell that defeats sticky positioning, so a state that needs attention is also pinned to the screen. */}
      {!readOnly && autosave.status !== 'saved' && (
        <div className="pointer-events-auto fixed bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full bg-white px-4 py-2 shadow-xl ring-1 ring-deepBlue/10">
          <SaveIndicator decorative status={autosave.status} issueCount={issueCount} lastSavedAt={autosave.lastSavedAt} onRetry={() => void autosave.saveNow()} />
        </div>
      )}

      <BuilderPreviewModal open={previewing} onClose={() => setPreviewing(false)} doc={doc} formId={form.id} slug={form.slug} />
    </div>
  )
}
