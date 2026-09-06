import { Award, BadgeCheck } from 'lucide-react'
import PublicDetailSection from '@/components/public/detail/PublicDetailSection'

type Props = {
  certificateLine: string
  completionHint?: string | null
}

export default function PublicCertificateSection({ certificateLine, completionHint }: Props) {
  if (!certificateLine.trim()) return null

  return (
    <PublicDetailSection title="الشهادة">
      <div className="overflow-hidden rounded-3xl border border-amber-200/80 bg-gradient-to-l from-amber-50 via-white to-orange-50/40 p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-500 to-accent-600 text-white">
            <Award size={28} aria-hidden />
          </div>
          <div className="min-w-0 text-right">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-black text-amber-800 ring-1 ring-amber-200">
              <BadgeCheck size={14} aria-hidden />
              شهادة متاحة
            </div>
            <p className="text-base font-black text-deepBlue">{certificateLine}</p>
            {completionHint && (
              <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">{completionHint}</p>
            )}
            {!completionHint && (
              <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
                يُمنح الشهادة بعد إتمام متطلبات البرنامج بنجاح.
              </p>
            )}
          </div>
        </div>
      </div>
    </PublicDetailSection>
  )
}
