import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowRight, Send, Clock, User } from 'lucide-react'
import { DashboardPageShell, EmcButton, Eyebrow, Surface } from '@/components/ui'
import { fetchInstructorTicket, replyInstructorTicket, type InstructorTicket } from '@/api/instructorApi'

const statusBadge = (s: string) => {
  const map: Record<string, string> = { open: 'مفتوح', in_progress: 'قيد المعالجة', resolved: 'تم الحل', closed: 'مغلق' }
  const cls: Record<string, string> = { open: 'bg-emerald-50 text-emerald-700', in_progress: 'bg-amber-50 text-amber-700', resolved: 'bg-blue-50 text-blue-700', closed: 'bg-slate-50 text-slate-700' }
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ring-inset ${cls[s] ?? cls.closed}`}>{map[s] ?? s}</span>
}

export default function InstructorTicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [ticket, setTicket] = useState<InstructorTicket | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (id) fetchInstructorTicket(Number(id)).then(setTicket)
  }, [id])

  const handleReply = async () => {
    if (!replyText.trim() || !ticket) return
    setSending(true)
    const newReply = await replyInstructorTicket(ticket.id, replyText)
    setTicket((prev) => prev ? { ...prev, replies: [...(prev.replies ?? []), newReply] } : prev)
    setReplyText('')
    setSending(false)
  }

  if (!ticket) return <DashboardPageShell title="تحميل..." eyebrow={<Eyebrow tone="accent">TICKET</Eyebrow>} description=""> </DashboardPageShell>

  return (
    <DashboardPageShell
      title={ticket.subject}
      eyebrow={
        <div className="flex items-center gap-3">
          <Link to="/dashboard/instructor/tickets" className="text-slate-400 hover:text-customBlue transition-colors">
            <ArrowRight size={16} />
          </Link>
          <Eyebrow tone="accent">INSTRUCTOR · TICKET #{ticket.id}</Eyebrow>
        </div>
      }
      description={`تم الإنشاء في ${new Date(ticket.created_at).toLocaleDateString('ar-EG')}`}
      badge={statusBadge(ticket.status)}
    >
      {/* Original message */}
      <Surface variant="default" elevation={3} padding="lg" className="mb-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-customBlue/10 flex items-center justify-center shrink-0">
            <User size={14} className="text-customBlue" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-black text-deepBlue">{ticket.name}</span>
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Clock size={10} /> {new Date(ticket.created_at).toLocaleString('ar-EG')}
              </span>
            </div>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{ticket.message}</p>
          </div>
        </div>
      </Surface>

      {/* Replies */}
      {ticket.replies && ticket.replies.length > 0 && (
        <div className="space-y-3 mb-4">
          {ticket.replies.map((reply) => (
            <Surface key={reply.id} variant="default" elevation={2} padding="lg">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                  <User size={14} className="text-indigo-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-black text-deepBlue">{reply.user?.name ?? 'الدعم'}</span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock size={10} /> {new Date(reply.created_at).toLocaleString('ar-EG')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{reply.message}</p>
                </div>
              </div>
            </Surface>
          ))}
        </div>
      )}

      {/* Reply form */}
      {ticket.status !== 'closed' && (
        <Surface variant="default" elevation={3} padding="lg">
          <h4 className="text-sm font-black text-deepBlue mb-3">إضافة رد</h4>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-customBlue/20"
            rows={3}
            placeholder="اكتب ردك هنا..."
          />
          <div className="flex justify-end mt-3">
            <EmcButton variant="primary" size="sm" onClick={handleReply} disabled={sending || !replyText.trim()} leadingIcon={<Send size={14} />}>
              {sending ? 'جاري الإرسال...' : 'إرسال الرد'}
            </EmcButton>
          </div>
        </Surface>
      )}
    </DashboardPageShell>
  )
}
