import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import FormBuilder from '@/components/operations/FormBuilder'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import { DashboardSection } from '@/components/dashboard'
import {
  fetchFormDefinition,
  fetchFormSubmissions,
  updateFormDefinition,
} from '@/api/formsApi'
import type { FormSubmissionRow, OpsFormDefinition } from '@/types/operations'

const LOAD_ERROR = 'تعذّر تحميل النموذج. تحقق من الاتصال وأعد المحاولة.'

export default function OpsFormDetailPage() {
  const { id } = useParams<{ id: string }>()
  const fid = id ? Number(id) : NaN
  const [form, setForm] = useState<OpsFormDefinition | null>(null)
  const [rows, setRows] = useState<FormSubmissionRow[]>([])
  const [tab, setTab] = useState<'edit' | 'subs'>('edit')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Re-arm the loading state during render when the route id changes (react.dev
  // "adjusting state when a prop changes"), so the fetch effect below never has to
  // touch state synchronously.
  const [seenFid, setSeenFid] = useState(fid)
  if (!Object.is(seenFid, fid)) {
    setSeenFid(fid)
    setLoading(true)
    setLoadError(null)
  }

  useEffect(() => {
    if (!Number.isFinite(fid)) return
    let cancelled = false
    void (async () => {
      try {
        const [f, s] = await Promise.all([fetchFormDefinition(fid), fetchFormSubmissions(fid)])
        if (cancelled) return
        setForm(f)
        setRows(s)
      } catch {
        if (!cancelled) setLoadError(LOAD_ERROR)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [fid])

  // Retry lives outside the effect, so the synchronous reset here is legitimate.
  const retry = useCallback(async () => {
    if (!Number.isFinite(fid)) return
    setLoadError(null)
    setLoading(true)
    try {
      const [f, s] = await Promise.all([fetchFormDefinition(fid), fetchFormSubmissions(fid)])
      setForm(f)
      setRows(s)
    } catch {
      setLoadError(LOAD_ERROR)
    } finally {
      setLoading(false)
    }
  }, [fid])

  if (!Number.isFinite(fid)) return <p className="text-center font-black text-deepBlue">معرف غير صالح</p>
  if (loading) return <OpsPageSkeleton />
  if (loadError) return (
    <div dir="rtl" className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
      <p className="font-black text-rose-800">{loadError}</p>
      <button type="button" onClick={() => void retry()} className="mt-5 rounded-xl bg-deepBlue px-6 py-2.5 text-sm font-black text-white">إعادة المحاولة</button>
    </div>
  )
  if (!form) return <OpsPageSkeleton />

  return (
    <div className="space-y-8">
      <Link
        to="/dashboard/admin/forms"
        className="inline-flex items-center gap-1 text-xs font-black text-customBlue hover:text-customOrange"
      >
        <ChevronLeft size={14} />
        كل النماذج
      </Link>

      <div className="flex flex-wrap justify-end gap-2 rounded-2xl bg-deepBlue/[0.03] p-2 ring-1 ring-deepBlue/[0.06]">
        <button
          type="button"
          onClick={() => setTab('edit')}
          className={`rounded-xl px-4 py-2 text-xs font-black ${tab === 'edit' ? 'bg-deepBlue text-white' : 'bg-white text-deepBlue ring-1 ring-deepBlue/[0.08]'}`}
        >
          المحرر
        </button>
        <button
          type="button"
          onClick={() => setTab('subs')}
          className={`rounded-xl px-4 py-2 text-xs font-black ${tab === 'subs' ? 'bg-deepBlue text-white' : 'bg-white text-deepBlue ring-1 ring-deepBlue/[0.08]'}`}
        >
          الإرسالات
        </button>
      </div>

      {tab === 'edit' ? (
        <FormBuilder
          initial={form}
          onSave={async (draft) => {
            try {
              const u = await updateFormDefinition(fid, draft)
              setForm(u)
            } catch {
              setForm({ ...form, ...draft, questions: draft.questions })
            }
          }}
        />
      ) : (
        <DashboardSection title="إرسالات النموذج">
          <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-deepBlue/[0.06]">
            <table className="w-full min-w-[480px] text-right text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-black uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">التاريخ</th>
                  <th className="px-4 py-3">المُرسِل</th>
                  <th className="px-4 py-3">لمحة</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 font-semibold text-deepBlue">
                    <td className="px-4 py-3">{r.id}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{r.submitted_at}</td>
                    <td className="px-4 py-3 text-xs">{r.submitter_label ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{r.answers_preview ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-center text-[11px] font-bold text-slate-400">
            تصدير CSV / Excel — placeholder عبر مسار الخادم لاحقاً.
          </p>
        </DashboardSection>
      )}
    </div>
  )
}
