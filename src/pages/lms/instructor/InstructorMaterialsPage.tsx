import { useEffect, useState } from 'react'
import { FileText, ExternalLink, Plus, Pencil, Trash2 } from 'lucide-react'
import { DashboardPageShell, EmcButton, Surface, Eyebrow } from '@/components/ui'
import { DataTable, type DataTableColumn } from '@/components/dashboard'
import { fetchInstructorCourses } from '@/api/instructorApi'
import {
  fetchInstructorMaterials,
  createInstructorMaterial,
  updateInstructorMaterial,
  deleteInstructorMaterial,
  type InstructorMaterial,
} from '@/api/instructorApi'
import type { TeachingCourseLms } from '@/types/lms'

const typeBadge = (type: string | null) => {
  const map: Record<string, { label: string; cls: string }> = {
    pdf:      { label: 'PDF',      cls: 'bg-red-50 text-red-700 ring-red-200' },
    video:    { label: 'فيديو',    cls: 'bg-purple-50 text-purple-700 ring-purple-200' },
    link:     { label: 'رابط',     cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
    slide:    { label: 'عرض',      cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
    document: { label: 'مستند',    cls: 'bg-blue-50 text-blue-700 ring-blue-200' },
    other:    { label: 'أخرى',     cls: 'bg-slate-50 text-slate-700 ring-slate-200' },
  }
  const entry = map[type ?? 'other']
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${entry.cls}`}>{entry.label}</span>
}

export default function InstructorMaterialsPage() {
  const [materials, setMaterials] = useState<InstructorMaterial[]>([])
  const [courses, setCourses] = useState<TeachingCourseLms[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [courseFilter, setCourseFilter] = useState<string>('')

  const [form, setForm] = useState({
    course_id: '',
    title: '',
    description: '',
    file_path: '',
    external_url: '',
    type: 'pdf',
    sort_order: '0',
  })

  useEffect(() => {
    Promise.all([
      fetchInstructorMaterials(courseFilter ? { course_id: Number(courseFilter) } : undefined),
      fetchInstructorCourses(),
    ]).then(([mats, cs]) => {
      setMaterials(mats)
      setCourses(cs)
    })
  }, [courseFilter])

  const resetForm = () => {
    setForm({ course_id: '', title: '', description: '', file_path: '', external_url: '', type: 'pdf', sort_order: '0' })
    setEditId(null)
    setShowForm(false)
  }

  const handleSubmit = async () => {
    const payload = {
      course_id: Number(form.course_id),
      title: form.title,
      description: form.description || null,
      file_path: form.file_path || null,
      external_url: form.external_url || null,
      type: form.type,
      sort_order: form.sort_order ? Number(form.sort_order) : 0,
    }
    if (editId) {
      const updated = await updateInstructorMaterial(editId, payload)
      setMaterials((prev) => prev.map((m) => (m.id === editId ? updated : m)))
    } else {
      const created = await createInstructorMaterial(payload)
      setMaterials((prev) => [created, ...prev])
    }
    resetForm()
  }

  const handleEdit = (m: InstructorMaterial) => {
    setForm({
      course_id: String(m.course_id),
      title: m.title,
      description: m.description ?? '',
      file_path: m.file_path ?? '',
      external_url: m.external_url ?? '',
      type: m.type ?? 'pdf',
      sort_order: String(m.sort_order ?? 0),
    })
    setEditId(m.id)
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    await deleteInstructorMaterial(id)
    setMaterials((prev) => prev.filter((m) => m.id !== id))
  }

  const columns: DataTableColumn<InstructorMaterial>[] = [
    { key: 'title', header: 'العنوان', render: (r) => (
      <div className="flex items-center gap-2">
        <FileText size={15} className="text-slate-400 shrink-0" />
        <span className="truncate max-w-[200px]">{r.title}</span>
      </div>
    )},
    { key: 'type', header: 'النوع', render: (r) => typeBadge(r.type) },
    { key: 'course', header: 'الدورة', render: (r) => r.course?.title ?? '—' },
    { key: 'sort_order', header: 'الترتيب', width: '80px' },
    {
      key: 'actions', header: '', width: '100px',
      render: (r) => (
        <div className="flex items-center gap-2 justify-end">
          <button onClick={() => handleEdit(r)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-customBlue transition-colors">
            <Pencil size={14} />
          </button>
          <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
            <Trash2 size={14} />
          </button>
          {r.external_url && (
            <a href={r.external_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-emerald-600 transition-colors">
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      ),
    },
  ]

  return (
    <DashboardPageShell
      title="المواد التعليمية"
      eyebrow={<Eyebrow tone="accent">INSTRUCTOR · MATERIALS</Eyebrow>}
      description="إدارة المواد التعليمية والملفات المرتبطة بدوراتك."
      actions={
        <EmcButton variant="primary" size="sm" onClick={() => { resetForm(); setShowForm(true) }} leadingIcon={<Plus size={15} />}>
          إضافة مادة
        </EmcButton>
      }
    >
      {/* Filter by course */}
      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm font-bold text-slate-600">تصفية حسب الدورة:</label>
        <select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-customBlue/20"
        >
          <option value="">جميع الدورات</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <Surface variant="default" elevation={3} padding="lg" className="mb-6">
          <h3 className="text-base font-black text-deepBlue mb-4">{editId ? 'تعديل المادة' : 'إضافة مادة جديدة'}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">الدورة</label>
              <select value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-customBlue/20">
                <option value="">اختر دورة</option>
                {courses.map((c) => (<option key={c.id} value={c.id}>{c.title}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">العنوان</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-customBlue/20" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">النوع</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-customBlue/20">
                <option value="pdf">PDF</option>
                <option value="video">فيديو</option>
                <option value="link">رابط</option>
                <option value="slide">عرض تقديمي</option>
                <option value="document">مستند</option>
                <option value="other">أخرى</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">الرابط الخارجي</label>
              <input value={form.external_url} onChange={(e) => setForm({ ...form, external_url: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-customBlue/20" dir="ltr" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1">الوصف</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-customBlue/20" rows={2} />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <EmcButton variant="primary" size="sm" onClick={handleSubmit}>{editId ? 'تحديث' : 'إضافة'}</EmcButton>
            <EmcButton variant="secondary" size="sm" onClick={resetForm}>إلغاء</EmcButton>
          </div>
        </Surface>
      )}

      {/* Materials table */}
      <Surface variant="default" elevation={3} padding="none" className="overflow-hidden">
        {materials.length > 0 ? (
          <DataTable<InstructorMaterial> columns={columns} data={materials} keyExtractor={(r) => r.id} emptyMessage="لا توجد مواد تعليمية" />
        ) : (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-black text-slate-500">لا توجد مواد تعليمية</p>
            <p className="mt-2 text-xs text-slate-400">أضف مادة جديدة بالزر أعلاه</p>
          </div>
        )}
      </Surface>
    </DashboardPageShell>
  )
}
