import axios from 'axios'
import { useEffect, useState } from 'react'
import { FolderOpen } from 'lucide-react'
import { adminListMaterials } from '@/api/adminLmsApi'
import type { LmsMaterial } from '@/types/lms'
import { DashboardSection } from '@/components/dashboard'
import { LmsEmptyState, LmsPageSkeleton, MaterialCard } from '@/components/lms'

export default function AdminLmsMaterialsPage() {
  const [rows, setRows] = useState<LmsMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [apiMissing, setApiMissing] = useState(false)

  useEffect(() => {
    let alive = true
    adminListMaterials()
      .then((list) => {
        if (alive) setRows(list)
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
          <code className="rounded bg-white/80 px-1">/api/admin/lms/materials</code>
        </div>
      )}
      <DashboardSection title="المواد التعليمية (إداري)" subtitle="كل المواد المنشورة عبر الدورات والورش.">
        {rows.length === 0 ? (
          <LmsEmptyState icon={FolderOpen} title="لا توجد مواد" description="" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((m) => (
              <MaterialCard key={m.id} material={m} />
            ))}
          </div>
        )}
      </DashboardSection>
    </div>
  )
}
