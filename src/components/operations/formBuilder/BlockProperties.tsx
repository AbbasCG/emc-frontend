import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react'
import type { QuestionConfig, QuestionType } from '@/types/operations'
import type { Block } from './builderDoc'
import type { BlockPatch } from './builderState'
import { TYPE_SPECS, isMultiChoice } from './questionTypes'

const INPUT = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-deepBlue outline-none focus:border-customBlue disabled:opacity-60'
const LABEL = 'text-[11px] font-black text-deepBlue'

type Props = {
  block: Block | null
  readOnly: boolean
  /** Server or local message about this block. */
  issue: string | null
  onEdit: (patch: BlockPatch, field: string) => void
  onChangeType: (type: QuestionType) => void
}

const num = (raw: string): number | undefined => (raw.trim() === '' || Number.isNaN(Number(raw)) ? undefined : Number(raw))

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="grid gap-1">
      <span className={LABEL}>{label}</span>
      {children}
      {hint && <span className="text-[10px] font-bold text-slate-400">{hint}</span>}
    </label>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3 border-t border-deepBlue/[0.06] pt-3">
      <legend className="sr-only">{title}</legend>
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400" aria-hidden>{title}</p>
      {children}
    </fieldset>
  )
}

function OptionsEditor({ block, disabled, onEdit }: { block: Block; disabled: boolean; onEdit: Props['onEdit'] }) {
  const options = block.options
  const set = (next: string[]) => onEdit({ options: next }, 'options')
  const move = (i: number, d: -1 | 1) => {
    const next = options.slice()
    const j = i + d
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    set(next)
  }

  return (
    <div className="space-y-2" role="group" aria-label="الخيارات">
      <p className={LABEL}>الخيارات{block.type === 'checkbox' && options.length === 0 ? ' — إن تُركت فارغة يظهر «نعم / لا»' : ''}</p>
      <ul className="space-y-1.5">
        {options.map((option, i) => (
          <li key={i} className="flex items-center gap-1">
            <input
              value={option}
              disabled={disabled}
              aria-label={`الخيار ${i + 1}`}
              onChange={(e) => set(options.map((o, j) => (j === i ? e.target.value : o)))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  set([...options.slice(0, i + 1), '', ...options.slice(i + 1)])
                }
              }}
              className={INPUT}
            />
            <button type="button" aria-label={`نقل الخيار ${i + 1} للأعلى`} disabled={disabled || i === 0} onClick={() => move(i, -1)} className="rounded-lg p-1.5 text-deepBlue ring-1 ring-deepBlue/10 disabled:opacity-30">
              <ArrowUp size={12} aria-hidden />
            </button>
            <button type="button" aria-label={`نقل الخيار ${i + 1} للأسفل`} disabled={disabled || i === options.length - 1} onClick={() => move(i, 1)} className="rounded-lg p-1.5 text-deepBlue ring-1 ring-deepBlue/10 disabled:opacity-30">
              <ArrowDown size={12} aria-hidden />
            </button>
            <button type="button" aria-label={`حذف الخيار ${i + 1}`} disabled={disabled} onClick={() => set(options.filter((_, j) => j !== i))} className="rounded-lg p-1.5 text-red-600 ring-1 ring-red-100">
              <X size={12} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <button type="button" disabled={disabled} onClick={() => set([...options, `الخيار ${options.length + 1}`])} className="inline-flex items-center gap-1 rounded-lg bg-customBlue/10 px-3 py-1.5 text-[11px] font-black text-customBlue">
        <Plus size={12} aria-hidden />
        إضافة خيار
      </button>
    </div>
  )
}

/** The settings of the selected block. Every change goes straight into the document, so the canvas shows it at once. */
export default function BlockProperties({ block, readOnly, issue, onEdit, onChangeType }: Props) {
  if (!block) {
    return (
      <aside aria-label="خصائص العنصر" data-testid="builder-properties" className="rounded-2xl bg-white p-4 text-right ring-1 ring-deepBlue/[0.06]">
        <p className="text-sm font-black text-deepBlue">لا يوجد عنصر محدد</p>
        <p className="mt-2 text-xs font-semibold leading-6 text-slate-500">اختر عنصراً من لوحة النموذج لتعديل نصه وخياراته وقيوده.</p>
      </aside>
    )
  }

  const spec = TYPE_SPECS[block.type]
  const structural = spec.structural
  const v = block.config.validation ?? {}
  const s = block.config.scale ?? {}
  const edit = onEdit
  const disabled = readOnly

  const setValidation = (key: keyof NonNullable<QuestionConfig['validation']>, value: number | string | boolean | undefined) =>
    edit({ config: { ...block.config, validation: { ...v, [key]: value } } }, `validation.${key}`)
  const setScale = (key: keyof NonNullable<QuestionConfig['scale']>, value: number | string | undefined) =>
    edit({ config: { ...block.config, scale: { ...s, [key]: value } } }, `scale.${key}`)
  const setDefault = (value: QuestionConfig['default_value']) => edit({ config: { ...block.config, default_value: value } }, 'default_value')

  const convertible = [block.type, ...spec.convertibleTo.filter((t) => t !== block.type)]
  const defaultValue = block.config.default_value
  const cleanOptions = block.options.map((o) => o.trim()).filter(Boolean)

  return (
    <aside aria-label="خصائص العنصر" data-testid="builder-properties" className="space-y-3 rounded-2xl bg-white p-4 text-right ring-1 ring-deepBlue/[0.06]">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-black text-deepBlue">{spec.label}</h3>
        {block.hasAnswers && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-black text-sky-800">لديه إجابات</span>}
      </div>
      {issue && <p role="alert" className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700">{issue}</p>}

      <Group title="الأساسيات">
        {convertible.length > 1 && (
          <Field label="نوع الحقل" hint={block.hasAnswers ? 'لا يمكن تغيير نوع سؤال لديه إجابات.' : undefined}>
            <select value={block.type} disabled={disabled || block.hasAnswers} onChange={(e) => onChangeType(e.target.value as QuestionType)} className={INPUT}>
              {convertible.map((t) => (
                <option key={t} value={t}>{TYPE_SPECS[t].label}</option>
              ))}
            </select>
          </Field>
        )}
        {block.type !== 'description' && (
          <Field label={block.type === 'section' ? 'عنوان القسم' : block.type === 'page_break' ? 'عنوان الخطوة' : 'نص السؤال'}>
            <input value={block.label} disabled={disabled} onChange={(e) => edit({ label: e.target.value }, 'label')} className={INPUT} />
          </Field>
        )}
        <Field label={block.type === 'description' ? 'النص' : block.type === 'page_break' ? 'وصف الخطوة' : 'الوصف'}>
          <textarea value={block.description} disabled={disabled} rows={block.type === 'description' ? 5 : 2} onChange={(e) => edit({ description: e.target.value }, 'description')} className={`${INPUT} resize-none`} />
        </Field>
        {!structural && (
          <label className="flex items-center justify-between gap-2 text-xs font-black text-deepBlue">
            إلزامي
            <input type="checkbox" role="switch" checked={block.required} disabled={disabled} onChange={(e) => edit({ required: e.target.checked }, 'required')} className="size-4 accent-customBlue" />
          </label>
        )}
        {spec.hasPlaceholder && (
          <Field label="النص التوضيحي داخل الحقل">
            <input value={block.placeholder} disabled={disabled} onChange={(e) => edit({ placeholder: e.target.value }, 'placeholder')} className={INPUT} />
          </Field>
        )}
        {!structural && (
          <Field label="نص المساعدة" hint="يظهر تحت الحقل.">
            <input value={block.helpText} disabled={disabled} onChange={(e) => edit({ helpText: e.target.value }, 'helpText')} className={INPUT} />
          </Field>
        )}
      </Group>

      {spec.hasOptions && (
        <Group title="الخيارات">
          <OptionsEditor block={block} disabled={disabled} onEdit={edit} />
        </Group>
      )}

      {(block.type === 'text' || block.type === 'textarea') && (
        <Group title="القيود">
          <div className="grid grid-cols-2 gap-2">
            <Field label="أقل عدد أحرف"><input type="number" min={0} value={v.min_length ?? ''} disabled={disabled} onChange={(e) => setValidation('min_length', num(e.target.value))} className={INPUT} /></Field>
            <Field label="أكثر عدد أحرف"><input type="number" min={1} value={v.max_length ?? ''} disabled={disabled} onChange={(e) => setValidation('max_length', num(e.target.value))} className={INPUT} /></Field>
          </div>
        </Group>
      )}

      {block.type === 'number' && (
        <Group title="القيود">
          <div className="grid grid-cols-2 gap-2">
            <Field label="الحد الأدنى"><input type="number" value={v.min ?? ''} disabled={disabled} onChange={(e) => setValidation('min', num(e.target.value))} className={INPUT} /></Field>
            <Field label="الحد الأعلى"><input type="number" value={v.max ?? ''} disabled={disabled} onChange={(e) => setValidation('max', num(e.target.value))} className={INPUT} /></Field>
          </div>
          <label className="flex items-center justify-between gap-2 text-xs font-black text-deepBlue">
            أرقام صحيحة فقط
            <input type="checkbox" role="switch" checked={Boolean(v.integer_only)} disabled={disabled} onChange={(e) => setValidation('integer_only', e.target.checked)} className="size-4 accent-customBlue" />
          </label>
        </Group>
      )}

      {block.type === 'date' && (
        <Group title="القيود">
          <div className="grid grid-cols-2 gap-2">
            <Field label="أقدم تاريخ"><input type="date" value={v.min_date ?? ''} disabled={disabled} onChange={(e) => setValidation('min_date', e.target.value || undefined)} className={INPUT} /></Field>
            <Field label="أحدث تاريخ"><input type="date" value={v.max_date ?? ''} disabled={disabled} onChange={(e) => setValidation('max_date', e.target.value || undefined)} className={INPUT} /></Field>
          </div>
        </Group>
      )}

      {isMultiChoice(block.type) && (
        <Group title="القيود">
          <div className="grid grid-cols-2 gap-2">
            <Field label="أقل عدد اختيارات"><input type="number" min={0} value={v.min_choices ?? ''} disabled={disabled} onChange={(e) => setValidation('min_choices', num(e.target.value))} className={INPUT} /></Field>
            <Field label="أكثر عدد اختيارات"><input type="number" min={1} value={v.max_choices ?? ''} disabled={disabled} onChange={(e) => setValidation('max_choices', num(e.target.value))} className={INPUT} /></Field>
          </div>
        </Group>
      )}

      {block.type === 'star_rating' && (
        <Group title="التقييم">
          <Field label="عدد النجوم">
            <select value={s.max ?? 5} disabled={disabled} onChange={(e) => setScale('max', Number(e.target.value))} className={INPUT}>
              {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </Field>
        </Group>
      )}

      {block.type === 'linear_scale' && (
        <Group title="المقياس">
          <div className="grid grid-cols-2 gap-2">
            <Field label="يبدأ من">
              <select value={s.min ?? 1} disabled={disabled} onChange={(e) => setScale('min', Number(e.target.value))} className={INPUT}>
                <option value={0}>0</option>
                <option value={1}>1</option>
              </select>
            </Field>
            <Field label="ينتهي عند">
              <select value={s.max ?? 5} disabled={disabled} onChange={(e) => setScale('max', Number(e.target.value))} className={INPUT}>
                {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="عنوان البداية"><input value={s.min_label ?? ''} maxLength={60} disabled={disabled} onChange={(e) => setScale('min_label', e.target.value)} className={INPUT} /></Field>
          <Field label="عنوان النهاية"><input value={s.max_label ?? ''} maxLength={60} disabled={disabled} onChange={(e) => setScale('max_label', e.target.value)} className={INPUT} /></Field>
        </Group>
      )}

      {!structural && !['file', 'image', 'consent', 'star_rating', 'linear_scale'].includes(block.type) && (
        <Group title="القيمة الافتراضية">
          {(block.type === 'text' || block.type === 'textarea' || block.type === 'email' || block.type === 'phone' || block.type === 'url') && (
            <Field label="القيمة الافتراضية"><input value={typeof defaultValue === 'string' ? defaultValue : ''} disabled={disabled} onChange={(e) => setDefault(e.target.value)} className={INPUT} /></Field>
          )}
          {block.type === 'number' && (
            <Field label="القيمة الافتراضية"><input type="number" value={typeof defaultValue === 'number' || typeof defaultValue === 'string' ? defaultValue : ''} disabled={disabled} onChange={(e) => setDefault(num(e.target.value))} className={INPUT} /></Field>
          )}
          {block.type === 'date' && (
            <Field label="القيمة الافتراضية"><input type="date" value={typeof defaultValue === 'string' ? defaultValue : ''} disabled={disabled} onChange={(e) => setDefault(e.target.value || undefined)} className={INPUT} /></Field>
          )}
          {block.type === 'time' && (
            <Field label="القيمة الافتراضية"><input type="time" value={typeof defaultValue === 'string' ? defaultValue : ''} disabled={disabled} onChange={(e) => setDefault(e.target.value || undefined)} className={INPUT} /></Field>
          )}
          {(block.type === 'radio' || block.type === 'select') && (
            <Field label="القيمة الافتراضية">
              <select value={typeof defaultValue === 'string' ? defaultValue : ''} disabled={disabled} onChange={(e) => setDefault(e.target.value || undefined)} className={INPUT}>
                <option value="">بلا قيمة افتراضية</option>
                {cleanOptions.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </Field>
          )}
          {block.type === 'yes_no' && (
            <Field label="القيمة الافتراضية">
              <select value={typeof defaultValue === 'string' ? defaultValue : ''} disabled={disabled} onChange={(e) => setDefault(e.target.value || undefined)} className={INPUT}>
                <option value="">بلا قيمة افتراضية</option>
                <option value="yes">نعم</option>
                <option value="no">لا</option>
              </select>
            </Field>
          )}
          {isMultiChoice(block.type) && (
            <div role="group" aria-label="الاختيارات الافتراضية" className="space-y-1">
              <p className={LABEL}>الاختيارات الافتراضية</p>
              {cleanOptions.length === 0 && <p className="text-[10px] font-bold text-slate-400">أضف خيارات أولاً.</p>}
              {cleanOptions.map((o) => {
                const picked = Array.isArray(defaultValue) ? defaultValue : []

                return (
                  <label key={o} className="flex items-center gap-2 text-xs font-bold text-deepBlue">
                    <input
                      type="checkbox"
                      checked={picked.includes(o)}
                      disabled={disabled}
                      onChange={(e) => setDefault(e.target.checked ? [...picked, o] : picked.filter((x) => x !== o))}
                      className="accent-customBlue"
                    />
                    {o}
                  </label>
                )
              })}
            </div>
          )}
        </Group>
      )}

      {block.type === 'consent' && <p className="text-[11px] font-bold leading-5 text-slate-500">يجب على المجيب تحديد المربع قبل الإرسال إن جعلتَه إلزامياً. اكتب نص الموافقة في «نص السؤال» وتفاصيلها في «الوصف».</p>}
      {block.type === 'image' && <p className="text-[11px] font-bold leading-5 text-slate-500">تُقبل صور JPG وPNG وWebP حتى 5 ميغابايت.</p>}
      {block.type === 'file' && <p className="text-[11px] font-bold leading-5 text-slate-500">تُقبل مستندات وصور حتى 5 ميغابايت. لا تُقبل الملفات التنفيذية.</p>}
      {block.hasAnswers && <p className="rounded-lg bg-sky-50 px-3 py-2 text-[11px] font-bold leading-5 text-sky-800">لهذا السؤال إجابات مسجّلة. حذفه من النموذج يُبقي إجاباته ظاهرة في الإرسالات القديمة.</p>}
    </aside>
  )
}
