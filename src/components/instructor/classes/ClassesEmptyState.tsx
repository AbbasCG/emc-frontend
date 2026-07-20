import type { ElementType, ReactNode } from 'react'
import { BookOpen, HelpCircle, Lightbulb, Plus, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'

type Props = {
  title: string
  description?: string
  primaryAction?: { label: string; onClick: () => void }
}

const HELP_LINKS = [
  { icon: Lightbulb, label: 'كيف أبدأ؟', href: '/dashboard/instructor/courses', desc: 'دليل إعداد الصفوف' },
  { icon: Upload, label: 'استيراد بيانات', href: '#', desc: 'رفع ملف Excel للطلاب' },
  { icon: BookOpen, label: 'شروحات فيديو', href: '#', desc: 'تعلّم إدارة المجموعات' },
] as const

export function ClassesEmptyState({ title, description, primaryAction }: Props) {
  return (
    <div className="relative overflow-hidden rounded-[16px] border border-[#22334A]/[0.06] bg-gradient-to-b from-white to-[#F8FAFC] px-6 py-16 text-center shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#2691C2]/[0.04] to-transparent"
      />

      <div className="relative mx-auto max-w-md">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[16px] border border-white/80 bg-white/70 shadow-[0_8px_32px_-8px_rgba(38,145,194,0.25)] backdrop-blur-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#2691C2]/10">
            <HelpCircle className="h-8 w-8 text-[#2691C2]" />
          </div>
        </div>

        <h3 className="mt-6 text-[18px] font-bold text-[#22334A]">{title}</h3>
        {description && (
          <p className="mx-auto mt-2 max-w-sm text-[13px] font-medium leading-relaxed text-slate-500">
            {description}
          </p>
        )}

        {primaryAction && (
          <button
            type="button"
            onClick={primaryAction.onClick}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#22334A] px-5 py-2.5 text-[13px] font-bold text-white shadow-md transition hover:bg-[#2691C2]"
          >
            <Plus className="h-4 w-4" />
            {primaryAction.label}
          </button>
        )}
      </div>

      <div className="relative mx-auto mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
        {HELP_LINKS.map(({ icon: Icon, label, href, desc }) => (
          <Link
            key={label}
            to={href}
            className="group flex flex-col items-center gap-2 rounded-[16px] border border-dashed border-[#22334A]/10 bg-white/80 px-4 py-4 text-center transition hover:border-[#2691C2]/30 hover:bg-white hover:shadow-sm"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F8FAFC] text-[#2691C2] transition group-hover:bg-[#2691C2]/10">
              <Icon className="h-4 w-4" />
            </div>
            <span className="text-[12px] font-bold text-[#22334A]">{label}</span>
            <span className="text-[10px] font-medium text-slate-400">{desc}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function ClassesEmptyStateMini({
  icon: Icon,
  title,
  action,
}: {
  icon: ElementType
  title: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-[16px] border border-dashed border-[#22334A]/10 bg-[#F8FAFC]/80 py-10 text-center">
      <Icon className="mx-auto h-8 w-8 text-slate-300" />
      <p className="mt-3 text-[13px] font-bold text-slate-500">{title}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
