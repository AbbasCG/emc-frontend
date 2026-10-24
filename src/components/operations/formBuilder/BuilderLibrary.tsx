import { useDraggable } from '@dnd-kit/core'
import type { QuestionType } from '@/types/operations'
import { libraryId } from './dropResolver'
import { BLOCK_GROUPS, LIBRARY_TYPES, TYPE_SPECS } from './questionTypes'

function LibraryItem({ type, onInsert, disabled }: { type: QuestionType; onInsert: (type: QuestionType) => void; disabled: boolean }) {
  const spec = TYPE_SPECS[type]
  const Icon = spec.icon
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: libraryId(type), disabled })
  // Click and Enter insert the block (the keyboard way in); the keyboard drag sensor is left off so Enter is not both.
  const { onKeyDown: _keyboardDrag, ...pointerListeners } = (listeners ?? {}) as Record<string, unknown>
  const { role: _role, tabIndex: _tab, ...describedBy } = attributes

  return (
    <li>
      <button
        ref={setNodeRef}
        type="button"
        disabled={disabled}
        data-testid={`library-${type}`}
        onClick={() => onInsert(type)}
        title={spec.hint}
        {...describedBy}
        {...pointerListeners}
        className={`flex w-full touch-manipulation items-center gap-2 rounded-xl bg-white px-3 py-2 text-right text-xs font-black text-deepBlue ring-1 ring-deepBlue/[0.08] transition hover:bg-customBlue/[0.06] hover:ring-customBlue/30 disabled:opacity-50 ${isDragging ? 'opacity-40' : ''}`}
      >
        <Icon size={16} aria-hidden className="shrink-0 text-customBlue" />
        <span className="min-w-0 flex-1 truncate">{spec.label}</span>
      </button>
    </li>
  )
}

/** The blocks that can be added: click one to add it after the selected block, or drag it to the exact place. */
export default function BuilderLibrary({ onInsert, disabled = false }: { onInsert: (type: QuestionType) => void; disabled?: boolean }) {
  return (
    <aside aria-label="مكتبة العناصر" data-testid="builder-library" className="space-y-4 rounded-2xl bg-white p-3 text-right ring-1 ring-deepBlue/[0.06]">
      <p className="text-[11px] font-bold leading-5 text-slate-500">اضغط عنصراً لإضافته بعد العنصر المحدد، أو اسحبه إلى المكان الذي تريده.</p>
      {BLOCK_GROUPS.map((group) => (
        <section key={group.key} aria-labelledby={`library-group-${group.key}`}>
          <h3 id={`library-group-${group.key}`} className="mb-2 text-[11px] font-black text-slate-400">{group.label}</h3>
          <ul className="grid grid-cols-2 gap-1.5 xl:grid-cols-1">
            {LIBRARY_TYPES.filter((t) => TYPE_SPECS[t].group === group.key).map((type) => (
              <LibraryItem key={type} type={type} onInsert={onInsert} disabled={disabled} />
            ))}
          </ul>
        </section>
      ))}
    </aside>
  )
}
