import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { unitMembersApi, type MemberStatus, type TeamMemberRow } from '@/api/unitMembersApi'
import MemberSearchSelect, { type SelectedMember } from '@/components/admin/MemberSearchSelect'
import { CenteredModal } from '@/components/ui/CenteredModal'
import { useAbortableResource } from '@/hooks/useAbortableResource'
import { apiMessage } from '@/services/ticketOpsService'
import toast from '@/lib/toast'
import { ROLE_LABELS } from '@/components/product-updates/productUpdateMeta'
import { AdminBadge } from './AdminUi'
import { STATUS_LABEL } from './memberMeta'
import { adminFieldCls, adminLabelCls, adminPrimaryBtn, adminSecondaryBtn } from './adminStyles'

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-black text-deepBlue/50">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-black text-deepBlue">{children}</dd>
    </div>
  )
}

/**
 * Add a member to a department, or change where an existing member sits (unit) and their status.
 *
 * Who the person is, their department and their job title are never typed here: they come from the member's
 * canonical profile, and the server ignores anything sent for them. This form only places the member.
 * A second press while saving does nothing, and closing over unsaved input asks first.
 */
export function MemberFormModal({ member, onClose, onSaved }: { member: TeamMemberRow | null; onClose: () => void; onSaved: () => void }) {
  const editing = member !== null
  const [picked, setPicked] = useState<SelectedMember | null>(null)
  const [unitId, setUnitId] = useState(member?.unit ? String(member.unit.id) : '')
  const [status, setStatus] = useState<MemberStatus>(member?.status ?? 'active')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const departmentId = editing ? (member.department?.id ?? null) : (picked?.departmentId ?? null)
  const units = useAbortableResource((signal) => unitMembersApi.listUnits(departmentId ?? 0, signal), `form-units:${departmentId}`, departmentId !== null)
  // A disabled unit is not offered for new placements, but the one the member is already in stays visible.
  const unitRows = departmentId !== null ? (units.data ?? []).filter((u) => u.is_active || u.id === member?.unit?.id) : []

  const dirty = editing ? unitId !== (member.unit ? String(member.unit.id) : '') || status !== member.status : picked !== null || unitId !== '' || status !== 'active'

  function changeMember(next: SelectedMember | null) {
    // A different person means a different (or unknown) department, so any chosen unit may no longer fit.
    setPicked(next)
    setUnitId('')
    setError(null)
  }

  async function save() {
    if (saving) return
    if (!editing && !picked) return setError('اختر العضو أولًا.')
    if (!editing && picked && !picked.departmentId) return setError('هذا العضو غير مرتبط بإدارة في بيانات الفريق. اربطه بإدارة من صفحة «الأعضاء» أولًا.')

    setSaving(true)
    setError(null)
    try {
      const payload = { unit_id: unitId ? Number(unitId) : null, status }
      if (editing) {
        await unitMembersApi.updateMember(member.id, payload)
        toast.success('تم تحديث بيانات العضو.')
      } else {
        await unitMembersApi.createMember({ user_id: picked!.userId, ...payload })
        toast.success('تمت إضافة العضو إلى الإدارة.')
      }
      onSaved()
    } catch (e) {
      setError(apiMessage(e, 'تعذّر حفظ بيانات العضو. تحقق من أن العضو غير مضاف سابقًا وأن الوحدة تتبع إدارته.'))
    } finally {
      setSaving(false)
    }
  }

  const shown = editing
    ? { name: member.user?.name ?? '—', email: member.user?.email ?? '', role: member.user?.role ?? '', department: member.department?.name ?? null, title: member.role_title }
    : picked
      ? { name: picked.name, email: '', role: '', department: picked.departmentName, title: picked.roleTitle }
      : null

  return (
    <CenteredModal
      open
      onClose={onClose}
      size="md"
      testId="member-modal"
      busy={saving}
      dirty={dirty}
      title={editing ? 'تعديل بيانات العضو' : 'إضافة عضو إلى إدارة'}
      subtitle={editing ? member.user?.name : 'اختر عضو EMC الحالي ثم حدّد وحدته وحالته.'}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className={adminSecondaryBtn}>إلغاء</button>
          <button type="button" onClick={() => void save()} disabled={saving || (editing && !dirty)} aria-busy={saving} className={adminPrimaryBtn}>
            {saving ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : null}
            {saving ? 'جارٍ الحفظ…' : editing ? 'حفظ التعديلات' : 'إضافة العضو'}
          </button>
        </div>
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); void save() }} className="space-y-5" noValidate>
        {!editing ?
          <div>
            <label className={adminLabelCls}>العضو <span className="text-rose-600">*</span></label>
            <MemberSearchSelect instanceId="team-member-member-select" ariaLabel="اختر العضو" value={picked} onChange={changeMember} />
            <p className="mt-1.5 text-[11px] font-semibold text-deepBlue/50">تعرض القائمة أعضاء EMC الحاليين فقط. هذه الصفحة لا تُنشئ أعضاء أو حسابات جديدة.</p>
          </div>
        : null}

        <dl className="grid grid-cols-2 gap-4 rounded-2xl border border-deepBlue/[0.07] bg-white p-4" data-testid="member-identity">
          <Fact label="الاسم">{shown?.name ?? <span className="text-deepBlue/35">اختر عضوًا</span>}</Fact>
          <Fact label="الدور">{shown?.role ? <AdminBadge tone="info">{ROLE_LABELS[shown.role] ?? shown.role}</AdminBadge> : '—'}</Fact>
          <Fact label="الإدارة">{shown?.department ?? '—'}</Fact>
          <Fact label="المسمى الوظيفي">{shown?.title ?? '—'}</Fact>
          {shown?.email ? <div className="col-span-2"><Fact label="البريد الإلكتروني"><span dir="ltr">{shown.email}</span></Fact></div> : null}
        </dl>
        {shown ? <p className="-mt-3 text-[11px] font-semibold text-deepBlue/45">الإدارة والمسمى الوظيفي من الملف الأساسي للعضو، ولا يتغيران من هنا.</p> : null}

        {!editing && picked && !picked.departmentId ?
          <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">هذا العضو غير مرتبط بإدارة في بيانات الفريق الحالية.</p>
        : null}

        <div>
          <label htmlFor="member-unit" className={adminLabelCls}>الوحدة (اختياري)</label>
          <select id="member-unit" value={unitId} disabled={departmentId === null || units.loading || saving} onChange={(e) => setUnitId(e.target.value)} className={adminFieldCls}>
            <option value="">{departmentId === null ? 'اختر عضوًا أولًا' : units.loading ? 'جارٍ التحميل…' : 'بدون وحدة'}</option>
            {unitRows.map((u) => <option key={u.id} value={u.id}>{u.name_ar}</option>)}
          </select>
          {units.error ? <p role="alert" className="mt-1 text-[11px] font-bold text-rose-700">تعذّر تحميل وحدات الإدارة.</p> : null}
          {departmentId !== null && !units.loading && !units.error && unitRows.length === 0 ? <p className="mt-1 text-[11px] font-bold text-amber-700">لا توجد وحدات لهذه الإدارة بعد.</p> : null}
        </div>

        <div>
          <label htmlFor="member-status" className={adminLabelCls}>الحالة</label>
          <select id="member-status" value={status} disabled={saving} onChange={(e) => setStatus(e.target.value as MemberStatus)} className={adminFieldCls}>
            {(Object.keys(STATUS_LABEL) as MemberStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </div>

        {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</p> : null}
      </form>
    </CenteredModal>
  )
}
