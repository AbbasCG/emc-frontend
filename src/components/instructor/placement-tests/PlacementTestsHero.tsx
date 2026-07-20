import { motion } from 'framer-motion'
import { BarChart3, ClipboardCheck, Mic, RefreshCw, UserCheck, Users } from 'lucide-react'
import { KpiCard } from '@/components/instructor/KpiCard'

type HeroStats = {
  total: number
  waitingWritten: number
  waitingOral: number
  assigned: number
  avgWritten: number | null
  avgOral: number | null
}

type Props = {
  stats: HeroStats
  loading: boolean
  onRefresh: () => void
  refreshing: boolean
}

export function PlacementTestsHero({ stats, loading, onRefresh, refreshing }: Props) {
  return (
    <div className="relative overflow-hidden rounded-[20px] border border-[#22334A]/[0.06] bg-gradient-to-l from-[#22334A] via-[#1a2d44] to-[#152536] p-5 shadow-[0_16px_48px_-20px_rgba(15,23,42,0.45)] sm:p-6">
      <div className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-[#EC943C]/15 blur-[60px]" />
      <div className="pointer-events-none absolute -bottom-8 right-0 h-32 w-32 rounded-full bg-[#2691C2]/20 blur-[50px]" />

      <div className="relative flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 xl:max-w-md">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white">
              <ClipboardCheck className="h-4 w-4" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/45">لوحة المعلّم</span>
          </div>
          <h1 className="text-xl font-black leading-tight text-white sm:text-2xl">اختبارات تحديد المستوى</h1>
          <p className="mt-2 text-[13px] font-semibold leading-relaxed text-white/55">
            إدارة جميع اختبارات تحديد المستوى ومتابعة انتقال الطالب من الاختبار إلى التوزيع على الصفوف.
          </p>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-[11px] font-black text-white/80 transition hover:bg-white/15 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'جاري التحديث...' : 'تحديث البيانات'}
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-3 xl:max-w-3xl xl:grid-cols-3"
        >
          <KpiCard icon={Users}         label="إجمالي الطلاب"           value={stats.total}          loading={loading} index={0} tone="text-[#2691C2] bg-[#2691C2]/10" />
          <KpiCard icon={ClipboardCheck} label="بانتظار الكتابي"        value={stats.waitingWritten} loading={loading} index={1} tone="text-slate-600 bg-slate-100" />
          <KpiCard icon={Mic}            label="بانتظار المقابلة"         value={stats.waitingOral}    loading={loading} index={2} tone="text-violet-600 bg-violet-100" />
          <KpiCard icon={UserCheck}      label="مُسندون"                  value={stats.assigned}       loading={loading} index={3} tone="text-emerald-600 bg-emerald-100" />
          <KpiCard icon={BarChart3}      label="متوسط الكتابي"           value={stats.avgWritten != null ? `${stats.avgWritten}%` : '—'} loading={loading} index={4} tone="text-[#EC943C] bg-[#EC943C]/15" />
          <KpiCard icon={BarChart3}      label="متوسط الشفوي"            value={stats.avgOral != null ? `${stats.avgOral}%` : '—'}     loading={loading} index={5} tone="text-[#2691C2] bg-[#2691C2]/10" />
        </motion.div>
      </div>
    </div>
  )
}
