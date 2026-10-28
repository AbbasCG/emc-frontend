import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ChevronLeft, Eye, LayoutTemplate, Pencil, Search, Trash2 } from 'lucide-react'
import ConfirmDialog from '@/components/feedback/ConfirmDialog'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import TemplatePreviewModal from '@/components/operations/formTemplates/TemplatePreviewModal'
import { NewFormDialog, TemplateDetailsDialog } from '@/components/operations/formTemplates/TemplateDialogs'
import {
  TEMPLATE_CATEGORY_AR,
  TEMPLATE_VISIBILITY_AR,
  createFormFromTemplate,
  deleteTemplate,
  fetchTemplateLibrary,
  parseTemplateError,
  updateTemplate,
} from '@/api/formsTemplatesApi'
import type { FormTemplateSummary, TemplateCategory, TemplateLibrary } from '@/api/formsTemplatesApi'

const LOAD_ERROR = 'تعذّر تحميل مكتبة القوالب. تحقق من الاتصال وأعد المحاولة.'

type SourceFilter = 'all' | 'system' | 'saved' | 'mine'

const SOURCE_AR: Record<SourceFilter, string> = {
  all: 'كل القوالب',
  system: 'مكتبة المنصة',
  saved: 'قوالب الفريق',
  mine: 'قوالبي',
}

const CHIP = 'rounded-full px-3.5 py-1.5 text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue'

/**
 * The template library: the platform's built-in templates and the ones colleagues saved and shared. Using a template creates a new
 * private draft that only its creator sees; the template itself never changes, and forms made from it are independent copies.
 */
export default function OpsFormTemplatesPage() {
  const navigate = useNavigate()
  const [library, setLibrary] = useState<TemplateLibrary | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [category, setCategory] = useState<TemplateCategory | null>(null)
  const [source, setSource] = useState<SourceFilter>('all')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [using, setUsing] = useState<FormTemplateSummary | null>(null)
  const [editing, setEditing] = useState<FormTemplateSummary | null>(null)
  const [deleting, setDeleting] = useState<FormTemplateSummary | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [reload, setReload] = useState(0)

  // The search box filters after a short pause, so typing does not send a request per key.
  useEffect(() => {
    const t = window.setTimeout(() => setQuery(search), 300)
    return () => window.clearTimeout(t)
  }, [search])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const next = await fetchTemplateLibrary({ category, search: query, source: source === 'all' ? null : source })
        if (!cancelled) {
          setLibrary(next)
          setLoadError(null)
        }
      } catch {
        if (!cancelled) setLoadError(LOAD_ERROR)
      }
    })()
    return () => { cancelled = true }
  }, [category, query, source, reload])

  const refresh = useCallback(() => setReload((n) => n + 1), [])

  if (loadError && !library) return (
    <div dir="rtl" className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
      <p className="font-black text-rose-800">{loadError}</p>
      <button type="button" onClick={() => { setLoadError(null); refresh() }} className="mt-5 rounded-xl bg-deepBlue px-6 py-2.5 text-sm font-black text-white">إعادة المحاولة</button>
    </div>
  )
  if (!library) return <OpsPageSkeleton />

  const departments = library.departments
  const filtered = category !== null || query.trim() !== '' || source !== 'all'

  return (
    <div className="space-y-6" dir="rtl">
      <Link to="/dashboard/admin/forms" className="inline-flex items-center gap-1 text-xs font-black text-customBlue hover:text-customOrange">
        <ChevronLeft size={14} />
        كل النماذج
      </Link>

      <header className="rounded-[1.35rem] bg-white p-6 text-right shadow-lg ring-1 ring-deepBlue/[0.06]">
        <h1 className="text-xl font-black text-deepBlue">مكتبة قوالب النماذج</h1>
        <p className="mt-2 max-w-3xl text-xs font-semibold leading-6 text-slate-500">
          ابدأ من قالب جاهز بدل الصفحة الفارغة. ينشئ القالب مسودة خاصة بك يمكنك تعديلها كما تشاء، ولا يتغير القالب ولا النماذج الأخرى المصنوعة منه.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <label className="relative min-w-[14rem] flex-1">
            <span className="sr-only">ابحث في القوالب</span>
            <Search size={16} aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم القالب أو وصفه"
              maxLength={100}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-3 pr-9 text-sm font-semibold text-deepBlue outline-none focus:border-customBlue"
            />
          </label>
          <div role="group" aria-label="مصدر القوالب" className="flex flex-wrap gap-1.5 rounded-2xl bg-deepBlue/[0.03] p-1 ring-1 ring-deepBlue/[0.06]">
            {(Object.keys(SOURCE_AR) as SourceFilter[]).map((s) => (
              <button key={s} type="button" aria-pressed={source === s} onClick={() => setSource(s)} className={`${CHIP} ${source === s ? 'bg-deepBlue text-white' : 'text-deepBlue hover:bg-white'}`}>
                {SOURCE_AR[s]}
              </button>
            ))}
          </div>
        </div>

        <div role="group" aria-label="التصنيف" className="mt-3 flex flex-wrap gap-1.5">
          <button type="button" aria-pressed={category === null} onClick={() => setCategory(null)} className={`${CHIP} ${category === null ? 'bg-customBlue text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-customBlue/40'}`}>
            كل التصنيفات
          </button>
          {(Object.keys(TEMPLATE_CATEGORY_AR) as TemplateCategory[]).map((c) => (
            <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)} className={`${CHIP} ${category === c ? 'bg-customBlue text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-customBlue/40'}`}>
              {TEMPLATE_CATEGORY_AR[c]}
            </button>
          ))}
        </div>
      </header>

      {notice && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{notice}</p>}
      {actionError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{actionError}</p>}
      {loadError && <p role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">{loadError}</p>}

      {library.templates.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center shadow-md ring-1 ring-deepBlue/[0.06]">
          <LayoutTemplate size={28} aria-hidden className="mx-auto text-slate-300" />
          <p className="mt-3 font-black text-deepBlue">{filtered ? 'لا توجد قوالب تطابق هذا البحث.' : 'لا توجد قوالب بعد.'}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {source === 'mine' ? 'احفظ أي نموذج كقالب من صفحة النموذج، وسيظهر هنا.' : 'غيّر التصنيف أو كلمات البحث.'}
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {library.templates.map((t) => (
            <li key={t.id} className="flex flex-col rounded-2xl bg-white p-5 text-right shadow-md ring-1 ring-deepBlue/[0.06]" data-testid="template-card">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-black">
                <span className="text-customOrange">{TEMPLATE_CATEGORY_AR[t.category] ?? t.category}</span>
                <span className={`rounded-full px-2 py-0.5 ${t.source === 'system' ? 'bg-sky-50 text-sky-700 ring-1 ring-sky-200' : 'bg-slate-100 text-slate-600'}`}>
                  {t.source === 'system' ? 'من مكتبة المنصة' : TEMPLATE_VISIBILITY_AR[t.visibility]}
                </span>
                {t.department && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{t.department.name}</span>}
              </div>
              <h2 className="mt-2 text-base font-black text-deepBlue">{t.name}</h2>
              {t.description && <p className="mt-1.5 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">{t.description}</p>}
              {t.domain_notice && (
                <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-bold leading-5 text-amber-900 ring-1 ring-amber-200">{t.domain_notice}</p>
              )}
              <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-slate-500">
                <span>{t.question_count} سؤالاً</span>
                {t.owner && <span>بواسطة {t.is_mine ? 'أنت' : t.owner.name}</span>}
                {t.uses_count !== null && t.uses_count > 0 && <span>استُخدم {t.uses_count} مرة</span>}
              </p>
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                {library.canCreate && (
                  <button type="button" onClick={() => { setActionError(null); setUsing(t) }} className="rounded-xl bg-customBlue px-4 py-2 text-xs font-black text-white shadow-md hover:opacity-90">
                    استخدام القالب
                  </button>
                )}
                <button type="button" onClick={() => setPreviewId(t.id)} className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-black text-deepBlue ring-1 ring-deepBlue/10 hover:bg-slate-50">
                  <Eye size={14} aria-hidden /> معاينة
                </button>
                {t.abilities.edit && (
                  <button type="button" onClick={() => { setActionError(null); setEditing(t) }} aria-label={`تعديل القالب ${t.name}`} className="rounded-xl p-2 text-slate-500 ring-1 ring-deepBlue/10 hover:bg-slate-50 hover:text-deepBlue">
                    <Pencil size={14} aria-hidden />
                  </button>
                )}
                {t.abilities.delete && (
                  <button type="button" onClick={() => { setActionError(null); setDeleting(t) }} aria-label={`حذف القالب ${t.name}`} className="rounded-xl p-2 text-slate-500 ring-1 ring-deepBlue/10 hover:bg-red-50 hover:text-red-700">
                    <Trash2 size={14} aria-hidden />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <TemplatePreviewModal
        templateId={previewId}
        onClose={() => setPreviewId(null)}
        onUse={library.canCreate ? (detail) => {
          setPreviewId(null)
          setUsing(library.templates.find((t) => t.id === detail.id) ?? detail)
        } : undefined}
      />

      {using && (
        <NewFormDialog
          key={using.id}
          open
          onClose={() => setUsing(null)}
          heading={`نموذج جديد من «${using.name}»`}
          intro="ستُنشأ مسودة خاصة بك من هذا القالب وتُفتح في المحرر. لا يراها أحد حتى تشاركها وتنشرها."
          submitLabel="إنشاء المسودة وفتح المحرر"
          defaultTitle={using.name}
          departments={departments}
          onSubmit={async (body) => {
            const created = await createFormFromTemplate(using.id, body)
            navigate(`/dashboard/admin/forms/${created.id}`)
          }}
        />
      )}

      {editing && (
        <TemplateDetailsDialog
          key={editing.id}
          open
          onClose={() => setEditing(null)}
          heading="تعديل القالب"
          submitLabel="حفظ التعديلات"
          initial={{
            name: editing.name,
            description: editing.description,
            category: editing.category,
            visibility: editing.visibility,
            department_id: editing.department?.id ?? null,
          }}
          departments={departments}
          canShareOrganization={library.canShareOrganization}
          onSubmit={async (input) => {
            await updateTemplate(editing.id, input)
            setEditing(null)
            setNotice('حُفظت تعديلات القالب.')
            refresh()
          }}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="حذف القالب؟"
        description="سيختفي القالب من المكتبة لك ولمن شاركته معهم. النماذج التي أُنشئت منه لا تتأثر."
        confirmLabel="حذف"
        variant="danger"
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return
          try {
            await deleteTemplate(deleting.id)
            setNotice('حُذف القالب.')
            refresh()
          } catch (e) {
            setActionError(parseTemplateError(e).message)
          } finally {
            setDeleting(null)
          }
        }}
      />
    </div>
  )
}
