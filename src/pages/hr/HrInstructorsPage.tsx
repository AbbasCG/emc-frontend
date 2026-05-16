import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { GraduationCap } from 'lucide-react'
import EmptyState from '@/components/dashboard/EmptyState'
import { fetchInstructors, type InstructorPublic } from '@/api/instructorsApi'
import { HrPageShell } from '@/components/hr/HrLayout'
import { resolveTeamMemberImage } from '@/services/teamApi'

export default function HrInstructorsPage() {
  const [rows, setRows] = useState<InstructorPublic[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let c = false
    ;(async () => {
      try {
        const list = await fetchInstructors()
        if (!c) setRows(list)
      } catch {
        if (!c) setRows(null)
      } finally {
        if (!c) setLoading(false)
      }
    })()
    return () => {
      c = true
    }
  }, [])

  if (loading) return <div className="animate-pulse text-right opacity-70">يتم تحميل المدربين...</div>

  return (
    <HrPageShell title="المدربون" description="المدربون المعروضون في المنصّة العامة — نقطة بدء لمتابعة التوفر مع فريق الموارد البشرية.">
      {rows == null ?
        <p className="rounded-3xl bg-amber-50 px-6 py-8 text-center text-sm font-bold text-amber-900 ring-1 ring-amber-100">
          لم يتم ربط هذا القسم بالبيانات بعد
        </p>
      : rows.length === 0 ?
        <EmptyState icon={GraduationCap} title="لا يوجد مدربون في الكتالوج" />
      : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((instructor, i) => {
            const img = instructor.image_url ? resolveTeamMemberImage(instructor.image_url) : null
            return (
              <motion.article
                key={instructor.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-3xl border border-deepBlue/[0.06] bg-white/[0.9] p-5 text-right shadow-emc ring-1 ring-deepBlue/[0.04]"
              >
                <div className="flex items-start justify-end gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-black text-deepBlue">{instructor.name}</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-600">{instructor.title ?? 'مدرب EMC'}</p>
                  </div>
                  {img ?
                    <img src={img} alt="" className="h-14 w-14 rounded-2xl object-cover shadow-sm" loading="lazy" />
                  : <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-500/15 text-accent-800">
                      <GraduationCap />
                    </div>
                  }
                </div>
                <p className="mt-3 line-clamp-3 text-[12px] leading-relaxed text-slate-500">{instructor.bio ?? instructor.expertise ?? ''}</p>
              </motion.article>
            )
          })}
        </div>
      )}
    </HrPageShell>
  )
}
