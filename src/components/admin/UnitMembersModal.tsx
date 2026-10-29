import { useMemo, useState } from 'react'
import { Loader2, UserMinus } from 'lucide-react'
import { unitMembersApi, type DepartmentalUnitRow, type TeamMemberRow } from '@/api/unitMembersApi'
import AssigneeSearchSelect from '@/components/tickets/AssigneeSearchSelect'
import { CenteredModal } from '@/components/ui/CenteredModal'
import { apiMessage } from '@/services/ticketOpsService'
import toast from '@/lib/toast'
import { AdminBadge } from './AdminUi'
import { STATUS_LABEL, STATUS_TONE } from './memberMeta'
import { adminPrimaryBtn } from './adminStyles'

/**
 * Who is in one unit: add a member of the same department who has no unit, move a member to another unit, or
 * take them out of the unit (they stay in the department). Every change is checked again by the server, which
 * refuses a unit that does not belong to the member's department.
 */
export function UnitMembersModal({
  unit,
  units,
  members,
  unassigned,
  canManage,
  onClose,
  onChanged,
}: {
  unit: DepartmentalUnitRow
  units: DepartmentalUnitRow[]
  members: TeamMemberRow[]
  unassigned: TeamMemberRow[]
  canManage: boolean
  onClose: () => void
  /** Called after any successful change so the page reloads its lists. */
  onChanged: () => Promise<void> | void
}) {
  const [pickedUserId, setPickedUserId] = useState('')
  const [busy, setBusy] = useState<number | 'assign' | null>(null)
  const inUnit = useMemo(() => members.filter((m) => m.unit?.id === unit.id), [members, unit.id])
  const others = useMemo(() => units.filter((u) => u.id !== unit.id && u.is_active), [units, unit.id])
  const options = useMemo(() => unassigned.filter((m) => m.user).map((m) => ({ id: m.user!.id, name: m.user!.name, email: m.user!.email })), [unassigned])

  async function run(key: number | 'assign', action: () => Promise<unknown>, ok: string, fail: string) {
    if (busy !== null) return
    setBusy(key)
    try {
      await action()
      toast.success(ok)
      await onChanged()
    } catch (e) {
      toast.error(apiMessage(e, fail))
    } finally {
      setBusy(null)
    }
  }

  const assign = () => {
    // The picker works with user ids; the API needs the team-member row, so resolve it from the unassigned list.
    const member = unassigned.find((m) => String(m.user?.id) === pickedUserId)
    if (!member) return
    void run('assign', () => unitMembersApi.setMemberUnit(member.id, unit.id), 'تم إسناد العضو إلى الوحدة.', 'تعذّر الإسناد. تحقق من أن العضو في نفس الإدارة.').then(() => setPickedUserId(''))
  }

  return (
    <CenteredModal open onClose={onClose} size="md" testId="unit-members-modal" busy={busy !== null} dirty={pickedUserId !== ''} title={`موظفو الوحدة — ${unit.name_ar}`} subtitle={`${inUnit.length.toLocaleString('en-US')} عضو في الوحدة`}>
      <div className="space-y-5">
        {canManage ?
          <div>
            <label className="mb-1.5 block text-xs font-black text-deepBlue/70">إضافة عضو غير مُسند إلى هذه الوحدة</label>
            <div className="flex gap-2">
              <div className="min-w-0 flex-1">
                <AssigneeSearchSelect instanceId="unit-assign-select" ariaLabel="اختر عضوًا للإسناد" users={options} value={pickedUserId} onChange={setPickedUserId} placeholder="ابحث عن عضو بالاسم" noOptionsMessage="لا يوجد أعضاء غير مُسندين" />
              </div>
              <button type="button" onClick={assign} disabled={!pickedUserId || busy !== null} aria-busy={busy === 'assign'} className={adminPrimaryBtn}>
                {busy === 'assign' ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : null}
                إسناد
              </button>
            </div>
          </div>
        : <p className="rounded-xl border border-deepBlue/[0.07] bg-white px-3 py-2 text-[12px] font-bold text-deepBlue/60">عرض فقط: تعديل أعضاء الوحدة متاح لقيادة الإدارة والمسؤولين.</p>}

        <div>
          <p className="mb-1.5 text-xs font-black text-deepBlue/70">أعضاء الوحدة الحاليون</p>
          {inUnit.length === 0 ?
            <p className="rounded-xl border border-dashed border-deepBlue/15 py-6 text-center text-xs font-bold text-deepBlue/50">لا يوجد أعضاء في هذه الوحدة بعد.</p>
          : <ul className="space-y-2">
              {inUnit.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-deepBlue/[0.07] bg-white px-3 py-2.5" data-testid="unit-member">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-deepBlue">{m.user?.name}</p>
                    <div className="mt-0.5"><AdminBadge tone={STATUS_TONE[m.status]}>{STATUS_LABEL[m.status]}</AdminBadge></div>
                  </div>
                  {canManage ?
                    <div className="flex items-center gap-2">
                      {others.length > 0 ?
                        <select
                          value=""
                          disabled={busy !== null}
                          aria-label={`نقل ${m.user?.name ?? 'العضو'} إلى وحدة أخرى`}
                          onChange={(e) => {
                            const target = Number(e.target.value)
                            if (target) void run(m.id, () => unitMembersApi.setMemberUnit(m.id, target), 'تم نقل العضو إلى الوحدة الجديدة.', 'تعذّر نقل العضو.')
                          }}
                          className="rounded-lg border border-deepBlue/10 bg-white px-2 py-1.5 text-[11px] font-black text-deepBlue/80 outline-none focus:border-customBlue"
                        >
                          <option value="">نقل إلى…</option>
                          {others.map((u) => <option key={u.id} value={u.id}>{u.name_ar}</option>)}
                        </select>
                      : null}
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => void run(m.id, () => unitMembersApi.setMemberUnit(m.id, null), 'أُزيل العضو من الوحدة وبقيت عضويته في الإدارة.', 'تعذّر إزالة العضو من الوحدة.')}
                        aria-label={`إزالة ${m.user?.name ?? 'العضو'} من الوحدة`}
                        title="إزالة من الوحدة (تبقى عضويته في الإدارة)"
                        className="grid h-8 w-8 place-items-center rounded-lg border border-rose-200 text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                      >
                        {busy === m.id ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <UserMinus size={14} aria-hidden="true" />}
                      </button>
                    </div>
                  : null}
                </li>
              ))}
            </ul>}
        </div>
      </div>
    </CenteredModal>
  )
}
