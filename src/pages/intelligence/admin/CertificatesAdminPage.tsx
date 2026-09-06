import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Copy, Plus, Award } from 'lucide-react'
import { CertificateStatusBadge, IntelligencePageSkeleton } from '@/components/intelligence'
import EmptyState from '@/components/dashboard/EmptyState'
import {
  createCertificate,
  fetchAdminCertificates,
  updateCertificate,
} from '@/api/certificatesApi'

import type { CertificateRecord, CertificateStatus } from '@/types/intelligence'

export default function CertificatesAdminPage() {
  const [rows, setRows] = useState<CertificateRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  /** Imperative (re)load from an event handler or a failed mutation — outside any
   *  effect, so flipping to the loading state synchronously is allowed. */
  async function load() {
    setLoadError(null)
    setLoading(true)
    try {
      setRows(await fetchAdminCertificates())
    } catch {
      setLoadError('تعذّر تحميل الشهادات. تحقق من الاتصال وأعد المحاولة.')
    } finally {
      setLoading(false)
    }
  }

  // First load — the initial state already carries `loading: true`, so every state
  // update here happens after the await (no cascading render from the effect body).
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const data = await fetchAdminCertificates()
        if (!alive) return
        setRows(data)
        setLoadError(null)
      } catch {
        if (alive) setLoadError('تعذّر تحميل الشهادات. تحقق من الاتصال وأعد المحاولة.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  async function patchStatus(id: number, status: CertificateStatus, issued_at?: string | null) {
    setRows((list) => list.map((x) => (x.id === id ? { ...x, status, issued_at: issued_at ?? x.issued_at } : x)))
    try {
      const u = await updateCertificate(id, { status, ...(issued_at !== undefined ? { issued_at } : {}) })
      setRows((list) => list.map((x) => (x.id === id ? u : x)))
    } catch {
      await load()
    }
  }

  function copyVerifyLink(code: string) {
    const url = `${window.location.origin}/certificates/verify/${encodeURIComponent(code)}`
    void navigator.clipboard.writeText(url)
  }

  if (loading) return <IntelligencePageSkeleton />
  if (loadError) return (
    <div dir="rtl" className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
      <p className="font-black text-rose-800">{loadError}</p>
      <button type="button" onClick={() => void load()} className="mt-5 rounded-xl bg-deepBlue px-6 py-2.5 text-sm font-black text-white">إعادة المحاولة</button>
    </div>
  )

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="text-right">
          <h1 className="text-2xl font-black text-deepBlue">الشهادات</h1>
          <p className="mt-2 text-sm font-semibold text-slate-600">إصدار، اعتماد، وإبطال مع روابط التحقق</p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-customBlue px-5 py-2.5 text-xs font-black text-white shadow-md"
        >
          <Plus size={16} />
          إنشاء يدوي
        </button>
      </header>

      {rows.length === 0 ? (
        <EmptyState icon={Award} title="لا شهادات" />
      ) : (
        <motion.div layout className="overflow-x-auto rounded-[1.35rem] bg-white p-4 shadow-lg ring-1 ring-deepBlue/[0.06]">
          <table className="w-full min-w-[960px] text-right text-sm">
            <thead className="border-b border-slate-100 text-[11px] font-black uppercase text-slate-400">
              <tr>
                <th className="py-3">الطالب</th>
                <th className="py-3">العنوان</th>
                <th className="py-3">النوع</th>
                <th className="py-3">الحالة</th>
                <th className="py-3">رمز التحقق</th>
                <th className="py-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 font-semibold text-deepBlue">
                  <td className="py-3">
                    <div>{c.student_name}</div>
                    <div className="text-[10px] font-bold text-slate-400">{c.student_email}</div>
                  </td>
                  <td className="py-3 text-xs">{c.title}</td>
                  <td className="py-3 text-xs">{c.certificate_type}</td>
                  <td className="py-3">
                    <CertificateStatusBadge status={c.status} />
                  </td>
                  <td className="py-3 font-mono text-[11px]">{c.verification_code}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => copyVerifyLink(c.verification_code)}
                        className="rounded-lg bg-deepBlue/[0.06] px-2 py-1 text-[10px] font-black text-deepBlue"
                      >
                        <Copy size={12} className="inline" /> نسخ الرابط
                      </button>
                      {c.status === 'draft' && (
                        <button
                          type="button"
                          onClick={() => patchStatus(c.id, 'pending_approval')}
                          className="rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-900"
                        >
                          موافقة مبدئية
                        </button>
                      )}
                      {c.status === 'pending_approval' && (
                        <button
                          type="button"
                          onClick={() => patchStatus(c.id, 'issued', new Date().toISOString().slice(0, 10))}
                          className="rounded-lg bg-emerald-600 px-2 py-1 text-[10px] font-black text-white"
                        >
                          إصدار
                        </button>
                      )}
                      {c.status === 'issued' && (
                        <button
                          type="button"
                          onClick={() => patchStatus(c.id, 'revoked')}
                          className="rounded-lg bg-red-50 px-2 py-1 text-[10px] font-black text-red-800"
                        >
                          إبطال
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      <AnimatePresence>
        {createOpen && (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCreateOpen(false)}
            />
            <motion.div
              dir="rtl"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="fixed left-1/2 top-1/2 z-[60] w-[min(100%-2rem,440px)] -translate-x-1/2 -translate-y-1/2 rounded-[1.35rem] bg-white p-6 shadow-2xl ring-1 ring-deepBlue/[0.08]"
            >
              <h2 className="text-lg font-black text-deepBlue">إنشاء شهادة</h2>
              <ManualCertForm
                onCancel={() => setCreateOpen(false)}
                onSave={async (body) => {
                  try {
                    const x = await createCertificate(body)
                    setRows((r) => [x, ...r])
                  } catch {
                    const id = Math.max(0, ...rows.map((x) => x.id)) + 1
                    const verification_code = `EMC-${Date.now().toString().slice(-6)}`
                    setRows((r) => [
                      {
                        id,
                        verification_code,
                        status: 'draft',
                        issued_at: null,
                        ...body,
                      } as CertificateRecord,
                      ...r,
                    ])
                  }
                  setCreateOpen(false)
                }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function ManualCertForm({
  onSave,
  onCancel,
}: {
  onSave: (body: Partial<CertificateRecord>) => Promise<void>
  onCancel: () => void
}) {
  return (
    <form
      className="mt-4 space-y-3 text-right"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        void onSave({
          student_name: String(fd.get('student_name')),
          title: String(fd.get('title')),
          certificate_type: String(fd.get('certificate_type')),
          program_name: String(fd.get('program_name')) || null,
          course_name: String(fd.get('course_name')) || null,
        })
      }}
    >
      <label className="grid gap-1 text-xs font-black text-deepBlue">
        اسم الطالب
        <input name="student_name" required className="rounded-xl border border-slate-200 px-3 py-2 font-semibold" />
      </label>
      <label className="grid gap-1 text-xs font-black text-deepBlue">
        عنوان الشهادة
        <input name="title" required className="rounded-xl border border-slate-200 px-3 py-2 font-semibold" />
      </label>
      <label className="grid gap-1 text-xs font-black text-deepBlue">
        نوع الشهادة
        <input name="certificate_type" required className="rounded-xl border border-slate-200 px-3 py-2 font-semibold" />
      </label>
      <label className="grid gap-1 text-xs font-black text-deepBlue">
        البرنامج (اختياري)
        <input name="program_name" className="rounded-xl border border-slate-200 px-3 py-2 font-semibold" />
      </label>
      <label className="grid gap-1 text-xs font-black text-deepBlue">
        الدورة (اختياري)
        <input name="course_name" className="rounded-xl border border-slate-200 px-3 py-2 font-semibold" />
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-xl px-4 py-2 text-xs font-black text-slate-500 ring-1 ring-slate-200">
          إلغاء
        </button>
        <button type="submit" className="rounded-xl bg-customBlue px-5 py-2 text-xs font-black text-white">
          حفظ كمسودة
        </button>
      </div>
    </form>
  )
}
