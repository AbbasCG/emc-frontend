import { useState } from 'react'
import axios from 'axios'
import { Loader2 } from 'lucide-react'
import { unitMembersApi, type DepartmentalUnitRow } from '@/api/unitMembersApi'
import { CenteredModal } from '@/components/ui/CenteredModal'
import { apiMessage } from '@/services/ticketOpsService'
import toast from '@/lib/toast'
import { adminFieldCls, adminLabelCls, adminPrimaryBtn, adminSecondaryBtn } from './adminStyles'

type Fields = 'code' | 'name_ar' | 'name_en' | 'description'

/** The server's message for each field it rejected (Laravel's `errors`), so each error sits under its own input. */
function fieldErrors(e: unknown): Partial<Record<Fields, string>> {
  if (!axios.isAxiosError(e)) return {}
  const errors = (e.response?.data as { errors?: Record<string, unknown> } | undefined)?.errors ?? {}
  const out: Partial<Record<Fields, string>> = {}
  for (const k of ['code', 'name_ar', 'name_en', 'description'] as const) {
    const v = errors[k]
    const first = Array.isArray(v) ? v[0] : v
    if (typeof first === 'string') out[k] = first
  }

  return out
}

/**
 * Create a unit in the chosen department, or edit an existing unit's names and description.
 * The department is the one the page is showing (never typed here); the code is fixed once created.
 * Validation messages come from the server and appear under the field they belong to.
 */
export function UnitFormModal({ departmentId, unit, onClose, onSaved }: { departmentId: number; unit: DepartmentalUnitRow | null; onClose: () => void; onSaved: () => void }) {
  const editing = unit !== null
  const [code, setCode] = useState(unit?.code ?? '')
  const [nameAr, setNameAr] = useState(unit?.name_ar ?? '')
  const [nameEn, setNameEn] = useState(unit?.name_en ?? '')
  const [description, setDescription] = useState(unit?.description ?? '')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<Fields, string>>>({})
  const [formError, setFormError] = useState<string | null>(null)

  const dirty = editing
    ? nameAr !== unit.name_ar || nameEn !== (unit.name_en ?? '') || description !== (unit.description ?? '')
    : code !== '' || nameAr !== '' || nameEn !== '' || description !== ''

  async function save() {
    if (saving) return
    const local: Partial<Record<Fields, string>> = {}
    if (!editing && !code.trim()) local.code = 'الرمز مطلوب.'
    if (!nameAr.trim()) local.name_ar = 'اسم الوحدة بالعربية مطلوب.'
    setErrors(local)
    setFormError(null)
    if (Object.keys(local).length > 0) return

    setSaving(true)
    try {
      if (editing) {
        await unitMembersApi.updateUnit(unit.id, { name_ar: nameAr.trim(), name_en: nameEn.trim(), description: description.trim() })
        toast.success('تم تحديث الوحدة.')
      } else {
        await unitMembersApi.createUnit({
          department_id: departmentId,
          code: code.trim(),
          name_ar: nameAr.trim(),
          ...(nameEn.trim() ? { name_en: nameEn.trim() } : {}),
          ...(description.trim() ? { description: description.trim() } : {}),
        })
        toast.success('تم إنشاء الوحدة التقنية.')
      }
      onSaved()
    } catch (e) {
      const fields = fieldErrors(e)
      setErrors(fields)
      if (Object.keys(fields).length === 0) setFormError(apiMessage(e, 'تعذّر حفظ الوحدة. حاول مرة أخرى.'))
    } finally {
      setSaving(false)
    }
  }

  const err = (k: Fields) => (errors[k] ? <p id={`unit-${k}-error`} role="alert" className="mt-1 text-[11px] font-bold text-rose-700">{errors[k]}</p> : null)
  const invalid = (k: Fields) => (errors[k] ? { 'aria-invalid': true as const, 'aria-describedby': `unit-${k}-error` } : {})

  return (
    <CenteredModal
      open
      onClose={onClose}
      size="md"
      testId="unit-modal"
      busy={saving}
      dirty={dirty}
      title={editing ? `تعديل الوحدة — ${unit.name_ar}` : 'وحدة تقنية جديدة'}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className={adminSecondaryBtn}>إلغاء</button>
          <button type="button" onClick={() => void save()} disabled={saving || (editing && !dirty)} aria-busy={saving} className={adminPrimaryBtn}>
            {saving ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : null}
            {saving ? 'جارٍ الحفظ…' : editing ? 'حفظ التعديلات' : 'إنشاء الوحدة'}
          </button>
        </div>
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); void save() }} className="space-y-4" noValidate>
        <div>
          <label htmlFor="unit-code" className={adminLabelCls}>الرمز {!editing ? <span className="text-rose-600">*</span> : null}</label>
          <input id="unit-code" dir="ltr" value={code} disabled={editing || saving} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="مثال: SW_DEV" className={`${adminFieldCls} font-mono`} {...invalid('code')} />
          {editing ? <p className="mt-1 text-[11px] font-semibold text-deepBlue/45">الرمز لا يتغير بعد إنشاء الوحدة.</p> : null}
          {err('code')}
        </div>
        <div>
          <label htmlFor="unit-name-ar" className={adminLabelCls}>الاسم بالعربية <span className="text-rose-600">*</span></label>
          <input id="unit-name-ar" value={nameAr} disabled={saving} onChange={(e) => setNameAr(e.target.value)} className={adminFieldCls} {...invalid('name_ar')} />
          {err('name_ar')}
        </div>
        <div>
          <label htmlFor="unit-name-en" className={adminLabelCls}>الاسم بالإنجليزية (اختياري)</label>
          <input id="unit-name-en" dir="ltr" value={nameEn} disabled={saving} onChange={(e) => setNameEn(e.target.value)} className={adminFieldCls} {...invalid('name_en')} />
          {err('name_en')}
        </div>
        <div>
          <label htmlFor="unit-description" className={adminLabelCls}>الوصف (اختياري)</label>
          <textarea id="unit-description" rows={3} value={description} disabled={saving} onChange={(e) => setDescription(e.target.value)} className={adminFieldCls} {...invalid('description')} />
          {err('description')}
        </div>
        {formError ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{formError}</p> : null}
      </form>
    </CenteredModal>
  )
}
