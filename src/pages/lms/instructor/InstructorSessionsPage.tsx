import axios from 'axios'
import { useEffect, useMemo, useState } from 'react'
import { Calendar, CheckCircle2, Clock, Radio, XCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { fetchInstructorSessions } from '@/api/instructorApi'
import type { LmsSession } from '@/types/lms'
import { SessionCard } from '@/components/lms'
import { InstructorEmptyState, InstructorHero } from '@/components/instructor'

export default function InstructorSessionsPage() {
  const [sessions,    setSessions]   = useState<LmsSession[]>([])
  const [loading,     setLoading]    = useState(true)
  const [apiMissing,  setApiMissing]  = useState(false)

  async function load() {
    setLoading(true)
    try {
      setSessions(await fetchInstructorSessions())
      setApiMissing(false)
    } catch (err) {
      if (!axios.isCancel(err)) {
        setApiMissing(true)
        if (import.meta.env.DEV) console.error('[sessions] load failed:', err)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const { upcoming, live, past, cancelled } = useMemo(() => ({
    upcoming: sessions.filter((s) => s.status === 'scheduled'),
    live:     sessions.filter((s) => s.status === 'live'),
    past:     sessions.filter((s) => s.status === 'completed'),
    cancelled: sessions.filter((s) => s.status === 'cancelled'),
  }), [sessions])

  return (
    <div className="space-y-6 pb-16" dir="rtl">

      <InstructorHero
        title="الجلسات"
        subtitle="جلساتك المجدولة والمنتهية في دوراتك"
        backTo="/dashboard/instructor/courses"
        backLabel="الدورات"
        onRefresh={load}
        refreshing={loading}
        pills={loading ? [] : [
          { label: 'قادمة',  value: upcoming.length + live.length },
          { label: 'منتهية', value: past.length     },
        ]}
      />

      {apiMissing && import.meta.env.DEV && (
        <div className="rounded-xl bg-amber-50 px-5 py-3 text-right text-xs font-bold text-amber-800 ring-1 ring-amber-100">
          تحقق من <code className="rounded bg-white/80 px-1">GET /api/instructor/sessions</code>.
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <InstructorEmptyState
          icon={Calendar}
          title="لا توجد جلسات مجدولة"
          description="ستُعرض الجلسات المرتبطة بدوراتك هنا"
        />
      ) : (
        <div className="space-y-8">

          {(live.length > 0 || upcoming.length > 0) && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                {live.length > 0 ?
                  <Radio className="h-3.5 w-3.5 text-emerald-500" />
                : <Clock className="h-3.5 w-3.5 text-[#2691C2]" />}
                <h2 className="text-[12px] font-black uppercase tracking-widest text-deepBlue/45">
                  {live.length > 0 ? 'جلسات مباشرة وقادمة' : 'جلسات قادمة'}
                </h2>
              </div>
              <div className="grid gap-3">
                {[...live, ...upcoming].map((s, i) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <SessionCard session={s} />
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <h2 className="text-[12px] font-black uppercase tracking-widest text-deepBlue/45">جلسات منتهية</h2>
              </div>
              <div className="grid gap-3">
                {past.map((s, i) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <SessionCard session={s} />
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {cancelled.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <XCircle className="h-3.5 w-3.5 text-red-400" />
                <h2 className="text-[12px] font-black uppercase tracking-widest text-deepBlue/45">جلسات ملغاة</h2>
              </div>
              <div className="grid gap-3">
                {cancelled.map((s, i) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <SessionCard session={s} />
                  </motion.div>
                ))}
              </div>
            </section>
          )}

        </div>
      )}
    </div>
  )
}
