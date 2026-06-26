import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { fetchProgramsManagerDashboard, type ProgramsManagerDashboardPayload } from '@/api/programsManagerApi'
import ProgramsManagerDashboardView from '@/components/programs-manager/ProgramsManagerDashboardView'
import { useAuth } from '@/contexts/AuthContext'

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-40 rounded-[1.75rem] bg-[#22334A]/10" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-36 rounded-2xl bg-[#22334A]/8" />
        <div className="h-36 rounded-2xl bg-[#22334A]/8" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.65fr_1fr]">
        <div className="h-72 rounded-2xl bg-[#22334A]/8" />
        <div className="h-72 rounded-2xl bg-[#22334A]/8" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 rounded-2xl bg-[#22334A]/8" />
        ))}
      </div>
    </div>
  )
}

export default function ProgramsManagerDashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState<ProgramsManagerDashboardPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchProgramsManagerDashboard()
      setData(result)
    } catch {
      setError('تعذّر تحميل لوحة مدير البرامج. تحقق من الاتصال بالخادم وأعد المحاولة.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading && !data) return <DashboardSkeleton />

  if (error && !data) {
    return (
      <div dir="rtl" className="flex flex-col items-center gap-4 rounded-2xl border border-red-200 bg-red-50 p-12 text-center">
        <AlertTriangle size={36} className="text-red-400" />
        <p className="max-w-md text-sm font-semibold text-red-800">{error}</p>
        <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-[12px] font-black text-white hover:bg-red-700">
          <RefreshCw size={14} /> إعادة المحاولة
        </button>
      </div>
    )
  }

  if (!data) return null

  return (
    <ProgramsManagerDashboardView
      data={data}
      userName={user?.name}
      onRefresh={() => void load()}
      loading={loading}
    />
  )
}
