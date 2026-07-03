import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Mail, Phone } from 'lucide-react'
import { fetchQualityTeam } from '@/api/qualityApi'
import toast from '@/lib/toast'

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase()
}

function Skeleton() {
  return (
    <div className="bg-white rounded-2xl border border-deepBlue/[0.07] p-6 space-y-4 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-slate-200" />
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-slate-200 rounded w-1/2" />
          <div className="h-3 bg-slate-100 rounded w-1/3" />
        </div>
      </div>
      <div className="h-3 bg-slate-100 rounded w-2/3" />
      <div className="grid grid-cols-3 gap-2">
        <div className="h-8 bg-slate-100 rounded-xl" />
        <div className="h-8 bg-slate-100 rounded-xl" />
        <div className="h-8 bg-slate-100 rounded-xl" />
      </div>
    </div>
  )
}

export default function QualityTeamPage() {
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchQualityTeam()
      .then(d => setMembers(Array.isArray(d) ? d : []))
      .catch(() => toast.error('تعذّر تحميل فريق الجودة'))
      .finally(() => setLoading(false))
  }, [])

  const avatarColors = [
    'bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-orange-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-amber-500', 'bg-indigo-500',
  ]

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-6">
      <div className="mb-6">
        <h1 className="text-xl font-black text-deepBlue">فريق الجودة</h1>
        <p className="text-sm text-slate-500 mt-1">أعضاء الفريق المسؤولون عن ضمان الجودة</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} />)}
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <Users className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-base">لا يوجد أعضاء في فريق الجودة</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {members.map((m, idx) => {
            const pending = m.pending_reviews ?? 0
            const isHighPending = pending > 5
            return (
              <motion.div key={m.id ?? idx}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-2xl border border-deepBlue/[0.07] shadow-sm p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="relative shrink-0">
                    {m.avatar || m.photo ? (
                      <img src={m.avatar ?? m.photo} alt={m.name}
                        className="w-14 h-14 rounded-full object-cover" />
                    ) : (
                      <div className={`w-14 h-14 rounded-full ${avatarColors[idx % avatarColors.length]} flex items-center justify-center text-white font-bold text-lg`}>
                        {initials(m.name ?? '?')}
                      </div>
                    )}
                    <span className={`absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${isHighPending ? 'bg-orange-400' : 'bg-emerald-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-deepBlue text-sm truncate">{m.name ?? '—'}</h3>
                    {m.role && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">{m.role}</span>
                    )}
                    {m.department && <p className="text-xs text-slate-400 mt-1 truncate">{m.department}</p>}
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-500 mb-4">
                  {m.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      <span className="truncate">{m.email}</span>
                    </div>
                  )}
                  {m.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{m.phone}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'المسندة', value: m.assigned_reviews ?? 0, color: 'text-blue-600 bg-blue-50' },
                    { label: 'المكتملة', value: m.completed_reviews ?? 0, color: 'text-emerald-600 bg-emerald-50' },
                    { label: 'المعلقة', value: pending, color: isHighPending ? 'text-orange-600 bg-orange-50' : 'text-slate-600 bg-slate-50' },
                  ].map(stat => (
                    <div key={stat.label} className={`${stat.color} rounded-xl p-2 text-center`}>
                      <p className="text-sm font-bold">{Number(stat.value).toLocaleString('en-US')}</p>
                      <p className="text-[10px] mt-0.5 opacity-75">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
