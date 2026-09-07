import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { LifeBuoy, Plus, ChevronRight } from 'lucide-react'
import { DashboardPageShell, EmcButton, Eyebrow, Surface } from '@/components/ui'
import { DataTable, type DataTableColumn } from '@/components/dashboard'
import { fetchInstructorTickets, createInstructorTicket, type InstructorTicket } from '@/api/instructorApi'

const ticketStatusBadge = (status: string) => {
  const map: Record<string, { label: string; cls: string }> = {
    open:       { label: 'مفتوح',    cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
    in_progress:{ label: 'قيد المعالجة', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
    resolved:   { label: 'تم الحل',  cls: 'bg-blue-50 text-blue-700 ring-blue-200' },
    closed:     { label: 'مغلق',     cls: 'bg-slate-50 text-slate-700 ring-slate-200' },
  }
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${(map[status] ?? map.closed).cls}`}>{(map[status] ?? map.closed).label}</span>
}

const priorityBadge = (p: string) => {
  const map: Record<string, { label: string; cls: string }> = {
    low:    { label: 'منخفضة', cls: 'bg-slate-50 text-slate-600 ring-slate-200' },
    medium: { label: 'متوسطة', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
    high:   { label: 'عالية',  cls: 'bg-red-50 text-red-700 ring-red-200' },
  }
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ring-1 ${(map[p] ?? map.low).cls}`}>{(map[p] ?? map.low).label}</span>
}

export default function InstructorTicketsPage() {
  const [tickets, setTickets] = useState<InstructorTicket[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: 'technical', priority: 'medium', subject: '', message: '' })

  useEffect(() => {
    fetchInstructorTickets().then(setTickets)
  }, [])

  const handleSubmit = async () => {
    const created = await createInstructorTicket(form)
    setTickets((prev) => [created, ...prev])
    setForm({ type: 'technical', priority: 'medium', subject: '', message: '' })
    setShowForm(false)
  }

  const columns: DataTableColumn<InstructorTicket>[] = [
    { key: 'subject', header: 'الموضوع', render: (r) => (
      <Link to={`/dashboard/instructor/tickets/${r.id}`} className="text-sm font-bold text-customBlue hover:underline truncate max-w-[200px] block">
        {r.subject}
      </Link>
    )},
    { key: 'type', header: 'النوع', width: '100px' },
    { key: 'priority', header: 'الأولوية', render: (r) => priorityBadge(r.priority), width: '100px' },
    { key: 'status', header: 'الحالة', render: (r) => ticketStatusBadge(r.status), width: '110px' },
    { key: 'created_at', header: 'التاريخ', render: (r) => new Date(r.created_at).toLocaleDateString('ar-EG'), width: '120px' },
    {
      key: 'actions', header: '', width: '40px',
      render: (r) => (
        <Link to={`/dashboard/instructor/tickets/${r.id}`} className="text-slate-300 hover:text-customBlue transition-colors">
          <ChevronRight size={16} />
        </Link>
      ),
    },
  ]

  return (
    <DashboardPageShell
      title="تذاكر الدعم"
      eyebrow={<Eyebrow tone="accent">INSTRUCTOR · SUPPORT TICKETS</Eyebrow>}
      description="التواصل مع فريق الدعم الفني وحل المشكلات."
      actions={
        <EmcButton variant="primary" size="sm" onClick={() => setShowForm(true)} leadingIcon={<Plus size={15} />}>
          تذكرة جديدة
        </EmcButton>
      }
    >
      {/* New ticket form */}
      {showForm && (
        <Surface variant="default" elevation={3} padding="lg" className="mb-6">
          <h3 className="text-base font-black text-deepBlue mb-4">تذكرة دعم جديدة</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">النوع</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-customBlue/20">
                <option value="technical">مشكلة تقنية</option>
                <option value="administrative">استفسار إداري</option>
                <option value="financial">مشكلة مالية</option>
                <option value="other">أخرى</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">الأولوية</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-customBlue/20">
                <option value="low">منخفضة</option>
                <option value="medium">متوسطة</option>
                <option value="high">عالية</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1">الموضوع</label>
              <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-customBlue/20" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1">الرسالة</label>
              <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-customBlue/20" rows={4} />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <EmcButton variant="primary" size="sm" onClick={handleSubmit} leadingIcon={<LifeBuoy size={14} />}>إرسال التذكرة</EmcButton>
            <EmcButton variant="secondary" size="sm" onClick={() => setShowForm(false)}>إلغاء</EmcButton>
          </div>
        </Surface>
      )}

      {/* Tickets table */}
      <Surface variant="default" elevation={3} padding="none" className="overflow-hidden">
        {tickets.length > 0 ? (
          <DataTable<InstructorTicket> columns={columns} data={tickets} keyExtractor={(r) => r.id} emptyMessage="لا توجد تذاكر" />
        ) : (
          <div className="px-6 py-12 text-center">
            <LifeBuoy size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-black text-slate-500">لا توجد تذاكر دعم</p>
            <p className="mt-2 text-xs text-slate-400">يمكنك إنشاء تذكرة جديدة للتواصل مع فريق الدعم</p>
          </div>
        )}
      </Surface>
    </DashboardPageShell>
  )
}
