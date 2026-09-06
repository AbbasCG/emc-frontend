import PublicDetailSection from '@/components/public/detail/PublicDetailSection'

type Props = {
  title: string
  fullDescription: string | null
  prerequisitesBlock: string | null
  learningOutcomesBlock: string | null
  methodologyLines: string[]
  targetAudience: string | null
}

export default function PublicLongFormDetails({
  title,
  fullDescription,
  prerequisitesBlock,
  learningOutcomesBlock,
  methodologyLines,
  targetAudience,
}: Props) {
  const hasContent =
    fullDescription ||
    prerequisitesBlock ||
    learningOutcomesBlock ||
    methodologyLines.length > 0 ||
    targetAudience

  if (!hasContent) return null

  return (
    <PublicDetailSection id="details" title={title}>
      <div className="space-y-6">
        {fullDescription && (
          <div>
            <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">الوصف الكامل</h3>
            <p className="whitespace-pre-line text-base leading-9 text-slate-700">{fullDescription}</p>
          </div>
        )}

        {learningOutcomesBlock && (
          <div className="rounded-2xl border border-emerald-100 bg-gradient-to-l from-emerald-50/80 to-white p-5 text-right">
            <h3 className="text-xs font-black uppercase tracking-wide text-emerald-800">المخرجات التعليمية</h3>
            <p className="mt-3 whitespace-pre-line text-sm font-semibold leading-8 text-slate-700">
              {learningOutcomesBlock}
            </p>
          </div>
        )}

        {targetAudience && (
          <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-5 text-right">
            <h3 className="text-xs font-black uppercase tracking-wide text-violet-700">الجمهور المستهدف</h3>
            <p className="mt-3 whitespace-pre-line text-sm font-semibold leading-8 text-slate-700">{targetAudience}</p>
          </div>
        )}

        {prerequisitesBlock && (
          <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-5 text-right">
            <h3 className="text-xs font-black uppercase tracking-wide text-customBlue">المتطلبات المسبقة</h3>
            <p className="mt-3 whitespace-pre-line text-sm font-semibold leading-8 text-slate-700">
              {prerequisitesBlock}
            </p>
          </div>
        )}

        {methodologyLines.length > 0 && (
          <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-5 text-right">
            <h3 className="text-xs font-black uppercase tracking-wide text-amber-800">منهجية التدريب</h3>
            <ul className="mt-3 space-y-2">
              {methodologyLines.map((line) => (
                <li key={line} className="text-sm font-semibold leading-8 text-slate-700">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </PublicDetailSection>
  )
}
