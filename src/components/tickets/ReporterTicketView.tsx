import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link } from 'react-router';
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  Hash,
  Lightbulb,
  Loader2,
  MessageSquare,
  Paperclip,
  Send,
  ShieldAlert,
  Sparkles,
  XCircle,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import type { ReporterTicket } from '@/types/ticket';
import { ticketService } from '@/services/ticketService';
import { TicketAttachmentCard } from '@/components/tickets/TicketAttachmentCard';
import {
  formatReporterDate,
  formatReporterDay,
  reporterStatusCopy,
  type ReporterTone,
} from '@/utils/reporterTicketStatus';
import toast from '@/lib/toast';

/**
 * The read-only page the person who submitted a report or suggestion lands on
 * from the "resolved / approved / implemented" notification or email.
 *
 * It renders ONLY {@link ReporterTicket}, the server's whitelisted payload, so
 * no assignee, internal note, SLA, workflow control or raw activity log can
 * appear here: those fields do not exist on the type and are not sent. There
 * is no action center and no modal. The single write path is the optional
 * follow-up box, which the server enables only while the ticket is still open
 * (`capabilities.comment`) and enforces again on submit.
 */

interface ToneStyle {
  band: string;
  badge: string;
  iconWrap: string;
  icon: ReactNode;
}

const TONES: Record<ReporterTone, ToneStyle> = {
  success: {
    band: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    iconWrap: 'bg-emerald-100 text-emerald-700',
    icon: <CheckCircle2 className="h-7 w-7" aria-hidden="true" />,
  },
  info: {
    band: 'bg-brand-500',
    badge: 'bg-brand-50 text-brand-700 border-brand-200',
    iconWrap: 'bg-brand-100 text-brand-600',
    icon: <CheckCircle2 className="h-7 w-7" aria-hidden="true" />,
  },
  progress: {
    band: 'bg-brand-400',
    badge: 'bg-brand-50 text-brand-700 border-brand-200',
    iconWrap: 'bg-brand-100 text-brand-600',
    icon: <Loader2 className="h-7 w-7" aria-hidden="true" />,
  },
  review: {
    band: 'bg-amber-400',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    iconWrap: 'bg-amber-100 text-amber-700',
    icon: <Clock className="h-7 w-7" aria-hidden="true" />,
  },
  declined: {
    band: 'bg-rose-400',
    badge: 'bg-rose-50 text-rose-800 border-rose-200',
    iconWrap: 'bg-rose-100 text-rose-700',
    icon: <XCircle className="h-7 w-7" aria-hidden="true" />,
  },
};

export interface ReporterTicketViewProps {
  ticket: ReporterTicket;
  onBack: () => void;
  /** Re-fetch the canonical ticket (after a follow-up is sent). */
  onChanged: () => void;
}

export function ReporterTicketView({ ticket, onBack, onChanged }: ReporterTicketViewProps) {
  const isSuggestion = ticket.ticket_category === 'NEW_SUGGESTION';
  const copy = reporterStatusCopy(ticket.status, ticket.ticket_category);
  const tone = TONES[copy.tone];
  const noun = isSuggestion ? 'المقترح' : 'البلاغ';
  const lastUpdate = formatReporterDate(ticket.updated_at);

  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  const handleComment = async (e: FormEvent) => {
    e.preventDefault();
    const text = comment.trim();
    if (!text) return;
    setSending(true);
    try {
      await ticketService.addComment(ticket.id, text);
      toast.success('تم إرسال تعقيبك');
      setComment('');
      onChanged();
    } catch {
      toast.error('تعذر إرسال التعقيب. حاول مرة أخرى.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper px-4 py-8 text-foreground sm:px-6 lg:px-8" dir="rtl" data-testid="reporter-ticket-view">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* ── Nav ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-bold text-muted-500 transition hover:text-brand-700"
          >
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            رجوع إلى التذاكر
          </button>
          <Link
            to="/dashboard/tickets/new"
            className="text-xs font-bold text-muted-500 transition hover:text-brand-700"
          >
            تقديم تذكرة جديدة
          </Link>
        </div>

        {/* ── Status summary ── */}
        <section
          aria-label="ملخص الحالة"
          className="overflow-hidden rounded-3xl border border-line bg-white shadow-sm"
        >
          <div className={`h-1.5 w-full ${tone.band}`} aria-hidden="true" />
          <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start sm:p-8">
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${tone.iconWrap}`}
              aria-hidden="true"
            >
              {tone.icon}
            </div>

            <div className="min-w-0 flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
                  {isSuggestion ? (
                    <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {isSuggestion ? 'مقترح' : 'بلاغ'}
                </span>
                <span
                  data-testid="resolution-badge"
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-extrabold ${tone.badge}`}
                >
                  {copy.badge}
                </span>
              </div>

              <div>
                <h1 className="text-2xl font-extrabold leading-snug text-brand-800 sm:text-3xl">{ticket.title}</h1>
                <p className="mt-2 text-sm leading-7 text-slate-600">{copy.hint}</p>
              </div>

              <dl className="grid grid-cols-1 gap-3 border-t border-line pt-4 text-sm sm:grid-cols-3">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 shrink-0 text-muted-400" aria-hidden="true" />
                  <div>
                    <dt className="text-[11px] font-bold text-muted-500">رقم {noun}</dt>
                    <dd className="font-mono text-xs font-bold text-slate-800" dir="ltr">{ticket.ticket_number}</dd>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 shrink-0 text-muted-400" aria-hidden="true" />
                  <div>
                    <dt className="text-[11px] font-bold text-muted-500">الحالة الحالية</dt>
                    <dd className="text-xs font-bold text-slate-800">{copy.statusLabel}</dd>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 shrink-0 text-muted-400" aria-hidden="true" />
                  <div>
                    <dt className="text-[11px] font-bold text-muted-500">آخر تحديث</dt>
                    <dd className="text-xs font-bold text-slate-800">{lastUpdate || '—'}</dd>
                  </div>
                </div>
              </dl>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* ── Main column ── */}
          <div className="space-y-6 lg:col-span-2">
            {/* The final answer comes first: it is what they opened the page for. */}
            {ticket.resolution_note && (
              <section
                aria-label="ملخص الحل"
                data-testid="resolution-note"
                className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm"
              >
                <h2 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  {isSuggestion ? 'ما تم بشأن مقترحك' : 'ما تم لحل بلاغك'}
                </h2>
                <p className="whitespace-pre-wrap text-sm leading-7 text-emerald-900">{ticket.resolution_note}</p>
              </section>
            )}

            {ticket.rejection_reason && (
              <section
                aria-label="سبب القرار"
                data-testid="rejection-reason"
                className="rounded-3xl border border-rose-200 bg-rose-50 p-6 shadow-sm"
              >
                <h2 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-rose-800">
                  <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                  سبب القرار
                </h2>
                <p className="whitespace-pre-wrap text-sm leading-7 text-rose-900">{ticket.rejection_reason}</p>
              </section>
            )}

            <section aria-label="الوصف الأصلي" className="rounded-3xl border border-line bg-white p-6 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-brand-800">
                <FileText className="h-4 w-4 text-muted-400" aria-hidden="true" />
                وصف {noun} كما قدّمته
              </h2>
              <p className="whitespace-pre-wrap text-sm leading-8 text-slate-700">{ticket.description}</p>
            </section>

            {ticket.attachments.length > 0 && (
              <section aria-label="المرفقات" className="rounded-3xl border border-line bg-white p-6 shadow-sm">
                <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-brand-800">
                  <Paperclip className="h-4 w-4 text-muted-400" aria-hidden="true" />
                  مرفقاتك ({ticket.attachments.length})
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {ticket.attachments.map((att) => (
                    <TicketAttachmentCard key={att.id} attachment={att} />
                  ))}
                </div>
              </section>
            )}

            {/* Follow-up: only while the ticket is open. The server decides. */}
            {ticket.capabilities.comment && (
              <section aria-label="إضافة تعقيب" className="rounded-3xl border border-line bg-white p-6 shadow-sm">
                <h2 className="mb-1 flex items-center gap-2 text-sm font-extrabold text-brand-800">
                  <MessageSquare className="h-4 w-4 text-brand-500" aria-hidden="true" />
                  هل لديك إضافة أو استفسار؟
                </h2>
                <p className="mb-3 text-xs text-muted-500">يصل تعقيبك إلى الفريق المسؤول عن {noun}.</p>
                <form onSubmit={handleComment} className="space-y-3">
                  <textarea
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={2000}
                    aria-label="نص التعقيب"
                    placeholder="اكتب تعقيبك هنا..."
                    className="w-full resize-none rounded-xl border border-line bg-paper p-4 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={sending || !comment.trim()}
                      className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-brand-600 disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" aria-hidden="true" />
                      إرسال التعقيب
                    </button>
                  </div>
                </form>
              </section>
            )}
          </div>

          {/* ── Side column ── */}
          <aside className="space-y-5">
            <section aria-label="مراحل الطلب" className="rounded-3xl border border-line bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-sm font-extrabold text-brand-800">مراحل {noun}</h2>
              <ol className="space-y-5" data-testid="reporter-timeline">
                {ticket.timeline.map((step, idx) => {
                  const isLast = idx === ticket.timeline.length - 1;
                  const done = step.key === 'resolved';
                  const bad = step.key === 'declined';
                  const dot = done
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : bad
                      ? 'border-rose-400 bg-rose-400 text-white'
                      : isLast
                        ? 'border-brand-500 bg-white text-brand-500'
                        : 'border-brand-300 bg-brand-50 text-brand-500';
                  return (
                    <li key={step.key} className="relative flex gap-3">
                      {!isLast && (
                        <span className="absolute right-[11px] top-6 h-[calc(100%-2px)] w-px bg-line" aria-hidden="true" />
                      )}
                      <span
                        className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${dot}`}
                        aria-hidden="true"
                      >
                        {done ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : bad ? (
                          <XCircle className="h-3.5 w-3.5" />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className={`text-xs font-extrabold ${done ? 'text-emerald-700' : 'text-slate-800'}`}>{step.label}</p>
                        {step.at && <p className="mt-0.5 text-[11px] text-muted-500">{formatReporterDate(step.at)}</p>}
                        {step.note && (
                          <p className="mt-1 whitespace-pre-wrap text-[11px] leading-5 text-slate-500">{step.note}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>

            <section aria-label="معلومات إضافية" className="space-y-3 rounded-3xl border border-line bg-white p-6 shadow-sm">
              <h2 className="text-sm font-extrabold text-brand-800">معلومات إضافية</h2>
              <div className="flex items-center gap-2 text-xs">
                <CalendarClock className="h-4 w-4 shrink-0 text-muted-400" aria-hidden="true" />
                <span className="text-muted-500">تاريخ التقديم:</span>
                <span className="font-bold text-slate-800">{formatReporterDay(ticket.created_at)}</span>
              </div>
              {ticket.department && (
                <div className="flex items-center gap-2 text-xs">
                  <Building2 className="h-4 w-4 shrink-0 text-muted-400" aria-hidden="true" />
                  <span className="text-muted-500">الجهة المعنية:</span>
                  <span className="font-bold text-slate-800">{ticket.department.name}</span>
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
