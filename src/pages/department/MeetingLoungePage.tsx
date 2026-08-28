import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import MeetingCard from '@/components/operations/MeetingCard'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import EmptyState from '@/components/dashboard/EmptyState'
import { Calendar, Users, LayoutDashboard, Flag } from 'lucide-react'
import CreateMeetingForm from '@/components/operations/CreateMeetingForm'
import MeetingReportModal from '@/components/operations/MeetingReportModal'
import { fetchMeetings } from '@/api/meetingsApi'
import type { MeetingType, OpsMeeting } from '@/types/operations'
import { useAuth } from '@/contexts/AuthContext'

const LOAD_ERROR = 'تعذّر تحميل الاجتماعات. تحقق من الاتصال وأعد المحاولة.'

export default function MeetingLoungePage() {
  const { user } = useAuth()
  const [items, setItems] = useState<OpsMeeting[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  // We can default the form to different types based on what the user clicked
  const [defaultMeetingType, setDefaultMeetingType] = useState<MeetingType>('departments')
  const [reportingMeetingId, setReportingMeetingId] = useState<number | null>(null)

  const retry = useCallback(async () => {
    setLoadError(null)
    setLoading(true)
    try {
      setItems(await fetchMeetings())
    } catch {
      setLoadError(LOAD_ERROR)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const rows = await fetchMeetings()
        // Filter by user's department visually if needed, though backend should ideally scope it,
        // but currently we just show all accessible meetings.
        if (!cancelled) setItems(rows)
      } catch {
        if (!cancelled) setLoadError(LOAD_ERROR)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const handleOpenCreate = (type: MeetingType) => {
    setDefaultMeetingType(type)
    setIsModalOpen(true)
  }

  if (loading) return <OpsPageSkeleton />
  if (loadError) return (
    <div dir="rtl" className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
      <p className="font-black text-rose-800">{loadError}</p>
      <button type="button" onClick={() => void retry()} className="mt-5 rounded-xl bg-deepBlue px-6 py-2.5 text-sm font-black text-white">إعادة المحاولة</button>
    </div>
  )

  return (
    <div dir="rtl" className="space-y-8 text-right">
      <header className="rounded-2xl border border-deepBlue/[0.06] bg-white p-6 shadow-sm ring-1 ring-deepBlue/[0.03]">
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-deepBlue">صالة الاجتماعات الذكية</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              عرض وجدولة اجتماعات إدارتك الحالية (مع إتاحة الشمولية الكاملة لإدارة الجودة والحوكمة والقيادة العليا)
            </p>
          </div>
        </div>
        
        {/* Meeting Type Selection */}
        <div className="grid gap-4 sm:grid-cols-3">
          <button 
            onClick={() => handleOpenCreate('departments')}
            className="group flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-5 text-center transition hover:border-customBlue/40 hover:bg-customBlue/[0.03] hover:shadow-sm"
          >
            <div className="rounded-full bg-white p-3 text-customBlue shadow-sm ring-1 ring-slate-200/50 group-hover:ring-customBlue/20">
              <Users size={24} />
            </div>
            <div>
              <h3 className="font-black text-deepBlue">اجتماع داخلي للإدارة</h3>
              <p className="mt-1 text-[11px] font-semibold text-slate-500">لقاء دوري خاص بالأعضاء والوحدات</p>
            </div>
          </button>
          
          <button 
            onClick={() => handleOpenCreate('exec')}
            className="group flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-5 text-center transition hover:border-indigo-500/40 hover:bg-indigo-500/[0.03] hover:shadow-sm"
          >
            <div className="rounded-full bg-white p-3 text-indigo-500 shadow-sm ring-1 ring-slate-200/50 group-hover:ring-indigo-500/20">
              <LayoutDashboard size={24} />
            </div>
            <div>
              <h3 className="font-black text-deepBlue">الاجتماع مع الإدارة العليا</h3>
              <p className="mt-1 text-[11px] font-semibold text-slate-500">رفع التقارير ومناقشة التوجهات</p>
            </div>
          </button>
          
          <button 
            onClick={() => handleOpenCreate('general')}
            className="group flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-5 text-center transition hover:border-emerald-500/40 hover:bg-emerald-500/[0.03] hover:shadow-sm"
          >
            <div className="rounded-full bg-white p-3 text-emerald-500 shadow-sm ring-1 ring-slate-200/50 group-hover:ring-emerald-500/20">
              <Flag size={24} />
            </div>
            <div>
              <h3 className="font-black text-deepBlue">اجتماع حدث / مسار خاص</h3>
              <p className="mt-1 text-[11px] font-semibold text-slate-500">هاكاثون، معسكر، فعالية مخصصة</p>
            </div>
          </button>
        </div>
      </header>

      <CreateMeetingForm
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => void retry()}
        initialType={defaultMeetingType}
        hideTypeSelector={true}
      />

      {reportingMeetingId && (
        <MeetingReportModal
          isOpen={true}
          meetingId={reportingMeetingId}
          onClose={() => setReportingMeetingId(null)}
          onSuccess={() => void retry()}
        />
      )}

      {items.length === 0 ? (
        <EmptyState icon={Calendar} title="لا اجتماعات مسجلة" />
      ) : (
        <motion.div layout className="grid gap-5 lg:grid-cols-2">
          {items.map((m) => (
            <MeetingCard 
              key={m.id} 
              m={m} 
              basePath="/dashboard/department/meeting-lounge" 
              onReportClick={(id) => setReportingMeetingId(id)}
            />
          ))}
        </motion.div>
      )}
    </div>
  )
}
