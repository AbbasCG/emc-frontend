import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import {
  fetchSupportTicket,
  replySupportTicket,
  updateSupportTicket,
} from '@/api/supportApi'
import { SUPPORT_STATUS_AR } from '@/data/operationsLabels'
import type { SupportTicketDetail, SupportTicketStatus } from '@/types/operations'

export default function OpsSupportTicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const ticketListPath = location.pathname.startsWith('/dashboard/support')
    ? '/dashboard/support'
    : '/dashboard/admin/support-tickets'
  const tid = id ? Number(id) : NaN
  const [ticket, setTicket] = useState<SupportTicketDetail | null>(null)
  const [reply, setReply] = useState('')
  const [internal, setInternal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function loadTicket() {
    if (!Number.isFinite(tid)) return
    setLoadError(null)
    setLoading(true)
    try {
      setTicket(await fetchSupportTicket(tid))
    } catch {
      setLoadError('تعذّر تحميل التذكرة. تحقق من الاتصال وأعد المحاولة.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadTicket() }, [tid])

  async function sendReply(e: React.FormEvent) {
    e.preventDefault()
    if (!ticket || !reply.trim()) return
    setBusy(true)
    try {
      await replySupportTicket(ticket.id, { message: reply.trim(), internal })
      const d = await fetchSupportTicket(ticket.id)
      setTicket(d)
      setReply('')
      setInternal(false)
    } catch {
      setTicket({
        ...ticket,
        replies: [
          ...(ticket.replies ?? []),
          {
            id: Date.now(),
            author_name: internal ? 'ملاحظة داخلية' : 'أنت',
            body: reply.trim(),
            internal,
            created_at: new Date().toISOString(),
          },
        ],
      })
      setReply('')
    } finally {
      setBusy(false)
    }
  }

  async function patchStatus(status: SupportTicketStatus) {
    if (!ticket) return
    setTicket({ ...ticket, status })
    try {
      await updateSupportTicket(ticket.id, { status })
    } catch {
      /* ignore */
    }
  }

  if (!Number.isFinite(tid)) return <p className="text-center font-black text-deepBlue">معرف غير صالح</p>
  if (loading) return <OpsPageSkeleton />
  if (loadError) return (
    <div dir="rtl" className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
      <p className="font-black text-rose-800">{loadError}</p>
      <button type="button" onClick={() => void loadTicket()} className="mt-5 rounded-xl bg-deepBlue px-6 py-2.5 text-sm font-black text-white">إعادة المحاولة</button>
    </div>
  )
  if (!ticket) return <OpsPageSkeleton />

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link
        to={ticketListPath}
        className="inline-flex items-center gap-1 text-xs font-black text-customBlue hover:text-customOrange"
      >
        <ChevronLeft size={14} />
        كل التذاكر
      </Link>

      <header className="rounded-[1.35rem] bg-deepBlue p-8 text-right text-white shadow-xl">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">#{ticket.id}</p>
        <h1 className="mt-2 text-xl font-black">{ticket.subject}</h1>
        <div className="mt-4 flex flex-wrap justify-end gap-4 text-[11px] font-bold text-white/65">
          <span>{ticket.type ?? 'عام'}</span>
          <span>{ticket.priority ?? '—'}</span>
          <span>{ticket.requester_name ?? '—'}</span>
        </div>
        <label className="mt-6 grid gap-2 text-xs font-black text-white">
          الحالة
          <select
            value={ticket.status}
            onChange={(e) => patchStatus(e.target.value as SupportTicketStatus)}
            className="max-w-xs rounded-xl border border-white/20 bg-white/10 px-3 py-2 font-bold text-white outline-none"
          >
            {(Object.keys(SUPPORT_STATUS_AR) as SupportTicketStatus[]).map((k) => (
              <option key={k} value={k} className="text-deepBlue">
                {SUPPORT_STATUS_AR[k]}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-4 text-[11px] font-black text-customOrange">المُكلف: placeholder — ربط تعيين الوكيل لاحقاً</p>
      </header>

      <section className="rounded-2xl bg-white p-6 text-right ring-1 ring-deepBlue/[0.06]">
        <h2 className="text-sm font-black text-deepBlue">الرسالة الأصلية</h2>
        <p className="mt-4 text-sm font-medium leading-relaxed text-slate-700">{ticket.message ?? '—'}</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-black text-deepBlue">المحادثة</h2>
        <ul className="space-y-3">
          {(ticket.replies ?? []).map((r) => (
            <li
              key={r.id}
              className={`rounded-2xl px-5 py-4 text-right ring-1 ${
                r.internal ? 'bg-amber-50 ring-amber-100' : 'bg-white ring-deepBlue/[0.06]'
              }`}
            >
              <p className="text-[11px] font-black text-customBlue">{r.author_name}</p>
              <p className="mt-2 text-sm font-medium text-deepBlue/85">{r.body}</p>
              <p className="mt-2 text-[10px] font-bold text-slate-400">{r.created_at}</p>
            </li>
          ))}
        </ul>
      </section>

      <form onSubmit={sendReply} className="space-y-4 rounded-2xl bg-slate-50 p-6 ring-1 ring-deepBlue/[0.06]">
        <h3 className="text-sm font-black text-deepBlue">رد أو ملاحظة</h3>
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={4}
          className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-deepBlue"
          placeholder="اكتب ردك..."
        />
        <label className="flex items-center justify-end gap-2 text-xs font-black text-deepBlue">
          <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="accent-customBlue" />
          ملاحظة داخلية
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-customBlue py-3 text-sm font-black text-white disabled:opacity-50"
        >
          إرسال
        </button>
      </form>
    </div>
  )
}
