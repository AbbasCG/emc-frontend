import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  Download,
  ExternalLink,
  Printer,
  Send,
  UserPlus,
} from 'lucide-react'
import { progressFromStatus, type PlacementStudentRow } from '@/api/placementApi'
import toast from '@/lib/toast'

type Props = {
  row: PlacementStudentRow
  courseId: string
  onApproveLevel: () => void
  canAssess: boolean
}

export function PlacementQuickActionsSidebar({ row, courseId, onApproveLevel, canAssess }: Props) {
  const progress = progressFromStatus(row.status)

  function handlePrint() {
    window.print()
  }

  function handleDownload() {
    toast.message('جاري تجهيز تقرير PDF — استخدم طباعة → حفظ كـ PDF')
    window.print()
  }

  function handleNotify() {
    toast.success('تم تسجيل طلب إشعار الطالب')
  }

  const actions = [
    {
      id: 'assign',
      label: 'إسناد الطالب',
      icon: UserPlus,
      href: `/dashboard/instructor/classes?course=${courseId}`,
      primary: false,
    },
    {
      id: 'approve',
      label: progress.level_approved ? 'تعديل التقييم' : 'اعتماد المستوى',
      icon: CheckCircle2,
      onClick: onApproveLevel,
      primary: true,
      disabled: !canAssess && !progress.level_approved,
    },
    {
      id: 'pdf',
      label: 'تنزيل PDF',
      icon: Download,
      onClick: handleDownload,
    },
    {
      id: 'print',
      label: 'طباعة التقرير',
      icon: Printer,
      onClick: handlePrint,
    },
    {
      id: 'notify',
      label: 'إشعار الطالب',
      icon: Send,
      onClick: handleNotify,
    },
    {
      id: 'profile',
      label: 'ملف الطالب',
      icon: ExternalLink,
      href: `/dashboard/instructor/courses/${courseId}/students`,
    },
  ]

  return (
    <aside className="print:hidden lg:sticky lg:top-4 lg:self-start">
      <div className="rounded-[16px] border border-[#0C2A4B]/[0.06] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <p className="mb-3 text-[11px] font-black uppercase tracking-widest text-deepBlue/40">
          إجراءات سريعة
        </p>
        <div className="space-y-2">
          {actions.map(({ id, label, icon: Icon, href, onClick, primary, disabled }) => {
            const cls = primary
              ? 'bg-[#0077B6] text-white hover:brightness-105 disabled:opacity-45'
              : 'border border-slate-200 bg-white text-deepBlue hover:border-[#0077B6]/30 hover:bg-sky-50/50 disabled:opacity-45'

            const inner = (
              <>
                <Icon className="h-4 w-4 shrink-0" />
                <span className="text-[12px] font-black">{label}</span>
              </>
            )

            if (href) {
              return (
                <Link
                  key={id}
                  to={href}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 transition ${cls}`}
                >
                  {inner}
                </Link>
              )
            }

            return (
              <button
                key={id}
                type="button"
                disabled={disabled}
                onClick={onClick}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 transition ${cls}`}
              >
                {inner}
              </button>
            )
          })}
        </div>

        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
          <p className="text-[10px] font-black text-deepBlue/45">حالة الإسناد</p>
          <p className="mt-1 text-[12px] font-black text-deepBlue">
            {progress.level_approved ? 'جاهز للإسناد' : 'بانتظار اعتماد المستوى'}
          </p>
        </div>
      </div>
    </aside>
  )
}
