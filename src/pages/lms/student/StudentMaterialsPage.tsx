import axios from 'axios'
import { useEffect, useState } from 'react'
import { FolderOpen } from 'lucide-react'
import { fetchStudentMaterials } from '@/api/studentApi'
import type { LmsMaterial } from '@/types/lms'
import { DashboardSection } from '@/components/dashboard'
import { LmsEmptyState, LmsPageSkeleton, MaterialCard } from '@/components/lms'

export default function StudentMaterialsPage() {
  const [materials, setMaterials] = useState<LmsMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [apiMissing, setApiMissing] = useState(false)

  useEffect(() => {
    let alive = true
    fetchStudentMaterials()
      .then((rows) => {
        if (alive) setMaterials(rows)
      })
      .catch((err) => {
        if (!alive || axios.isCancel(err)) return
        setApiMissing(true)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  if (loading) return <LmsPageSkeleton />

  return (
    <div className="space-y-8">
      {apiMissing && import.meta.env.DEV && (
        <div className="rounded-xl bg-amber-50 px-5 py-3 text-right text-xs font-bold text-amber-800 ring-1 ring-amber-100">
          تحقق من نقطة النهاية <code className="rounded bg-white/80 px-1">GET /api/student/materials</code> على الخادم.
        </div>
      )}

      <DashboardSection title="مكتبة المواد" subtitle="ملفات، روابط، وفيديوهات الدورة أو الورشة.">
        {materials.length === 0 ? (
          <LmsEmptyState
            icon={FolderOpen}
            title="لا توجد مواد بعد"
            description="سيُرفع المحتوى التعليمي هنا من قبل الإدارة أو المدرب."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {materials.map((m) => (
              <MaterialCard key={m.id} material={m} />
            ))}
          </div>
        )}
      </DashboardSection>
    </div>
  )
}
